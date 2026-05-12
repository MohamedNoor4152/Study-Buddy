// Deploy:
//   supabase functions deploy notify-student-declined
//
// Called when a tutor declines (or reschedule-declines) a session request.
// Sends an email to the student and inserts an in-app message so they know.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body: { sessionId: string; isRescheduleDeclne?: boolean } = await req.json();
    const { sessionId, isRescheduleDeclne } = body;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_SECRET")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") ?? "Study Buddy <onboarding@resend.dev>";

    // Verify the caller is authenticated (must be the tutor)
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

    // Fetch session
    const { data: session, error: sessErr } = await admin
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Look up student email
    const { data: studentAcc } = await admin.auth.admin.getUserById(session.student_id);
    const studentEmail = studentAcc?.user?.email ?? "";
    if (!studentEmail) {
      return new Response(JSON.stringify({ error: "Could not find student email" }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const studentFirstName = (session.student_name || "there").split(" ")[0];
    const tutorFirstName = (session.tutor_name || "Your tutor").split(" ")[0];
    const when = new Date(session.scheduled_at).toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const isReschedule = isRescheduleDeclne ?? false;
    const subject = isReschedule
      ? `${tutorFirstName} couldn't accommodate your reschedule — ${session.class_code}`
      : `Your ${session.class_code} session request was declined`;

    const bodyText = isReschedule
      ? `${tutorFirstName} wasn't able to accommodate your requested reschedule. Your session remains scheduled for the original time — you can cancel it from your dashboard if needed.`
      : `${tutorFirstName} wasn't available for the time you requested. Your card has <strong>not been charged</strong>. Browse other tutors or try a different time.`;

    // Send email
    let emailSent = false;
    if (resendKey) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [studentEmail],
          subject,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.6;color:#222">
              <p>Hi ${studentFirstName},</p>
              <p>${bodyText}</p>
              <table style="width:100%;max-width:480px;font-family:sans-serif;border-collapse:collapse">
                ${[
                  ["Course", session.class_code],
                  ["Tutor", session.tutor_name],
                  ["Requested time", when],
                  ["Duration", `${session.duration_min} min`],
                ].map(([k, v]) => `
                  <tr>
                    <td style="padding:8px 12px;color:#444;border-bottom:1px solid #eee">${k}</td>
                    <td style="padding:8px 12px;font-weight:600;text-align:right;border-bottom:1px solid #eee">${v}</td>
                  </tr>`).join("")}
              </table>
              ${!isReschedule ? `
              <p style="margin-top:24px">
                <a href="https://studybuddy.app/browse" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                  Find another tutor →
                </a>
              </p>` : ""}
              <p style="font-size:12px;color:#999;margin-top:24px">Study Buddy · SDSU</p>
            </div>`,
        }),
      });
      emailSent = resp.ok;
      if (!emailSent) console.error("Resend failed:", await resp.text());
    }

    // In-app message: find or create the conversation, then insert a message
    try {
      const { data: conv } = await admin
        .from("conversations")
        .select("id")
        .eq("student_id", session.student_id)
        .eq("tutor_demo_id", session.tutor_id)
        .maybeSingle();

      const convId = conv?.id ?? null;
      const msgText = isReschedule
        ? `Hi ${studentFirstName}, I'm not able to accommodate the reschedule request. Your session stays at the original time — let me know if you have questions.`
        : `Hi ${studentFirstName}, I'm not available for the time you requested. I've declined this booking and your card has not been charged. Feel free to browse other tutors or reach out to schedule a different time.`;

      if (convId) {
        await admin.from("messages").insert({
          conversation_id: convId,
          sender_id: session.tutor_id,
          sender_name: session.tutor_name,
          text: msgText,
        });
        await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (msgErr) {
      console.warn("In-app message failed (non-fatal):", msgErr);
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
