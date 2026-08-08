-- Opportunity Hub completion — skills + soft-delete clarity
-- Safe to re-run. Complements supabase_opportunities_hub.sql

alter table public.opportunities
  add column if not exists skills text;

comment on column public.opportunities.skills is
  'Comma-separated skills / tags for matching and discovery';

-- Ensure owners can soft-deactivate (is_active = false) via existing update policy
drop policy if exists "Members update own opportunities" on public.opportunities;
create policy "Members update own opportunities"
  on public.opportunities for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owners can read their own inactive listings (for edit after unpublish)
drop policy if exists "Owners read own opportunities" on public.opportunities;
create policy "Owners read own opportunities"
  on public.opportunities for select
  to authenticated
  using (auth.uid() = owner_id);

notify pgrst, 'reload schema';
