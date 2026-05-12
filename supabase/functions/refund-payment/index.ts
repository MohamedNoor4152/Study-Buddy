// Deploy:
//   supabase functions deploy refund-payment
//
// Called by DashboardDesktop when a student cancels a session.
// Applies the cancellation policy:
//   - pending (tutor not yet confirmed): cancel the PaymentIntent — no charge
//   - confirmed, > 12h before: full refund
//   - confirmed, ≤ 12h before: 50% refund
//
// Real money goes back to the student's card. The separate credit-balance
// system can still award bonus credits on top if desired.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hoursUntil = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3_600_000;

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
    if (session.student_id !== authData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!session.payment_intent_id) {
      // Pre-Stripe booking — nothing to refund via Stripe
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });
    const pi = await stripe.paymentIntents.retrieve(session.payment_intent_id);

    let refundedCents = 0;

    if (session.status === "pending" || !session.payment_captured) {
      // Not yet captured — just cancel the intent, card never charged
      if (pi.status !== "canceled") {
        await stripe.paymentIntents.cancel(session.payment_intent_id);
      }
    } else {
      // Already captured — issue a refund
      const grossCents = pi.amount_received ?? pi.amount;
      const hrs = hoursUntil(session.scheduled_at);
      refundedCents = hrs > 12 ? grossCents : Math.round(grossCents * 0.5);

      if (refundedCents > 0) {
        await stripe.refunds.create({
          payment_intent: session.payment_intent_id,
          amount: refundedCents,
          metadata: { session_id: sessionId, policy: hrs > 12 ? "full" : "half" },
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, refundedCents }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
