-- tutor_availability: one row per (tutor, day, hour) open slot
-- Hour format: "8:00 AM" … "9:00 PM" (matching the schedule editor labels)
create table if not exists public.tutor_availability (
  id            bigint generated always as identity primary key,
  tutor_id      uuid not null references auth.users(id) on delete cascade,
  day           text not null,          -- 'Mon' | 'Tue' | … | 'Sun'
  hour          text not null,          -- e.g. '8:00 AM', '2:00 PM'
  rate          numeric(10,2) default 38,
  min_session   int  default 60,        -- minimum booking length in minutes
  created_at    timestamptz default now(),
  unique (tutor_id, day, hour)
);

-- Tutors can manage their own rows; students can read all rows (for profile availability display)
alter table public.tutor_availability enable row level security;

create policy "Tutors manage own availability"
  on public.tutor_availability
  for all
  using  (auth.uid() = tutor_id)
  with check (auth.uid() = tutor_id);

create policy "Students can read availability"
  on public.tutor_availability
  for select
  using (true);

-- Perf: fast lookup by tutor
create index if not exists tutor_availability_tutor_id_idx on public.tutor_availability(tutor_id);
