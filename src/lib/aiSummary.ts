import type { Experience, Profile } from './supabase'
import { supabase } from './supabase'
import { rankMatches, scoreOpportunityForUser } from './matching'
import { fetchOpportunities } from './opportunities'

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

export type OnboardingPreview = ReturnType<typeof buildOnboardingPreview> & {
  /** live = network data used; preview = templates only; mixed = some live sections */
  source: 'live' | 'preview' | 'mixed'
}

/**
 * After onboarding save: prefer real matches / communities / opportunities.
 * Falls back to template preview sections when the network is empty.
 */
export async function buildLiveOnboardingPreview(
  me: Profile | null,
  role: string,
  interests: string[],
  goals: string[],
  skills: string[],
): Promise<OnboardingPreview> {
  const base = buildOnboardingPreview(role, interests, goals, skills)
  let usedLive = false
  let usedPreview = false

  const synthetic: Profile = me || {
    id: '00000000-0000-0000-0000-000000000000',
    username: null,
    full_name: null,
    avatar_url: null,
    bio: null,
    role,
    location: null,
    website: null,
    skills,
    interests,
    goals,
    ai_summary: base.summary,
    experience: [],
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    created_at: new Date().toISOString(),
  }

  const profilesQuery = me
    ? supabase.from('profiles').select('*').neq('id', me.id).limit(40)
    : supabase.from('profiles').select('*').limit(40)

  const [profilesRes, communitiesRes, oppsRes] = await Promise.all([
    profilesQuery,
    supabase
      .from('communities')
      .select('id, name, members_count, category, icon')
      .order('members_count', { ascending: false })
      .limit(5),
    fetchOpportunities(),
  ])

  let matches = base.matches
  if (profilesRes.data && profilesRes.data.length > 0) {
    const ranked = rankMatches(synthetic, profilesRes.data as Profile[]).slice(0, 3)
    if (ranked.length) {
      usedLive = true
      matches = ranked.map(m => ({
        name: m.profile.full_name || m.profile.username || 'Pi member',
        role: m.profile.role || 'Member',
        match: m.match,
        reason: m.reasons[0] || 'Ranked from your twin signals',
      }))
    } else {
      usedPreview = true
    }
  } else {
    usedPreview = true
  }

  let communities = base.communities
  if (communitiesRes.data && communitiesRes.data.length > 0) {
    usedLive = true
    communities = communitiesRes.data.slice(0, 3).map(c => ({
      name: c.name,
      members: `${c.members_count ?? 0} members`,
      icon: c.icon || '◎',
      reason: c.category
        ? `Live community · ${c.category}`
        : 'Live community on Pi',
    }))
  } else {
    usedPreview = true
  }

  let opportunities = base.opportunities
  if (oppsRes.items.length > 0) {
    const scored = oppsRes.items
      .map(o => ({ ...o, score: scoreOpportunityForUser(synthetic, o) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    if (scored.length) {
      if (oppsRes.isLive) usedLive = true
      else usedPreview = true
      opportunities = scored.map(o => ({
        title: o.title,
        prize: o.prize,
        icon: '🎯',
        reason: `${oppsRes.isLive ? 'Live catalog' : 'Demo catalog'} · twin fit ${o.score}% · ${o.category}`,
      }))
    }
  } else {
    usedPreview = true
  }

  const source: OnboardingPreview['source'] =
    usedLive && !usedPreview ? 'live' : usedLive && usedPreview ? 'mixed' : 'preview'

  return { matches, communities, opportunities, summary: base.summary, source }
}
