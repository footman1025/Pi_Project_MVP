-- Pi UGE — store experience preferences on profile (account sync)
-- Run in Supabase SQL Editor

alter table public.profiles
  add column if not exists uge_preferences jsonb default null;

comment on column public.profiles.uge_preferences is
  'Universal Generational Experience prefs: textScale, density, highContrast, reduceMotion, simplifiedNav, lifeStage';
