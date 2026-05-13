import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    let body: { passcode?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const passcode = body.passcode ?? "";

    const expected = Deno.env.get("ADMIN_PASSCODE") ?? "";
    if (!expected) {
      return new Response(
        JSON.stringify({
          error:
            "ADMIN_PASSCODE is not set on the server. Supabase Dashboard → Edge Functions → Secrets → add ADMIN_PASSCODE with the same value as VITE_ADMIN_PASSCODE, then redeploy admin-list-applications.",
        }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    if (passcode !== expected) {
      return new Response(
        JSON.stringify({
          error:
            "Wrong admin passcode, or ADMIN_PASSCODE secret does not match what you typed. They must match exactly.",
        }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin
      .from("tutor_profiles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ applications: data ?? [] }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
