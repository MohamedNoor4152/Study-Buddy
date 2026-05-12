// Deploy:
//   supabase functions deploy capture-payment
//
// Called by TutorDashboard when the tutor accepts a session.
// Captures the previously-authorized PaymentIntent and, if the tutor has a
// Stripe Connect account, transfers their share (session fee, excluding the
// platform service fee) to that account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { sessionId }: { sessionId: string } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_SECRET")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    // Verify the caller is the tutor for this session
    const jwtClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await jwtClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: session, error: sErr } = await admin
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (session.tutor_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!session.payment_intent_id) {
      // No PaymentIntent means this was booked before Stripe was integrated — skip silently
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (session.payment_captured) {
      return new Response(JSON.stringify({ ok: true, alreadyCaptured: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

    // Fetch the PI first so we know its current state
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent_id);

    if (pi.status === "succeeded") {
      // Already captured (e.g. autocapture or double-accept) — mark DB and return ok
      await admin.from("sessions").update({ payment_captured: true }).eq("id", sessionId);
      return new Response(JSON.stringify({ ok: true, alreadyCaptured: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (pi.status === "canceled") {
      return new Response(JSON.stringify({ error: "Payment was cancelled — the student may need to rebook." }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (pi.status !== "requires_capture") {
      return new Response(JSON.stringify({ error: `Cannot capture payment in status: ${pi.status}` }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Capture the full authorized amount
    await stripe.paymentIntents.capture(session.payment_intent_id);

    // Transfer the tutor's share (session fee, no service fee) to their Connect account
    const { data: tutorProfile } = await admin
      .from("tutor_profiles")
      .select("stripe_connect_id, payouts_enabled")
      .eq("user_id", session.tutor_id)
      .maybeSingle();

    if (tutorProfile?.stripe_connect_id && tutorProfile?.payouts_enabled) {
      const tutorShareCents = Math.round(Number(session.earnings) * 100);
      await stripe.transfers.create({
        amount: tutorShareCents,
        currency: "usd",
        destination: tutorProfile.stripe_connect_id,
        transfer_group: sessionId,
        metadata: { session_id: sessionId },
      });
    }

    // Mark as captured in DB
    await admin
      .from("sessions")
      .update({ payment_captured: true })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
