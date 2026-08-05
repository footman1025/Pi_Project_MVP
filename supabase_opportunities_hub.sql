-- Opportunity Hub 0→1 — user-created opportunities + public discovery
-- Run AFTER supabase_opportunities.sql
-- Adds ownership, slug, description; allows members to create & manage their own listings.

alter table public.opportunities
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.opportunities
  add column if not exists slug text;

alter table public.opportunities
  add column if not exists description text;

alter table public.opportunities
  add column if not exists location text;

alter table public.opportunities
  add column if not exists source text default 'platform'
    check (source is null or source in ('platform', 'member'));

-- Unique slug when present (public SEO URLs)
create unique index if not exists opportunities_slug_uidx
  on public.opportunities (slug)
  where slug is not null;

create index if not exists opportunities_owner_idx
  on public.opportunities (owner_id, created_at desc);

-- Members can insert their own listings
drop policy if exists "Members create own opportunities" on public.opportunities;
create policy "Members create own opportunities"
  on public.opportunities for insert
  to authenticated
  with check (auth.uid() = owner_id);

-- Members can update / soft-deactivate their own
drop policy if exists "Members update own opportunities" on public.opportunities;
create policy "Members update own opportunities"
  on public.opportunities for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Keep public read of active rows (already exists); re-assert for clarity
drop policy if exists "Active opportunities are viewable by everyone" on public.opportunities;
create policy "Active opportunities are viewable by everyone"
  on public.opportunities for select
  using (is_active = true);
