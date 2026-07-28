-- AI-first Contact & Partnership handoffs
-- Run in Supabase SQL Editor.

create table if not exists public.contact_handoffs (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  visitor_name text,
  visitor_email text,
  visitor_org text,
  intent text,
  summary text not null,
  transcript jsonb default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'claimed', 'closed')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists contact_handoffs_created_at_idx on public.contact_handoffs (created_at desc);
create index if not exists contact_handoffs_team_idx on public.contact_handoffs (team);
create index if not exists contact_handoffs_status_idx on public.contact_handoffs (status);

alter table public.contact_handoffs enable row level security;

-- Public visitors (and members) can submit a handoff
drop policy if exists "Anyone can create contact handoffs" on public.contact_handoffs;
create policy "Anyone can create contact handoffs"
  on public.contact_handoffs for insert
  with check (true);

-- Team members (signed-in) can review handoffs
drop policy if exists "Authenticated read contact handoffs" on public.contact_handoffs;
create policy "Authenticated read contact handoffs"
  on public.contact_handoffs for select
  to authenticated
  using (true);

drop policy if exists "Authenticated update contact handoffs" on public.contact_handoffs;
create policy "Authenticated update contact handoffs"
  on public.contact_handoffs for update
  to authenticated
  using (true)
  with check (true);
