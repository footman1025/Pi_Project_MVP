-- Hotfix: moderation status updates write updated_at.
-- Safe to run if you already have content_reports but skipped v2 (or only ran base SQL).

alter table public.content_reports
  add column if not exists updated_at timestamptz default now();
