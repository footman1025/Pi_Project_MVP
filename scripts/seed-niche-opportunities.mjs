/**
 * Seed 8 real-ish Opportunity Hub listings in one niche:
 * Solo founders & freelancers (0→1 validation wedge).
 *
 * Usage: node scripts/seed-niche-opportunities.mjs
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const path = resolve(root, '.env.local')
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )
}

const STYLE = {
  Job: {
    icon_name: 'Briefcase',
    icon_color: 'from-teal-500 to-pi-600',
    color: 'from-teal-500/20 to-cyan-500/10',
    border: 'border-teal-500/30',
  },
  Service: {
    icon_name: 'Sparkles',
    icon_color: 'from-amber-500 to-orange-600',
    color: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/30',
  },
  Partnership: {
    icon_name: 'Link2',
    icon_color: 'from-cyan-500 to-blue-600',
    color: 'from-cyan-500/20 to-blue-500/10',
    border: 'border-cyan-500/30',
  },
  'Co-founder': {
    icon_name: 'UserRoundPlus',
    icon_color: 'from-cyan-500 to-teal-600',
    color: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500/30',
  },
  Project: {
    icon_name: 'Rocket',
    icon_color: 'from-violet-500 to-purple-600',
    color: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-500/30',
  },
  Talent: {
    icon_name: 'Palette',
    icon_color: 'from-pink-500 to-rose-600',
    color: 'from-pink-500/20 to-rose-500/10',
    border: 'border-pink-500/30',
  },
}

/** Niche: solo founders & freelancers */
const SEEDS = [
  {
    slug: 'react-cofounder-for-b2b-saas-mvp',
    title: 'React co-founder for B2B SaaS MVP',
    category: 'Co-founder',
    subtitle: 'Solo founder seeking technical partner — equity',
    description:
      'Building a B2B workflow tool for freelancers. Looking for a React/TypeScript co-founder to ship MVP in 8–10 weeks. Equity split open for discussion. Remote-friendly, EU timezone preferred.',
    prize: 'Equity',
    deadline: 'Open',
    location: 'Remote · EU',
  },
  {
    slug: 'freelance-ui-designer-saas-landing',
    title: 'Freelance UI designer for SaaS landing',
    category: 'Talent',
    subtitle: '2-week sprint · landing + design system tokens',
    description:
      'Need a sharp product designer for a conversion-focused landing page and light design tokens. Portfolio of SaaS/startups required. Fixed scope, clear milestones.',
    prize: '€1.2k–1.8k',
    deadline: '2 weeks',
    location: 'Remote',
  },
  {
    slug: 'early-customers-ai-productivity-tool',
    title: 'Early customers for AI productivity tool',
    category: 'Project',
    subtitle: 'Looking for 20 solo founders to pilot',
    description:
      'Shipping an AI weekly planner for solo founders. Seeking 20 pilot users who will give honest feedback in exchange for free Pro for 6 months. No payment required to join the pilot.',
    prize: 'Free Pro · 6 months',
    deadline: 'Rolling',
    location: 'Remote',
  },
  {
    slug: 'agency-indie-hacker-partnership',
    title: 'Agency × indie hacker partnership',
    category: 'Partnership',
    subtitle: 'Distribution for each other’s services',
    description:
      'Small product studio wants to partner with indie hackers: we refer design/dev clients, you refer productized tools. Looking for 3–5 partners with an audience of freelancers or founders.',
    prize: 'Revenue share',
    deadline: 'Open',
    location: 'Remote',
  },
  {
    slug: 'part-time-technical-advisor',
    title: 'Part-time technical advisor (startup)',
    category: 'Service',
    subtitle: '4 hrs/week · architecture & hiring help',
    description:
      'Pre-seed founder needs a senior engineer as advisor: stack choices, hiring interviews, and code review. Paid monthly retainer. Ideal for someone who’s shipped SaaS before.',
    prize: '€400/mo retainer',
    deadline: 'Open',
    location: 'Remote · async',
  },
  {
    slug: 'freelance-content-writer-devtools',
    title: 'Freelance content writer — developer tools',
    category: 'Job',
    subtitle: 'Blog + docs samples · ongoing',
    description:
      'Developer-tools startup needs a writer who can explain APIs clearly. Start with 4 articles. Must show prior DevRel or technical blog samples. English native or bilingual OK.',
    prize: '€250/article',
    deadline: 'Open',
    location: 'Remote',
  },
  {
    slug: 'cofounder-freelancer-marketplace',
    title: 'Co-founder: marketplace for freelancers',
    category: 'Co-founder',
    subtitle: 'Ops / growth partner · trust-first matching',
    description:
      'Technical founder building a trust-based freelancer matching marketplace. Seeking a co-founder strong in ops, community, or growth. Not looking for capital — looking for builders.',
    prize: 'Equity',
    deadline: 'Open',
    location: 'Remote · Europe',
  },
  {
    slug: 'beta-testers-focus-timer-app',
    title: 'Beta testers for focus-timer app',
    category: 'Project',
    subtitle: 'Freelancers who struggle with deep work',
    description:
      'Looking for 30 freelancers to beta-test a minimal focus timer with accountability pairs. Feedback via short weekly form. Early access + lifetime discount for active testers.',
    prize: 'Lifetime discount',
    deadline: 'Aug 2026',
    location: 'Remote',
  },
]

