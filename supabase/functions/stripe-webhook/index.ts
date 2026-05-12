// Deploy:
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//   supabase functions deploy stripe-webhook
//
// Register this URL in Stripe Dashboard → Developers → Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
//
// Events to enable:
//   - account.updated            (tutor Connect onboarding complete)
//   - payment_intent.payment_failed  (notify student of failed authorization)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SERVICE_ROLE_SECRET")!;

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

  // Verify Stripe signature
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await req.arrayBuffer();
  try {
    event = await stripe.webhooks.constructEventAsync(
      new Uint8Array(rawBody),
      sig,
      webhookSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${String(err)}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  switch (event.type) {
    case "account.updated": {
      // Tutor completed (or updated) their Express onboarding
      const account = event.data.object as Stripe.Account;
      const payoutsEnabled = account.payouts_enabled === true;
      const chargesEnabled = account.charges_enabled === true;

      if (payoutsEnabled || chargesEnabled) {
        const { error } = await admin
          .from("tutor_profiles")
          .update({ payouts_enabled: payoutsEnabled })
          .eq("stripe_connect_id", account.id);
        if (error) console.error("account.updated DB error:", error.message);
        else console.log(`tutor_profiles updated for connect account ${account.id} — payouts_enabled=${payoutsEnabled}`);
      }
      break;
    }

    case "payment_intent.payment_failed": {
      // Student's card authorization failed — mark the session so the student knows
      const pi = event.data.object as Stripe.PaymentIntent;
      const sessionId = pi.metadata?.session_id as string | undefined;
      const studentId = pi.metadata?.student_id as string | undefined;

      if (sessionId) {
        await admin
          .from("sessions")
          .update({ status: "payment_failed" })
          .eq("id", sessionId);
      }

      // Optionally post a message in the conversation
      if (studentId) {
        const { data: conv } = await admin
          .from("conversations")
          .select("id")
          .eq("student_id", studentId)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (conv?.id) {
          await admin.from("messages").insert({
            conversation_id: conv.id,
            sender_id: studentId,
            sender_name: "Study Buddy",
            text: "⚠️ Your payment authorization failed. Please update your payment method and try booking again.",
          });
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
