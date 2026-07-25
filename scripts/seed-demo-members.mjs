/**
 * Investor Readiness — seed 8 demo members via Supabase Admin API.
 *
 * Usage (from pi-demo/):
 *   set SUPABASE_URL=https://xxxx.supabase.co
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Project Settings → API → service_role)
 *   node scripts/seed-demo-members.mjs
 *
 * Password for all: PiDemo2026!
 * Prefer this script if supabase_seed_demo_members.sql fails on auth.identities.
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'PiDemo2026!'

const members = [
  {
    email: 'alex.rivera@pi-demo.local',
    full_name: 'Alex Rivera',
    username: 'alex_rivera',
    role: 'Entrepreneur',
    bio: 'Building AI-native collaboration tools. Looking for technical co-founders and early design partners.',
    location: 'London, UK',
    skills: ['Product Strategy', 'Fundraising', 'AI Products', 'Go-to-Market'],
    interests: ['Artificial Intelligence', 'Startups', 'Creator Economy'],
    goals: ['Build a startup', 'Find collaborators', 'Find investment'],
  },
  {
    email: 'priya.shah@pi-demo.local',
    full_name: 'Priya Shah',
    username: 'priya_shah',
    role: 'Software Engineer',
    bio: 'Full-stack engineer shipping realtime social graphs. Open to co-founder roles in AI platforms.',
    location: 'Berlin, DE',
    skills: ['TypeScript', 'React', 'Supabase', 'System Design', 'Python'],
    interests: ['Artificial Intelligence', 'Web3 & Blockchain', 'Startups'],
    goals: ['Find collaborators', 'Launch a product', 'Learn new skills'],
  },
  {
    email: 'marco.bellini@pi-demo.local',
    full_name: 'Marco Bellini',
    username: 'marco_bellini',
    role: 'Content Creator',
    bio: 'Creator building educational content about AI tools and founder journeys across Europe.',
    location: 'Milan, IT',
    skills: ['Video', 'Storytelling', 'Audience Growth', 'Brand Partnerships'],
    interests: ['Creator Economy', 'Artificial Intelligence', 'Design'],
    goals: ['Grow my audience', 'Launch a product', 'Find collaborators'],
  },
  {
    email: 'sofia.nguyen@pi-demo.local',
    full_name: 'Sofia Nguyen',
    username: 'sofia_nguyen',
    role: 'Designer',
    bio: 'Product designer for AI interfaces. Excited about systems that feel human, not dark-patterned.',
    location: 'Lisbon, PT',
    skills: ['UI/UX', 'Design Systems', 'Figma', 'Motion'],
    interests: ['Design', 'Artificial Intelligence', 'Startups'],
    goals: ['Find collaborators', 'Launch a product', 'Learn new skills'],
  },
  {
    email: 'james.okonkwo@pi-demo.local',
    full_name: 'James Okonkwo',
    username: 'james_okonkwo',
    role: 'Investor',
    bio: 'Angel investor focused on AI-native social infrastructure and European pre-seed.',
    location: 'Amsterdam, NL',
    skills: ['Venture', 'Diligence', 'Network Introductions', 'Go-to-Market'],
    interests: ['Artificial Intelligence', 'Startups', 'Finance'],
    goals: ['Find investment', 'Hire talent', 'Find collaborators'],
  },
  {
    email: 'elena.rossi@pi-demo.local',
    full_name: 'Elena Rossi',
    username: 'elena_rossi',
    role: 'Consultant',
    bio: 'Strategy consultant helping founders with ops, partnerships, and European market entry.',
    location: 'Rome, IT',
    skills: ['Strategy', 'Operations', 'Partnerships', 'Growth'],
    interests: ['Startups', 'Finance', 'Health Tech'],
    goals: ['Find collaborators', 'Hire talent', 'Build a startup'],
  },
  {
    email: 'noah.kim@pi-demo.local',
    full_name: 'Noah Kim',
    username: 'noah_kim',
    role: 'Software Engineer',
    bio: 'Mobile + AI engineer. Looking for mission-driven teams building opportunity networks.',
    location: 'Seoul, KR',
    skills: ['React Native', 'Python', 'ML Ops', 'APIs'],
    interests: ['Artificial Intelligence', 'Gaming', 'Startups'],
    goals: ['Find collaborators', 'Learn new skills', 'Launch a product'],
  },
  {
    email: 'amara.diallo@pi-demo.local',
    full_name: 'Amara Diallo',
    username: 'amara_diallo',
    role: 'Student',
    bio: 'CS student shipping side projects in health tech and community platforms.',
    location: 'Paris, FR',
    skills: ['Python', 'Research', 'Community Building'],
    interests: ['Health Tech', 'Artificial Intelligence', 'Startups'],
    goals: ['Learn new skills', 'Find collaborators', 'Build a startup'],
  },
]

async function ensureUser(m) {
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const existing = listed?.users?.find(u => u.email?.toLowerCase() === m.email.toLowerCase())
  if (existing) return existing.id

  const { data, error } = await admin.auth.admin.createUser({
    email: m.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: m.full_name },
  })
  if (error) throw new Error(`${m.email}: ${error.message}`)
  return data.user.id
}

async function main() {
  console.log('Seeding demo members for Investor Readiness…')
  for (const m of members) {
    const id = await ensureUser(m)
    const ai_summary = `${m.full_name} is ${/^[aeiou]/i.test(m.role) ? 'an' : 'a'} ${m.role} focused on ${m.interests.slice(0, 2).join(' and ')}. Strengths include ${m.skills.slice(0, 3).join(', ')}.`
    const { error } = await admin.from('profiles').update({
      username: m.username,
      full_name: m.full_name,
      role: m.role,
      bio: m.bio,
      location: m.location,
      skills: m.skills,
      interests: m.interests,
      goals: m.goals,
      ai_summary,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) throw new Error(`profile ${m.email}: ${error.message}`)
    console.log('✓', m.full_name, `(${m.role})`)
  }
  console.log('\nDone. Password for all demo accounts:', PASSWORD)
  console.log('Open Matching / Creators / Professionals to see the live graph.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
