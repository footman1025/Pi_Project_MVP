-- Opportunity Hub: owners can read interest/apply rows on their listings
-- Run AFTER supabase_opportunity_interest.sql and supabase_opportunities_hub.sql

drop policy if exists "Users read own opportunity interest" on public.opportunity_interest;
create policy "Users read own opportunity interest"
  on public.opportunity_interest for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.opportunities o
      where o.owner_id = auth.uid()
        and o.id::text = opportunity_interest.opportunity_id
    )
  );
