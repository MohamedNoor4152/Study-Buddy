-- ─────────────────────────────────────────────────────────────────────────────
-- Study Buddy — Stripe payment columns
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- STRIPE SETUP (do this before running):
--   1. Create a free account at https://stripe.com
--   2. Dashboard → Connect → Settings → enable Express accounts
--   3. Dashboard → Developers → API keys → copy Publishable key + Secret key
--   4. Dashboard → Developers → Webhooks → Add endpoint:
--        URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
--        Events: payment_intent.payment_failed, account.updated
--      Copy the Signing secret (whsec_...) shown after saving.
--   5. Set Supabase secrets (run in your terminal):
--        supabase secrets set STRIPE_SECRET_KEY=sk_test_...
--        supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
--   6. Add to .env.local (frontend):
--        VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
--   7. Deploy the five new edge functions:
--        supabase functions deploy create-payment-intent
--        supabase functions deploy capture-payment
--        supabase functions deploy refund-payment
--        supabase functions deploy create-connect-account
--        supabase functions deploy stripe-webhook
-- ─────────────────────────────────────────────────────────────────────────────

-- sessions: store the Stripe PaymentIntent id and capture flag
alter table public.sessions
  add column if not exists payment_intent_id text,
  add column if not exists payment_captured   boolean not null default false;

-- tutor_profiles: store Stripe Connect account id and payout readiness
alter table public.tutor_profiles
  add column if not exists stripe_connect_id text,
  add column if not exists payouts_enabled   boolean not null default false;
