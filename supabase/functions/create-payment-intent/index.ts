// Deploy:
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//   supabase secrets set SERVICE_ROLE_SECRET=...
//   supabase functions deploy create-payment-intent
//
// Called by BookingDesktop when the student clicks "Request session".
// Creates a Stripe PaymentIntent with capture_method=manual so the card is
// authorized but NOT charged until the tutor accepts.
// Returns { clientSecret } to the frontend.

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

    const body: {
      amountCents: number;   // total charge in cents (fee + service fee)
      tutorId: string;       // tutor's auth UUID (to look up Connect account)
      description?: string;
    } = await req.json();

    const { amountCents, tutorId, description } = body;
    if (!amountCents || amountCents < 50) {
      return new Response(JSON.stringify({ error: "amountCents must be >= 50" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Verify caller is authenticated
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

    // Look up tutor's Stripe Connect id (optional — if not set, funds stay on platform)
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: tutorProfile } = await admin
      .from("tutor_profiles")
      .select("stripe_connect_id, payouts_enabled")
      .eq("user_id", tutorId)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

    const piParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ["card"],
      description: description ?? "Study Buddy tutoring session",
      metadata: {
        student_id: authData.user.id,
        tutor_id: tutorId,
      },
    };

    // Route funds to tutor's Connect account on capture if they've completed onboarding
    if (tutorProfile?.stripe_connect_id && tutorProfile?.payouts_enabled) {
      piParams.transfer_data = { destination: tutorProfile.stripe_connect_id };
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
