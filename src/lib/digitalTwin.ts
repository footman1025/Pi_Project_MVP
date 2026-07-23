import type { Profile, Experience } from './supabase'
import { buildProfileSummary } from './aiSummary'

export type DigitalTwin = {
  summary: string
  personality: string[]
  ambitions: string[]
  traits: { label: string; value: string }[]
  actions: { title: string; detail: string }[]
  graph: { skills: number; goals: number; experience: number; networkReady: number }
}

function personalityFromProfile(p: Partial<Profile>): string[] {
  const out: string[] = []
  const role = (p.role || '').toLowerCase()
  if (/founder|entrepreneur/.test(role)) out.push('High agency')
  if (/engineer|developer|technical/.test(role)) out.push('Builder mindset')
  if (/investor|angel|vc/.test(role)) out.push('Pattern recognition')
  if (/designer|design/.test(role)) out.push('Systems thinker')
  if (/creator|content/.test(role)) out.push('Audience-oriented')
  if (/student/.test(role)) out.push('Growth-oriented')
  if ((p.goals || []).some(g => /collaborat|co-founder|hire/i.test(g))) out.push('Collaborative')
  if ((p.interests || []).some(i => /ai|artificial/i.test(i))) out.push('AI-native')
  if (out.length < 3) out.push('Mission-driven', 'Curious', 'Networked')
  return [...new Set(out)].slice(0, 4)
}

function ambitionsFromProfile(p: Partial<Profile>): string[] {
  const goals = (p.goals || []).slice(0, 3)
  if (goals.length) return goals
  return ['Grow professional network', 'Unlock relevant opportunities', 'Build lasting collaborations']
}

function actionsFromProfile(p: Partial<Profile>): { title: string; detail: string }[] {
  const role = p.role || 'professional'
  const interest = p.interests?.[0] || 'your domain'
  const goal = p.goals?.[0] || 'your next milestone'
  return [
    {
      title: 'Recommend 5 accelerators of your goal',
      detail: `Pi ranks people globally who can advance “${goal}” given your ${role} profile.`,
    },
    {
      title: 'Surface opportunity fits',
      detail: `Opportunities in ${interest} scored against skills, stage, and geography.`,
    },
    {
      title: 'Draft warm introductions',
      detail: 'AI Twin prepares context-aware intros using shared graph edges.',
    },
  ]
}

/** Build an AI Digital Twin representation from a live Pi profile */
export function buildDigitalTwin(profile: Profile | null | undefined): DigitalTwin | null {
  if (!profile) return null
  const skills = profile.skills || []
  const goals = profile.goals || []
  const exp = (profile.experience || []) as Experience[]
  const interests = profile.interests || []

  const summary = buildProfileSummary({
    fullName: profile.full_name,
    role: profile.role,
    interests,
    goals,
    skills,
    experience: exp,
  })

  const completeness =
    (profile.role ? 20 : 0) +
    Math.min(25, skills.length * 5) +
    Math.min(20, goals.length * 7) +
    Math.min(20, interests.length * 5) +
    Math.min(15, exp.length * 8)

  return {
    summary:
      `AI Digital Twin for ${profile.full_name || 'this member'}: ` +
      summary.replace(/^[^.]+\.\s*/, '') +
      ' This twin continuously updates as skills, goals, and interactions evolve.',
    personality: personalityFromProfile(profile),
    ambitions: ambitionsFromProfile(profile),
    traits: [
      { label: 'Role', value: profile.role || 'Pi Member' },
      { label: 'Focus', value: interests[0] || 'Open exploration' },
      { label: 'Primary goal', value: goals[0] || 'Build network' },
      { label: 'Location', value: profile.location || 'Global' },
    ],
    actions: actionsFromProfile(profile),
    graph: {
      skills: Math.min(100, skills.length * 18 + 20),
      goals: Math.min(100, goals.length * 22 + 25),
      experience: Math.min(100, exp.length * 28 + 15),
      networkReady: Math.min(99, completeness),
    },
  }
}
