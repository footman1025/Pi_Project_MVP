-- Opportunity interest / apply intent (no payments)
-- Run after supabase_opportunities.sql (catalog can be demo or live).
-- opportunity_id is text so demo/mock catalog IDs work alongside UUID rows.

create table if not exists public.opportunity_interest (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id text not null,
  opportunity_title text,
  status text not null default 'interested'
    check (status in ('interested', 'applied', 'withdrawn')),
  note text,
  match_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

create index if not exists opportunity_interest_user_idx
  on public.opportunity_interest (user_id, updated_at desc);

create index if not exists opportunity_interest_opp_idx
  on public.opportunity_interest (opportunity_id);

alter table public.opportunity_interest enable row level security;

drop policy if exists "Users read own opportunity interest" on public.opportunity_interest;
create policy "Users read own opportunity interest"
  on public.opportunity_interest for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own opportunity interest" on public.opportunity_interest;
create policy "Users insert own opportunity interest"
  on public.opportunity_interest for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own opportunity interest" on public.opportunity_interest;
create policy "Users update own opportunity interest"
  on public.opportunity_interest for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
