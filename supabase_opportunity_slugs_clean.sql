-- Clean opportunity public URLs: remove legacy random suffixes like -167ud
-- Example: the-opportunity-for-everyone-167ud → the-opportunity-for-everyone
-- Run in Supabase SQL Editor. Safe to re-run.

-- 1) Prefer exact known listing
update public.opportunities
set slug = 'the-opportunity-for-everyone'
where slug = 'the-opportunity-for-everyone-167ud'
  and not exists (
    select 1 from public.opportunities o2
    where o2.slug = 'the-opportunity-for-everyone'
      and o2.id <> opportunities.id
  );

-- 2) Strip trailing random-looking suffixes (4–6 alphanumeric) when clean slug is free
update public.opportunities o
set slug = regexp_replace(o.slug, '-[a-z0-9]{4,6}$', '', 'i')
where o.slug ~* '-[a-z0-9]{4,6}$'
  and regexp_replace(o.slug, '-[a-z0-9]{4,6}$', '', 'i') <> ''
  and not exists (
    select 1 from public.opportunities o2
    where o2.slug = regexp_replace(o.slug, '-[a-z0-9]{4,6}$', '', 'i')
      and o2.id <> o.id
  );
