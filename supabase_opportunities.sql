-- Opportunities catalog (Phase 1 Investor Readiness)
-- Run in Supabase SQL Editor. Public read of active rows; seed via this script.

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  prize text,
  deadline text,
  category text not null,
  icon_name text default 'Briefcase',
  icon_color text default 'from-amber-500 to-orange-600',
  color text default 'from-amber-500/20 to-orange-500/10',
  border text default 'border-amber-500/30',
  ai_reason text,
  baseline_match int default 70,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.opportunities enable row level security;

drop policy if exists "Active opportunities are viewable by everyone" on public.opportunities;
create policy "Active opportunities are viewable by everyone"
  on public.opportunities for select
  using (is_active = true);

-- Seed catalog (idempotent by title)
insert into public.opportunities (
  title, subtitle, prize, deadline, category,
  icon_name, icon_color, color, border, ai_reason, baseline_match
)
select * from (values
  (
    'AI Startup Competition',
    'Alibaba CoCreate – London Finals',
    '$200,000',
    'July 28, 2026',
    'Competition',
    'Trophy',
    'from-yellow-500 to-amber-600',
    'from-yellow-500/20 to-amber-500/10',
    'border-yellow-500/30',
    'Your AI platform pitch scores in the top 5% of applicants. Pi''s unified ecosystem vision directly matches this competition''s AI-native innovation track.',
    99
  ),
  (
    'Meet 12 AI Investors',
    'Curated investor intro sessions',
    'Up to $2M',
    'Rolling Basis',
    'Funding',
    'Banknote',
    'from-emerald-500 to-teal-600',
    'from-emerald-500/20 to-teal-500/10',
    'border-emerald-500/30',
    'All 12 investors have funded AI-native social platforms at pre-seed. Pi''s architecture aligns with their stated investment thesis for 2026.',
    96
  ),
  (
    'Global Founders Community',
    '14,000+ founders worldwide',
    'Free to Join',
    'Open',
    'Community',
    'Globe2',
    'from-pi-500 to-teal-600',
    'from-pi-500/20 to-violet-500/10',
    'border-pi-500/30',
    '340 members share your interest in AI ecosystems. Pi found 12 potential co-founders and 8 early adopters inside this community.',
    94
  ),
  (
    'Find Technical Co-founders',
    'AI-matched technical partners',
    'Equity',
    'Open',
    'Co-founder',
    'UserRoundPlus',
    'from-cyan-500 to-teal-600',
    'from-blue-500/20 to-indigo-500/10',
    'border-blue-500/30',
    'Your profile indicates finding a technical co-founder as a primary goal. Pi matched 8 engineers with AI platform experience and startup commitment.',
    98
  ),
  (
    'AI Product Designers',
    'Top-rated designers for AI products',
    '$80-150/hr',
    'Open',
    'Talent',
    'Palette',
    'from-pink-500 to-rose-600',
    'from-pink-500/20 to-rose-500/10',
    'border-pink-500/30',
    'Pi detected a design gap in your current roadmap. These designers have shipped mobile-first AI interfaces for platforms at your exact stage.',
    87
  ),
  (
    'EU Tech Visa Accelerator',
    'Visa sponsorship for EU tech startups',
    'Sponsorship',
    'Aug 15, 2026',
    'Accelerator',
    'Rocket',
    'from-teal-500 to-pi-600',
    'from-pi-500/20 to-teal-500/10',
    'border-pi-500/30',
    'This accelerator has funded 3 platforms with Pi''s architecture pattern in the last 18 months. Their network includes 40+ AI-native founders.',
    82
  )
) as v(title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match)
where not exists (
  select 1 from public.opportunities o where o.title = v.title
);
