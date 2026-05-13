import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { name, email, subjects, rate } = await req.json();
  const resendKey  = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  const firstName  = name?.split(" ")[0] || "there";
  const subjectList = Array.isArray(subjects) ? subjects.join(", ") : (subjects || "—");

  if (!resendKey) {
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const send = (to: string, subject: string, html: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Study Buddy <noreply@joinstudybuddy.com>", to, subject, html }),
    });

  // 1. Email the applicant confirming their submission
  if (email) {
    await send(
      email,
      "Your Study Buddy application is under review",
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#111">Hi ${firstName}, your application is in! 🎉</h2>
        <p style="color:#444;line-height:1.6">
          Thanks for applying to become a tutor on Study Buddy. We've received your application
          and our team is reviewing it now.
        </p>
        <div style="background:#FEF2F2;border-left:4px solid #DC2626;padding:16px 20px;border-radius:6px;margin:20px 0">
          <strong style="color:#DC2626">What happens next?</strong>
          <ul style="color:#444;margin:10px 0 0;padding-left:18px;line-height:1.8">
            <li>Our team reviews applications within <strong>24–48 hours</strong></li>
            <li>You'll get an email as soon as a decision is made</li>
            <li>If approved, you'll be able to sign in and start accepting students right away</li>
          </ul>
        </div>
        <p style="color:#666;font-size:14px">
          Have questions? Email us at <a href="mailto:mo.nooreldin7@gmail.com" style="color:#DC2626">mo.nooreldin7@gmail.com</a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:32px">Study Buddy · joinstudybuddy.com</p>
      </div>
      `,
    );
  }

  // 2. Email the admin to review
  if (adminEmail) {
    await send(
      adminEmail,
      `📋 New tutor application: ${name}`,
      `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#DC2626">New Tutor Application</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:120px">Name</td><td style="padding:6px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${email}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Subjects</td><td style="padding:6px 0">${subjectList}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Rate</td><td style="padding:6px 0;font-weight:600">$${rate}/hr</td></tr>
        </table>
        <div style="margin-top:28px">
          <a href="https://joinstudybuddy.com/admin"
             style="display:inline-block;padding:12px 28px;background:#DC2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Review application →
          </a>
        </div>
        <p style="color:#999;font-size:12px;margin-top:24px">Study Buddy · joinstudybuddy.com</p>
      </div>
      `,
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
