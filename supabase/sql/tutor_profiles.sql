-- Public tutor listings (run once in SQL Editor).
-- Enables browse → profile → booking with sessions.tutor_id = real UUID.

create table if not exists public.tutor_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  year text,
  major text default 'Student',
  rate numeric(10,2) default 38,
  bio text default 'Verified Study Buddy tutor.',
  class_codes text[] not null default '{}',
  transcript_submitted boolean not null default false,
  listed boolean not null default false,
  updated_at timestamptz default now()
);

create index if not exists tutor_profiles_class_codes_idx on public.tutor_profiles using gin (class_codes);
create index if not exists tutor_profiles_listed_idx on public.tutor_profiles (listed);

alter table public.tutor_profiles enable row level security;

drop policy if exists "Anyone selects listed tutors" on public.tutor_profiles;
create policy "Read listed or own tutor_profiles" on public.tutor_profiles
  for select using (listed = true or auth.uid() = user_id);

-- Tutors create/update own row only
drop policy if exists "Tutor inserts own profile" on public.tutor_profiles;
create policy "Tutor inserts own profile" on public.tutor_profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Tutor updates own profile" on public.tutor_profiles;
create policy "Tutor updates own profile" on public.tutor_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- If you already have rows with listed = false from an older app version, students cannot read them for booking.
-- Run once in SQL Editor (optional):
--   update public.tutor_profiles set listed = true;
