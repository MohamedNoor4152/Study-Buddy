// Deploy (Supabase CLI):
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set RESEND_FROM="Study Buddy <noreply@yourdomain.com>"
//   supabase secrets set SERVICE_ROLE_SECRET=...   # Dashboard → API → service_role (cannot use SUPABASE_ prefix)
//   supabase functions deploy send-session-confirmed
// Supabase injects SUPABASE_URL and SUPABASE_ANON_KEY automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function receiptHtml(details: Record<string, string>) {
  const rows = Object.entries(details)
    .map(([k, v]) => `<tr><td style="padding:8px 12px;color:#444;border-bottom:1px solid #eee">${k}</td><td style="padding:8px 12px;font-weight:600;text-align:right;border-bottom:1px solid #eee">${v}</td></tr>`)
    .join("");
  return `<table style="width:100%;max-width:480px;font-family:sans-serif;border-collapse:collapse">${rows}</table>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let body: { sessionId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const sessionId = body.sessionId;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_SECRET")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM") ?? "Study Buddy <onboarding@resend.dev>";

    const jwtClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await jwtClient.auth.getUser();
    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const callerId = authData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sErr } = await admin.from("sessions").select("*").eq("id", sessionId).single();
    if (sErr || !session || session.status !== "confirmed") {
      return new Response(JSON.stringify({ error: "Session not found or not confirmed" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (session.tutor_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: studentAcc } = await admin.auth.admin.getUserById(session.student_id as string);
    const studentEmail = studentAcc?.user?.email ?? "";
    if (!studentEmail) {
      return new Response(JSON.stringify({ error: "No student email" }), { status: 422, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const when = new Date(session.scheduled_at as string).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const sessionFee = Number(session.earnings) || 0;
    const serviceFee = Math.round(sessionFee * 0.08);
    const total = sessionFee + serviceFee;

    const receiptDetails: Record<string, string> = {
      Tutor: String(session.tutor_name ?? ""),
      Course: String(session.class_code ?? ""),
      When: when,
      Duration: `${session.duration_min} min`,
      Location: String(session.location ?? "—"),
      "Session fee": `$${sessionFee.toFixed(2)}`,
      "Service fee": `$${serviceFee.toFixed(2)}`,
      Total: `$${total.toFixed(2)}`,
    };

    let emailSent = false;
    if (resendKey) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [studentEmail],
          subject: `Study Buddy · Session confirmed — ${session.class_code}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#222">
              <p>Hi ${String(session.student_name ?? "there").split(" ")[0]},</p>
              <p><strong>${session.tutor_name ?? "Your tutor"}</strong> confirmed your tutoring session.</p>
              ${receiptHtml(receiptDetails)}
              <p style="margin-top:20px;font-size:13px;color:#666">
                Charges follow our normal policy once the session runs. Reply in your Study Buddy conversation if you need to coordinate.
              </p>
              <p style="font-size:12px;color:#999">Study Buddy · SDSU</p>
            </div>`,
        }),
      });
      emailSent = resp.ok;
      if (!emailSent) {
        const txt = await resp.text();
        console.error("Resend failed:", txt);
      }
    } else {
      console.warn("RESEND_API_KEY not set — skipping email");
    }

    const threadPlain = [
      "✅ Session confirmed",
      `Tutor: ${session.tutor_name ?? ""}`,
      `Course: ${session.class_code ?? ""}`,
      `When: ${when}`,
      `Duration: ${session.duration_min} min`,
      `Where: ${session.location ?? ""}`,
      "",
      `Session fee: $${sessionFee.toFixed(2)}`,
      `Service fee: $${serviceFee.toFixed(2)}`,
      `Total (est.): $${total.toFixed(2)}`,
    ].join("\n");

    let messagePosted = false;
    const tutorUid = session.tutor_id as string | null;

    if (tutorUid) {
      let convId: string | null = null;
      const { data: convRow } = await admin
        .from("conversations")
        .select("id")
        .eq("student_id", session.student_id)
        .eq("tutor_demo_id", tutorUid)
        .maybeSingle();

      if (convRow?.id) convId = convRow.id;
      else {
        const { data: ins, error: insErr } = await admin
          .from("conversations")
          .insert({
            student_id: session.student_id,
            tutor_demo_id: tutorUid,
            student_name: session.student_name ?? "Student",
            tutor_name: session.tutor_name ?? "Tutor",
            last_message: "Session confirmed",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (!insErr && ins?.id) convId = ins.id;
      }

      if (convId) {
        const insMsg = await admin.from("messages").insert({
          conversation_id: convId,
          sender_id: tutorUid,
          sender_name: "Study Buddy",
          text: threadPlain,
        });
        messagePosted = !insMsg.error;
        if (!insMsg.error) {
          await admin
            .from("conversations")
            .update({
              last_message: "✅ Session confirmed",
              last_message_at: new Date().toISOString(),
            })
            .eq("id", convId);
        } else console.error("Message insert:", insMsg.error);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        emailSent,
        messagePosted,
        emailSkipped: !resendKey,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
