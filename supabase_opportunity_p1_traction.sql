-- P1 — Traction engine: outcome timing for time-to-outcome
-- Safe to re-run. Run after supabase_opportunity_outcome.sql.

alter table public.opportunity_interest
  add column if not exists outcome_at timestamptz;

comment on column public.opportunity_interest.outcome_at is
  'When the owner set the loop outcome (for time-to-outcome).';

notify pgrst, 'reload schema';
