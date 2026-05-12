// Deploy:
//   supabase functions deploy create-connect-account
//
// Called by TutorDashboard when a tutor has not yet set up payouts.
// Creates a Stripe Express account linked to the tutor's email and returns
// a one-time onboarding URL. After the tutor completes Stripe's hosted
// onboarding, the stripe-webhook function updates payouts_enabled=true.

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

    const body: { returnUrl: string; refreshUrl: string } = await req.json();
    const { returnUrl, refreshUrl } = body;
    if (!returnUrl || !refreshUrl) {
      return new Response(JSON.stringify({ error: "returnUrl and refreshUrl are required" }), {
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

    const tutorId = authData.user.id;
    const admin = createClient(supabaseUrl, serviceKey);

    // Retrieve existing Connect id if tutor already started onboarding
    const { data: profile } = await admin
      .from("tutor_profiles")
      .select("stripe_connect_id")
      .eq("user_id", tutorId)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" });

    let connectId = profile?.stripe_connect_id as string | undefined;

    if (!connectId) {
      // Create a new Express account
      const account = await stripe.accounts.create({
        type: "express",
        email: authData.user.email,
        capabilities: { transfers: { requested: true } },
        metadata: { supabase_user_id: tutorId },
      });
      connectId = account.id;

      // Persist the new account id immediately
      await admin
        .from("tutor_profiles")
        .update({ stripe_connect_id: connectId })
        .eq("user_id", tutorId);
    }

    // Generate a fresh onboarding link (links expire after a few minutes)
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ accountLinkUrl: accountLink.url }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
