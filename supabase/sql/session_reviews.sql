-- Session reviews (run once in Supabase SQL Editor).
-- Links one review row per completed session; students INSERT, profiles read aggregates.

create table if not exists public.session_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  tutor_id uuid references auth.users (id) on delete set null,
  class_code text default 'CHEM 200',
  rating smallint not null check (rating >= 1 and rating <= 5),
  tags text[] not null default '{}',
  body text not null default '',
  tip_dollars numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint session_reviews_one_per_session unique (session_id)
);

create index if not exists session_reviews_tutor_idx on public.session_reviews (tutor_id);

alter table public.session_reviews enable row level security;

drop policy if exists "Anyone reads session reviews" on public.session_reviews;
create policy "Anyone reads session reviews" on public.session_reviews
  for select using (true);

drop policy if exists "Students insert reviews for completed sessions" on public.session_reviews;
create policy "Students insert reviews for completed sessions" on public.session_reviews
  for insert to authenticated with check (
    auth.uid() = student_id
    and exists (
      select 1 from public.sessions s
      where s.id = session_reviews.session_id
        and s.student_id = auth.uid()
        and s.status = 'completed'
    )
  );

