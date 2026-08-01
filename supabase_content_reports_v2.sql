-- Pi Trust & Safety v2 — risk score + appeals (run after supabase_content_reports.sql)
-- Rules-based risk scoring is computed in the app; columns store the result for triage.

alter table public.content_reports
  add column if not exists risk_score int not null default 0
    check (risk_score >= 0 and risk_score <= 100);

alter table public.content_reports
  add column if not exists risk_level text not null default 'low'
    check (risk_level in ('low', 'medium', 'high', 'critical'));

alter table public.content_reports
  add column if not exists appeal_status text
    check (appeal_status is null or appeal_status in (
      'requested', 'under_review', 'upheld', 'overturned'
    ));

alter table public.content_reports
  add column if not exists appeal_note text;

alter table public.content_reports
  add column if not exists appeal_at timestamptz;

alter table public.content_reports
  add column if not exists updated_at timestamptz default now();

create index if not exists content_reports_risk_idx
  on public.content_reports (risk_score desc, created_at desc);

create index if not exists content_reports_appeal_idx
  on public.content_reports (appeal_status)
  where appeal_status is not null;

-- Reporters may update their own row to request an appeal (limited columns via app).
drop policy if exists "Users appeal own reports" on public.content_reports;
create policy "Users appeal own reports"
  on public.content_reports for update
  to authenticated
  using (auth.uid() = reporter_id)
  with check (auth.uid() = reporter_id);
