-- Run once in Supabase → SQL Editor (safe: only adds columns if missing)
alter table sessions
  add column if not exists original_scheduled_at timestamptz;

alter table sessions
  add column if not exists reschedule_status text;
