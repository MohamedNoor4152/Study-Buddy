import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { tutorUserId } = await req.json();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey   = Deno.env.get("RESEND_API_KEY");

  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Update tutor_profiles
  await admin.from("tutor_profiles")
    .update({ application_status: "approved" })
    .eq("user_id", tutorUserId);

  // 2. Update auth user metadata so client can detect approval without a DB query
  await admin.auth.admin.updateUserById(tutorUserId, {
    user_metadata: { application_status: "approved" },
  });

  // 3. Get tutor contact details for the email
  const { data: profile } = await admin
    .from("tutor_profiles")
    .select("email, first_name")
    .eq("user_id", tutorUserId)
    .maybeSingle();

  // 4. Send approval email
  if (resendKey && profile?.email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Study Buddy <noreply@joinstudybuddy.com>",
        to: profile.email,
        subject: "🎉 You're approved — welcome to Study Buddy!",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#16A34A">You're in, ${profile.first_name}!</h2>
            <p>Your tutor application has been reviewed and <strong>approved</strong>. You can now sign in and start accepting students.</p>
            <div style="margin:28px 0">
              <a href="https://joinstudybuddy.com/signin"
                 style="display:inline-block;padding:12px 28px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                Sign in to your dashboard →
              </a>
            </div>
            <p style="color:#666;font-size:14px">A few tips to get started:</p>
            <ul style="color:#666;font-size:14px;line-height:1.8">
              <li>Complete your profile if you haven't already</li>
              <li>Make sure your schedule is up to date</li>
              <li>Connect your payout account to receive earnings</li>
            </ul>
            <p style="color:#999;font-size:12px;margin-top:24px">Study Buddy · joinstudybuddy.com</p>
          </div>
        `,
      }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
