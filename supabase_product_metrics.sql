-- Product traction: events + user-validation feedback
-- Run in Supabase SQL Editor before using Traction / feedback in the app.

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event text not null,
  props jsonb default '{}'::jsonb,
  path text,
  created_at timestamptz default now()
);

create index if not exists product_events_created_at_idx on public.product_events (created_at desc);
create index if not exists product_events_event_idx on public.product_events (event);
create index if not exists product_events_user_id_idx on public.product_events (user_id);
create index if not exists product_events_session_id_idx on public.product_events (session_id);

alter table public.product_events enable row level security;

drop policy if exists "Authenticated insert own product events" on public.product_events;
create policy "Authenticated insert own product events"
  on public.product_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated read product events" on public.product_events;
create policy "Authenticated read product events"
  on public.product_events for select
  to authenticated
  using (true);

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  would_use_again text not null check (would_use_again in ('yes', 'maybe', 'no')),
  blockers text,
  surface text,
  path text,
  created_at timestamptz default now()
);

create index if not exists product_feedback_created_at_idx on public.product_feedback (created_at desc);

alter table public.product_feedback enable row level security;

drop policy if exists "Authenticated insert own product feedback" on public.product_feedback;
create policy "Authenticated insert own product feedback"
  on public.product_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated read product feedback" on public.product_feedback;
create policy "Authenticated read product feedback"
  on public.product_feedback for select
  to authenticated
  using (true);
