import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { tutorUserId, reason } = await req.json();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey   = Deno.env.get("RESEND_API_KEY");

  const admin = createClient(supabaseUrl, serviceKey);

  // 1. Get contact details before deleting
  const { data: profile } = await admin
    .from("tutor_profiles")
    .select("email, first_name, full_name")
    .eq("user_id", tutorUserId)
    .maybeSingle();

  const firstName = profile?.first_name
    || profile?.full_name?.split(" ")[0]
    || "there";
  const email = profile?.email;

  // 2. Send rejection email first (before deleting the account)
  if (resendKey && email) {
    const reasonBlock = reason?.trim()
      ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:4px;margin:16px 0">
           <strong style="color:#DC2626">Feedback from our team:</strong>
           <p style="color:#444;margin:6px 0 0">${reason.trim()}</p>
         </div>`
      : `<p style="color:#666">We'll include specific feedback in future rejections to help you improve your application.</p>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Study Buddy <noreply@joinstudybuddy.com>",
        to: email,
        subject: "Study Buddy — Your tutor application",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for applying to become a tutor on Study Buddy. After reviewing your application, we're not able to move forward at this time.</p>
            ${reasonBlock}
            <p style="color:#666">You're welcome to apply again — just go to <a href="https://joinstudybuddy.com/tutor-apply">joinstudybuddy.com/tutor-apply</a> and submit a new application.</p>
            <div style="margin:28px 0">
              <a href="https://joinstudybuddy.com/tutor-apply"
                 style="display:inline-block;padding:12px 28px;background:#DC2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                Apply again →
              </a>
            </div>
            <p>If you have any questions, reply to this email and we'll be happy to help.</p>
            <p style="color:#999;font-size:12px;margin-top:24px">Study Buddy · joinstudybuddy.com</p>
          </div>
        `,
      }),
    });
  }

  // 3. Delete the auth user entirely so they can reapply with the same email
  //    (tutor_profiles row cascades automatically due to ON DELETE CASCADE)
  await admin.auth.admin.deleteUser(tutorUserId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
