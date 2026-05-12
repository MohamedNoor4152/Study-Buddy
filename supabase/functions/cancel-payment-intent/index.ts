// Deploy:
//   supabase functions deploy cancel-payment-intent
//
// Cancels a Stripe PaymentIntent that is in a pre-capture state.
// Used in two cases:
//   1. Tutor declines a booking  →  release the student's card hold
//   2. Student's session DB insert fails after card auth  →  avoid orphan holds
//
// Security: caller must be the student_id OR tutor_id stored in the PI metadata.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANCELABLE = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { paymentIntentId }: { paymentIntentId: string } = await req.json();
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: "paymentIntentId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const jwtClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await jwtClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Only the student or the tutor tied to this PI may cancel it
    const callerId = authData.user.id;
    if (pi.metadata?.student_id !== callerId && pi.metadata?.tutor_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (pi.status === "canceled") {
      return new Response(JSON.stringify({ ok: true, alreadyCanceled: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!CANCELABLE.has(pi.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot cancel a PI in status '${pi.status}'` }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    await stripe.paymentIntents.cancel(paymentIntentId);

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
