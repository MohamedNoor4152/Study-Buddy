// Deploy:
//   supabase functions deploy notify-tutor-booking
//
// Called by BookingDesktop immediately after a session is inserted.
// Sends an email to the tutor so they know a student has requested a session.
// Uses the same Resend + SERVICE_ROLE_SECRET setup as send-session-confirmed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      tutorId: string;
      tutorName: string;
      studentName: string;
      classCode: string;
      scheduledAt: string;
      durationMin: number;
      location: string;
      note?: string;
      earnings: number;
    } = await req.json();

    const { tutorId, tutorName, studentName, classCode, scheduledAt, durationMin, location, note, earnings } = body;
    if (!tutorId) {
      return new Response(JSON.stringify({ error: "tutorId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_SECRET")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") ?? "Study Buddy <onboarding@resend.dev>";

    // Verify the caller is authenticated
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

    // Look up the tutor's email from Supabase Auth
    const { data: tutorAcc } = await admin.auth.admin.getUserById(tutorId);
    const tutorEmail = tutorAcc?.user?.email ?? "";
    if (!tutorEmail) {
      return new Response(JSON.stringify({ error: "Could not find tutor email" }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const when = new Date(scheduledAt).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const svc = Math.round(earnings * 0.08);

    let emailSent = false;
    if (resendKey) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [tutorEmail],
          subject: `New booking request — ${classCode} from ${studentName.split(" ")[0]}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#222">
              <p>Hi ${tutorName.split(" ")[0]},</p>
              <p><strong>${studentName}</strong> has requested a tutoring session with you. Log in to accept or decline within 30 minutes.</p>
              <table style="width:100%;max-width:480px;font-family:sans-serif;border-collapse:collapse">
                ${[
                  ["Student", studentName],
                  ["Course", classCode],
                  ["When", when],
                  ["Duration", `${durationMin} min`],
                  ["Location", location],
                  ["Your earnings", `$${earnings.toFixed(2)} (after $${svc.toFixed(2)} service fee)`],
                  ...(note ? [["Note", note]] : []),
                ].map(([k, v]) => `
                  <tr>
                    <td style="padding:8px 12px;color:#444;border-bottom:1px solid #eee">${k}</td>
                    <td style="padding:8px 12px;font-weight:600;text-align:right;border-bottom:1px solid #eee">${v}</td>
                  </tr>`).join("")}
              </table>
              <p style="margin-top:24px">
                <a href="https://joinstudybuddy.com/tutor-dashboard" style="background:#DC2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                  Review request →
                </a>
              </p>
              <p style="margin-top:20px;font-size:13px;color:#666">
                The student's card is authorized but not charged until you accept. If you don't respond within 24 hours the request will expire.
              </p>
              <p style="font-size:13px;color:#666">Have questions? Email us at <a href="mailto:mo.nooreldin7@gmail.com" style="color:#DC2626">mo.nooreldin7@gmail.com</a></p>
              <p style="font-size:12px;color:#999">Study Buddy · joinstudybuddy.com</p>
            </div>`,
        }),
      });
      emailSent = resp.ok;
      if (!emailSent) console.error("Resend failed:", await resp.text());
    } else {
      console.warn("RESEND_API_KEY not set — skipping tutor notification email");
    }

    return new Response(
      JSON.stringify({ ok: true, emailSent, emailSkipped: !resendKey }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
