-- tutor_blocked_dates: specific calendar dates where a tutor is unavailable.
-- These override the weekly recurring schedule in tutor_availability.
create table if not exists public.tutor_blocked_dates (
  id         bigint generated always as identity primary key,
  tutor_id   uuid not null references auth.users(id) on delete cascade,
  date       date not null,          -- e.g. '2026-07-12'
  note       text,                   -- optional reason (e.g. "vacation", "exam week")
  created_at timestamptz default now(),
  unique (tutor_id, date)
);

alter table public.tutor_blocked_dates enable row level security;

create policy "Tutors manage own blocked dates"
  on public.tutor_blocked_dates
  for all
  using  (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

create policy "Students can read blocked dates"
  on public.tutor_blocked_dates
  for select
  using (true);

create index if not exists tutor_blocked_dates_tutor_id_idx on public.tutor_blocked_dates(tutor_id);
