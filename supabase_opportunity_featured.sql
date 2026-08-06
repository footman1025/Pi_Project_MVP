-- Opportunity Hub — Featured / priority listing (willingness-to-pay experiment)
-- Run AFTER supabase_opportunities_hub.sql
-- Price is enforced in app/API (default €9 / 7 days). No Surprise: clear, optional, reversible.

alter table public.opportunities
  add column if not exists is_featured boolean default false;

alter table public.opportunities
  add column if not exists featured_until timestamptz;

alter table public.opportunities
  add column if not exists featured_at timestamptz;

create index if not exists opportunities_featured_idx
  on public.opportunities (is_featured, featured_until desc)
  where is_active = true;

create table if not exists public.opportunity_featured_orders (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null,
  opportunity_title text,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'intent'
    check (status in ('intent', 'pending', 'paid', 'expired', 'cancelled')),
  amount_cents int not null default 900,
  currency text not null default 'eur',
  days int not null default 7,
  stripe_session_id text,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists opportunity_featured_orders_user_idx
  on public.opportunity_featured_orders (user_id, created_at desc);

create index if not exists opportunity_featured_orders_opp_idx
  on public.opportunity_featured_orders (opportunity_id);

create unique index if not exists opportunity_featured_orders_session_uidx
  on public.opportunity_featured_orders (stripe_session_id)
  where stripe_session_id is not null;

alter table public.opportunity_featured_orders enable row level security;

drop policy if exists "Users read own featured orders" on public.opportunity_featured_orders;
create policy "Users read own featured orders"
  on public.opportunity_featured_orders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own featured orders" on public.opportunity_featured_orders;
create policy "Users insert own featured orders"
  on public.opportunity_featured_orders for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own featured orders" on public.opportunity_featured_orders;
create policy "Users update own featured orders"
  on public.opportunity_featured_orders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Owners may feature their own listings (used after paid confirm via service role too)
drop policy if exists "Members feature own opportunities" on public.opportunities;
create policy "Members feature own opportunities"
  on public.opportunities for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
