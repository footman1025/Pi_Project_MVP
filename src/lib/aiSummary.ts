import type { Experience } from './supabase'

export type SummaryInput = {
  fullName?: string | null
  role?: string | null
  interests?: string[] | null
  goals?: string[] | null
  skills?: string[] | null
  experience?: Experience[] | null
}

function articleFor(word: string) {
  return /^[aeiou]/i.test(word.trim()) ? 'an' : 'a'
}

function joinList(items: string[], max = 3) {
  const list = items.filter(Boolean).slice(0, max)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`
}

/** Personalized profile summary from onboarding / edit-profile fields (template engine, not an LLM). */
export function buildProfileSummary(input: SummaryInput): string {
  const name = (input.fullName || '').trim() || 'This Pi member'
  const role = (input.role || '').trim()
  const interests = [...new Set((input.interests || []).map(s => s.trim()).filter(Boolean))]
  const goals = [...new Set((input.goals || []).map(s => s.trim()).filter(Boolean))]
  const skills = [...new Set((input.skills || []).map(s => s.trim()).filter(Boolean))]
  const experience = (input.experience || []).filter(e => e.title || e.company)

  const parts: string[] = []

  if (role) {
    parts.push(`${name} is ${articleFor(role)} ${role}`)
  } else {
    parts.push(`${name} is building their presence on Pi`)
  }

  if (interests.length) {
    parts.push(`focused on ${joinList(interests, 3)}`)
  }

  let sentence = parts.join(' ') + '.'

  if (experience.length) {
    const latest = experience[0]
    const roleBit = latest.title ? latest.title : 'a key role'
    const coBit = latest.company ? ` at ${latest.company}` : ''
    sentence += ` Their background includes ${roleBit}${coBit}.`
  }

  if (skills.length) {
    sentence += ` Strengths include ${joinList(skills, 4)}.`
  }

  if (goals.length) {
    sentence += ` Right now they are focused on ${goals[0].toLowerCase()}`
    if (goals.length > 1) sentence += `, with additional aims around ${goals[1].toLowerCase()}`
    sentence += '.'
  }

  sentence +=
    ' Pi recommends connecting them with complementary collaborators, relevant communities, and opportunities aligned to this profile.'

  return sentence.length > 420 ? sentence.slice(0, 417).trimEnd() + '…' : sentence
}

export function buildOnboardingPreview(role: string, interests: string[], goals: string[], skills: string[]) {
  const summary = buildProfileSummary({ role, interests, goals, skills })

  const interest = interests[0] || 'innovation'
  const goal = (goals[0] || 'grow').toLowerCase()

  const matches = [
    {
      name: 'Complementary collaborator',
      role: role === 'Software Engineer' ? 'Founder / Product' : 'Technical partner',
      match: 94,
      reason: `Aligned around ${interest} with skills that complement yours`,
    },
    {
      name: 'Domain peer',
      role: role || 'Pi Member',
      match: 91,
      reason: `Shares goals related to ${goal}`,
    },
    {
      name: 'Opportunity connector',
      role: 'Operator',
      match: 88,
      reason: `Active in communities tied to ${interest}`,
    },
  ]

  const communities = [
    {
      name: `${interest} Circle`,
      members: 'Growing',
      icon: '✨',
      reason: `Matched to your interest in ${interest}`,
    },
    {
      name: 'Builders Network',
      members: 'Active',
      icon: '🌐',
      reason: `Supports your goal to ${goal}`,
    },
  ]

  const opportunities = [
    {
      title: 'Introductions near your goals',
      prize: 'High relevance',
      icon: '🎯',
      reason: `Prioritized because you selected “${goals[0] || 'growth'}”`,
    },
    {
      title: 'Skill-based collaborations',
      prize: 'Open',
      icon: '🤝',
      reason: skills[0] ? `Uses your strength in ${skills[0]}` : 'Based on your role and interests',
    },
  ]

  return { matches, communities, opportunities, summary }
}
