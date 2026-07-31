-- Pi Trust & Safety — team can review reports (MVP)
-- Run after supabase_content_reports.sql

-- Authenticated members can list open reports for the moderation inbox.
-- Tighten later with a roles/admin table.
drop policy if exists "Team can read reports" on public.content_reports;
create policy "Team can read reports"
  on public.content_reports for select
  to authenticated
  using (true);

drop policy if exists "Team can update report status" on public.content_reports;
create policy "Team can update report status"
  on public.content_reports for update
  to authenticated
  using (true)
  with check (true);
