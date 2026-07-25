-- ============================================================
-- Investor Readiness: demo member graph (8 profiles)
-- Run in Supabase SQL Editor AFTER investor demos.
--
-- Creates auth.users + rich profiles so Matching / Creators /
-- Professionals / Dashboard show a live graph.
--
-- Login (all accounts): password PiDemo2026!
-- Emails: *.@pi-demo.local (not real inboxes)
-- Re-run safe: skips existing emails; upserts profile fields.
-- ============================================================

create extension if not exists pgcrypto;

-- Helper: create auth user if missing, return id
create or replace function public._pi_ensure_demo_user(
  p_id uuid,
  p_email text,
  p_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_id uuid;
begin
  select id into existing_id from auth.users where email = lower(p_email) limit 1;
  if existing_id is not null then
    return existing_id;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt('PiDemo2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(), now(), '', '', '', ''
  );

  -- identities row required by newer Supabase Auth
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    p_id, p_id,
    jsonb_build_object('sub', p_id::text, 'email', lower(p_email)),
    'email', p_id::text, now(), now(), now()
  )
  on conflict do nothing;

  return p_id;
exception when unique_violation then
  select id into existing_id from auth.users where email = lower(p_email) limit 1;
  return existing_id;
end;
$$;

do $$
declare
  u uuid;