async function main() {
  const env = loadEnv()
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const key = env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  // Prefer Gabriel as owner when present
  const profiles = await fetch(
    `${url}/rest/v1/profiles?select=id,full_name,username&or=(full_name.ilike.*Gabriel*,username.ilike.*gabriel*)&limit=1`,
    { headers },
  ).then(r => r.json())
  const ownerId = Array.isArray(profiles) && profiles[0]?.id ? profiles[0].id : null
  if (!ownerId) {
    console.error('No owner profile found (Gabriel). Create a profile first.')
    process.exit(1)
  }
  console.log('Owner:', profiles[0].full_name || profiles[0].username, ownerId)

  // Clean legacy random slug if still present
  await fetch(
    `${url}/rest/v1/opportunities?slug=eq.the-opportunity-for-everyone-167ud`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ slug: 'the-opportunity-for-everyone' }),
    },
  )

  const appUrl = (env.VITE_PUBLIC_APP_URL || 'https://pi-project-mvp.vercel.app').replace(/\/$/, '')
  const links = []

  for (const seed of SEEDS) {
    const style = STYLE[seed.category] || STYLE.Job
    const existing = await fetch(
      `${url}/rest/v1/opportunities?slug=eq.${encodeURIComponent(seed.slug)}&select=id,slug,title`,
      { headers },
    ).then(r => r.json())

    if (Array.isArray(existing) && existing[0]) {
      console.log('exists:', seed.slug)
      links.push(`${appUrl}/o/${seed.slug}`)
      continue
    }

    const row = {
      title: seed.title,
      subtitle: seed.subtitle,
      prize: seed.prize,
      deadline: seed.deadline,
      category: seed.category,
      ...style,
      ai_reason: `Niche seed · solo founders & freelancers · ${seed.category}`,
      baseline_match: 78,
      is_active: true,
      owner_id: ownerId,
      slug: seed.slug,
      description: seed.description,
      location: seed.location,
      source: 'member',
    }

    const res = await fetch(`${url}/rest/v1/opportunities?select=id,slug,title`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
    })
    const body = await res.json()
    if (!res.ok) {
      console.error('FAIL', seed.slug, body)
      continue
    }
    console.log('created:', seed.slug)
    links.push(`${appUrl}/o/${seed.slug}`)
  }

  console.log('\n=== Public links (share these) ===')
  links.forEach(l => console.log(l))
  console.log(`\nHub: ${appUrl}/opportunities`)
  console.log(`Traction: ${appUrl}/traction`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
