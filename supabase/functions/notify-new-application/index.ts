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

  if (!resendKey || !adminEmail) {
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY or ADMIN_EMAIL secret" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const subjectList = Array.isArray(subjects) ? subjects.join(", ") : subjects;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Study Buddy <noreply@joinstudybuddy.com>",
      to: adminEmail,
      subject: `📋 New tutor application: ${name}`,
      html: `
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
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return new Response(JSON.stringify({ error: body }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
