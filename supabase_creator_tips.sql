-- Creator tip intents (no Stripe / no real money movement)
-- Demo/Partial: records that a member expressed tip intent for a creator.
-- Run in Supabase SQL Editor when ready for account sync.

create table if not exists public.creator_tip_intents (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0 and amount_cents <= 100000),
  currency text not null default 'EUR',
  note text,
  status text not null default 'intent'
    check (status in ('intent', 'demo_recorded', 'cancelled')),
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create index if not exists creator_tip_intents_from_idx
  on public.creator_tip_intents (from_user_id, created_at desc);

create index if not exists creator_tip_intents_to_idx
  on public.creator_tip_intents (to_user_id, created_at desc);

alter table public.creator_tip_intents enable row level security;

drop policy if exists "Users insert own tip intents" on public.creator_tip_intents;
create policy "Users insert own tip intents"
  on public.creator_tip_intents for insert
  to authenticated
  with check (auth.uid() = from_user_id);

drop policy if exists "Users read own tip intents" on public.creator_tip_intents;
create policy "Users read own tip intents"
  on public.creator_tip_intents for select
  to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
