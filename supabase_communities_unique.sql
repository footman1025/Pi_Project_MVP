-- Investor honesty: unique community names + realistic member counts for seed rows.
-- Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'communities_name_key'
  ) then
    alter table public.communities add constraint communities_name_key unique (name);
  end if;
exception when unique_violation then
  raise notice 'Duplicate community names exist — dedupe before adding unique(name).';
end $$;

-- Cap inflated seed counts so demos don't look fake (keeps real join-driven growth)
update public.communities
set members_count = least(coalesce(members_count, 0), 48)
where name in (
  'AI Founders Hub',
  'Global Startup Network',
  'Creator Economy Lab',
  'Web3 Builders',
  'Design Systems Guild',
  'Venture Capital Forum',
  'Health Tech Innovators',
  'Music Production Network'
);