begin
  -- 1. Alex Rivera — Founder / AI
  u := public._pi_ensure_demo_user(
    'a1111111-1111-4111-8111-111111111111'::uuid,
    'alex.rivera@pi-demo.local', 'Alex Rivera'
  );
  update public.profiles set
    username = 'alex_rivera',
    full_name = 'Alex Rivera',
    role = 'Entrepreneur',
    bio = 'Building AI-native collaboration tools. Looking for technical co-founders and early design partners.',
    location = 'London, UK',
    skills = array['Product Strategy', 'Fundraising', 'AI Products', 'Go-to-Market'],
    interests = array['Artificial Intelligence', 'Startups', 'Creator Economy'],
    goals = array['Build a startup', 'Find collaborators', 'Find investment'],
    ai_summary = 'Alex Rivera is an Entrepreneur focused on Artificial Intelligence and Startups. Strengths include Product Strategy, Fundraising, and AI Products. Right now they are focused on building a startup.',
    updated_at = now()
  where id = u;

  -- 2. Priya Shah — Engineer
  u := public._pi_ensure_demo_user(
    'a2222222-2222-4222-8222-222222222222'::uuid,
    'priya.shah@pi-demo.local', 'Priya Shah'
  );
  update public.profiles set
    username = 'priya_shah',
    full_name = 'Priya Shah',
    role = 'Software Engineer',
    bio = 'Full-stack engineer shipping realtime social graphs. Open to co-founder roles in AI platforms.',
    location = 'Berlin, DE',
    skills = array['TypeScript', 'React', 'Supabase', 'System Design', 'Python'],
    interests = array['Artificial Intelligence', 'Web3 & Blockchain', 'Startups'],
    goals = array['Find collaborators', 'Launch a product', 'Learn new skills'],
    ai_summary = 'Priya Shah is a Software Engineer focused on Artificial Intelligence and Startups. Strengths include TypeScript, React, and Supabase.',
    updated_at = now()
  where id = u;

  -- 3. Marco Bellini — Content Creator
  u := public._pi_ensure_demo_user(
    'a3333333-3333-4333-8333-333333333333'::uuid,
    'marco.bellini@pi-demo.local', 'Marco Bellini'
  );
  update public.profiles set
    username = 'marco_bellini',
    full_name = 'Marco Bellini',
    role = 'Content Creator',
    bio = 'Creator building educational content about AI tools and founder journeys across Europe.',
    location = 'Milan, IT',
    skills = array['Video', 'Storytelling', 'Audience Growth', 'Brand Partnerships'],
    interests = array['Creator Economy', 'Artificial Intelligence', 'Design'],
    goals = array['Grow my audience', 'Launch a product', 'Find collaborators'],
    ai_summary = 'Marco Bellini is a Content Creator focused on the Creator Economy and Artificial Intelligence.',
    updated_at = now()
  where id = u;

  -- 4. Sofia Nguyen — Designer
  u := public._pi_ensure_demo_user(
    'a4444444-4444-4444-8444-444444444444'::uuid,
    'sofia.nguyen@pi-demo.local', 'Sofia Nguyen'
  );
  update public.profiles set
    username = 'sofia_nguyen',
    full_name = 'Sofia Nguyen',
    role = 'Designer',
    bio = 'Product designer for AI interfaces. Excited about systems that feel human, not dark-patterned.',
    location = 'Lisbon, PT',
    skills = array['UI/UX', 'Design Systems', 'Figma', 'Motion'],
    interests = array['Design', 'Artificial Intelligence', 'Startups'],
    goals = array['Find collaborators', 'Launch a product', 'Learn new skills'],
    ai_summary = 'Sofia Nguyen is a Designer focused on Design and Artificial Intelligence. Strengths include UI/UX and Design Systems.',
    updated_at = now()
  where id = u;

  -- 5. James Okonkwo — Investor
  u := public._pi_ensure_demo_user(
    'a5555555-5555-4555-8555-555555555555'::uuid,
    'james.okonkwo@pi-demo.local', 'James Okonkwo'
  );
  update public.profiles set
    username = 'james_okonkwo',
    full_name = 'James Okonkwo',
    role = 'Investor',
    bio = 'Angel investor focused on AI-native social infrastructure and European pre-seed.',
    location = 'Amsterdam, NL',
    skills = array['Venture', 'Diligence', 'Network Introductions', 'Go-to-Market'],
    interests = array['Artificial Intelligence', 'Startups', 'Finance'],
    goals = array['Find investment', 'Hire talent', 'Find collaborators'],
    ai_summary = 'James Okonkwo is an Investor focused on Artificial Intelligence and Startups.',
    updated_at = now()
  where id = u;

  -- 6. Elena Rossi — Consultant / Strategy
  u := public._pi_ensure_demo_user(
    'a6666666-6666-4666-8666-666666666666'::uuid,
    'elena.rossi@pi-demo.local', 'Elena Rossi'
  );
  update public.profiles set
    username = 'elena_rossi',
    full_name = 'Elena Rossi',
    role = 'Consultant',
    bio = 'Strategy consultant helping founders with ops, partnerships, and European market entry.',
    location = 'Rome, IT',
    skills = array['Strategy', 'Operations', 'Partnerships', 'Growth'],
    interests = array['Startups', 'Finance', 'Health Tech'],
    goals = array['Find collaborators', 'Hire talent', 'Build a startup'],
    ai_summary = 'Elena Rossi is a Consultant focused on Startups and Growth Ops.',
    updated_at = now()
  where id = u;

  -- 7. Noah Kim — Developer / Talent
  u := public._pi_ensure_demo_user(
    'a7777777-7777-4777-8777-777777777777'::uuid,
    'noah.kim@pi-demo.local', 'Noah Kim'
  );
  update public.profiles set
    username = 'noah_kim',
    full_name = 'Noah Kim',
    role = 'Software Engineer',
    bio = 'Mobile + AI engineer. Looking for mission-driven teams building opportunity networks.',
    location = 'Seoul, KR',
    skills = array['React Native', 'Python', 'ML Ops', 'APIs'],
    interests = array['Artificial Intelligence', 'Gaming', 'Startups'],
    goals = array['Find collaborators', 'Learn new skills', 'Launch a product'],
    ai_summary = 'Noah Kim is a Software Engineer focused on Artificial Intelligence and mobile platforms.',
    updated_at = now()
  where id = u;

  -- 8. Amara Diallo — Student / Builder
  u := public._pi_ensure_demo_user(
    'a8888888-8888-4888-8888-888888888888'::uuid,
    'amara.diallo@pi-demo.local', 'Amara Diallo'
  );
  update public.profiles set
    username = 'amara_diallo',
    full_name = 'Amara Diallo',
    role = 'Student',
    bio = 'CS student shipping side projects in health tech and community platforms.',
    location = 'Paris, FR',
    skills = array['Python', 'Research', 'Community Building'],
    interests = array['Health Tech', 'Artificial Intelligence', 'Startups'],
    goals = array['Learn new skills', 'Find collaborators', 'Build a startup'],
    ai_summary = 'Amara Diallo is a Student focused on Health Tech and Artificial Intelligence.',
    updated_at = now()
  where id = u;
end $$;

-- Optional cleanup helper (does not drop users)
drop function if exists public._pi_ensure_demo_user(uuid, text, text);
