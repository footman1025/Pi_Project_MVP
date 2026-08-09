-- P0 — Close Opportunity Hub loop: persist outcomes applicants can see
-- Safe to re-run. Run after supabase_opportunity_interest.sql (+ owner read).

alter table public.opportunity_interest
  add column if not exists outcome text;

alter table public.opportunity_interest
  drop constraint if exists opportunity_interest_outcome_check;

alter table public.opportunity_interest
  add constraint opportunity_interest_outcome_check
  check (
    outcome is null
    or outcome in ('connected', 'hired', 'passed', 'closed')
  );

comment on column public.opportunity_interest.outcome is
  'Owner-set loop outcome: connected | hired | passed | closed';

-- Owners can update interest rows on their own opportunities (set outcome)
drop policy if exists "Owners update interest on own opportunities" on public.opportunity_interest;
create policy "Owners update interest on own opportunities"
  on public.opportunity_interest for update
  to authenticated
  using (
    exists (
      select 1 from public.opportunities o
      where o.id::text = opportunity_id
        and o.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.opportunities o
      where o.id::text = opportunity_id
        and o.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
