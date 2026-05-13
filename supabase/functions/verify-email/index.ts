import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { action, email, code } = await req.json();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey   = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(supabaseUrl, serviceKey);

  // ── action: send ──────────────────────────────────────────────────────────
  if (action === "send") {
    // Check if email is already registered
    const { data: existing } = await admin.auth.admin.listUsers();
    const taken = (existing?.users ?? []).some(
      (u) => u.email?.toLowerCase() === email?.toLowerCase()
    );
    if (taken) {
      return new Response(JSON.stringify({ error: "already_registered" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Generate a 6-digit code
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Upsert into email_verifications table
    await admin.from("email_verifications").upsert(
      { email: email.toLowerCase(), code: otp, expires_at: expires },
      { onConflict: "email" }
    );

    // Send the code via Resend
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Study Buddy <noreply@joinstudybuddy.com>",
          to: email,
          subject: "Your Study Buddy verification code",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#111">Verify your email</h2>
              <p style="color:#444">Enter this code to continue your tutor application:</p>
              <div style="font-size:48px;font-weight:700;letter-spacing:12px;color:#DC2626;
                          padding:24px;background:#FEF2F2;border-radius:12px;text-align:center;
                          margin:20px 0">${otp}</div>
              <p style="color:#666;font-size:13px">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
              <p style="color:#999;font-size:12px;margin-top:24px">Study Buddy · joinstudybuddy.com</p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // ── action: verify ────────────────────────────────────────────────────────
  if (action === "verify") {
    const { data: row } = await admin
      .from("email_verifications")
      .select("code, expires_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "no_code" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "expired" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (row.code !== String(code).trim()) {
      return new Response(JSON.stringify({ error: "wrong_code" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Clean up
    await admin.from("email_verifications").delete().eq("email", email.toLowerCase());

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "invalid_action" }), {
    status: 400, headers: { ...cors, "Content-Type": "application/json" },
  });
});
