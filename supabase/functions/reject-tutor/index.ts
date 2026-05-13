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
    .update({ application_status: "rejected" })
    .eq("user_id", tutorUserId);

  // 2. Update auth metadata
  await admin.auth.admin.updateUserById(tutorUserId, {
    user_metadata: { application_status: "rejected" },
  });

  // 3. Get contact details
  const { data: profile } = await admin
    .from("tutor_profiles")
    .select("email, first_name")
    .eq("user_id", tutorUserId)
    .maybeSingle();

  // 4. Send rejection email
  if (resendKey && profile?.email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Study Buddy <noreply@joinstudybuddy.com>",
        to: profile.email,
        subject: "Study Buddy — Application update",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2>Hi ${profile.first_name},</h2>
            <p>Thank you for applying to become a tutor on Study Buddy. After reviewing your application, we're not able to move forward at this time.</p>
            <p style="color:#666">This could be due to course availability, current tutor capacity in your subjects, or profile completeness. You're welcome to apply again in the future as we grow.</p>
            <p>If you have any questions, reply to this email and we'll be happy to help.</p>
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
