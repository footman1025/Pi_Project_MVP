-- Fix: "Could not find the 'experience' column of 'profiles' in the schema cache"
-- Run once in Supabase → SQL Editor → New query → Run

alter table public.profiles
  add column if not exists experience jsonb default '[]'::jsonb;

-- Refresh PostgREST schema cache (optional; usually automatic within a few seconds)
notify pgrst, 'reload schema';
