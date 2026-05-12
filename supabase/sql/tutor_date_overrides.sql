-- tutor_date_overrides: per-date exceptions to the weekly recurring schedule.
-- Supersedes tutor_blocked_dates (which can be dropped once this table is live).
--
-- mode = 'off'    → tutor is entirely unavailable that day
-- mode = 'custom' → tutor has specific hours available (stored in hours[])
--
-- If no row exists for a date, the tutor's weekly schedule (tutor_availability) applies.

create table if not exists public.tutor_date_overrides (
  tutor_id   uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  mode       text not null check (mode in ('off', 'custom')),
  hours      text[] not null default '{}',   -- e.g. {"9:00 AM","10:00 AM"}, empty when mode='off'
  created_at timestamptz default now(),
  primary key (tutor_id, date)
);

alter table public.tutor_date_overrides enable row level security;

create policy "Tutors manage own date overrides"
  on public.tutor_date_overrides
  for all
  using  (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

create policy "Students can read date overrides"
  on public.tutor_date_overrides
  for select
  using (true);

create index if not exists tutor_date_overrides_tutor_id_idx on public.tutor_date_overrides(tutor_id);
