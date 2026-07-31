import type { Post, Profile } from './supabase'

/** Pi Social streams — long-term five + All / For you */
export type FeedStream =
  | 'all'
  | 'knowledge'
  | 'people'
  | 'opportunities'
  | 'communities'
  | 'foryou'

export const FEED_STREAMS: { id: FeedStream; label: string; hint: string }[] = [
  { id: 'all', label: 'All', hint: 'Chronological opportunity network' },
  { id: 'knowledge', label: 'Knowledge', hint: 'Insights, lessons, expertise' },
  { id: 'people', label: 'People', hint: 'Intros, collaboration asks' },
  { id: 'opportunities', label: 'Opportunities', hint: 'Roles, funding, projects' },
  { id: 'communities', label: 'Communities', hint: 'Hubs and group energy' },
  { id: 'foryou', label: 'For you', hint: 'Twin-aware ranking' },
]

export type PostStreamTag = 'knowledge' | 'people' | 'opportunities' | 'communities'

const STREAM_PREFIX = /^\[(knowledge|people|opportunities|communities)\]\s*/i

export function stripStreamPrefix(content: string): string {
  return (content || '').replace(STREAM_PREFIX, '').trimStart()
}

export function withStreamPrefix(stream: PostStreamTag, content: string): string {
  const body = stripStreamPrefix(content)
  return `[${stream}] ${body}`.trim()
}

export function parseStreamTag(content: string): PostStreamTag | null {
  const m = (content || '').match(STREAM_PREFIX)
  return m ? (m[1].toLowerCase() as PostStreamTag) : null
}

const KW: Record<PostStreamTag, RegExp> = {
  knowledge: /\b(learn|lesson|tip|insight|how to|tutorial|guide|knowledge|research|book|course)\b/i,
  people: /\b(looking for|intro|meet|co-?founder|collaborat|hire me|connect|mentor|partner with)\b/i,
  opportunities: /\b(hiring|job|role|fund|invest|grant|opportunity|freelance|open role|raising)\b/i,
  communities: /\b(community|join us|meetup|event|club|group|hub)\b/i,
}

function postStreamColumn(post: Post): PostStreamTag | null {
  const s = post.stream
  if (s === 'knowledge' || s === 'people' || s === 'opportunities' || s === 'communities') return s
  return null
}

export function classifyPostStream(post: Post): PostStreamTag {
  const col = postStreamColumn(post)
  if (col) return col
  const tagged = parseStreamTag(post.content || '')
  if (tagged) return tagged
  const text = `${post.content || ''} ${post.profiles?.role || ''} ${post.profiles?.bio || ''}`
  for (const key of ['opportunities', 'people', 'communities', 'knowledge'] as PostStreamTag[]) {
    if (KW[key].test(text)) return key
  }
  if (post.profiles?.role && /founder|investor|creator|engineer|designer/i.test(post.profiles.role)) {
    return 'people'
  }
  return 'knowledge'
}

export type ReputationBreakdown = {
  score: number
  twinReady: number
  activity: number
  network: number
  label: string
}

/** Transparent reputation — not vanity followers alone */
export function reputationBreakdown(profile?: Profile | null): ReputationBreakdown {
  if (!profile) {
    return { score: 40, twinReady: 0, activity: 20, network: 20, label: 'Building trust' }
  }
  const posts = profile.posts_count || 0
  const followers = profile.followers_count || 0
  const skills = profile.skills?.length || 0
  const goals = profile.goals?.length || 0
  const interests = profile.interests?.length || 0
  const hasSummary = !!(profile.ai_summary && profile.ai_summary.trim())
  const twinReady = Math.min(35, skills * 3 + goals * 3 + interests + (hasSummary ? 8 : 0))
  const activity = Math.min(30, posts * 3)
  const network = Math.min(25, Math.floor(followers * 1.5) + (profile.bio ? 4 : 0))
  const score = Math.min(98, 20 + twinReady + activity + network)
  const label =
    score >= 75 ? 'High trust signal' : score >= 55 ? 'Growing trust' : 'Building trust'
  return { score, twinReady, activity, network, label }
}

export function reputationScore(profile?: Profile | null): number {
  return reputationBreakdown(profile).score
}

/** Twin-aware “why this post” reasons (Truth Guarantee — explainable) */
export function whyPostReasons(post: Post, me: Profile | null): string[] {
  const stream = classifyPostStream(post)
  const reasons: string[] = []
  const content = stripStreamPrefix(post.content || '').toLowerCase()
  const authorRole = post.profiles?.role || 'Member'
  const rep = reputationBreakdown(post.profiles)

  reasons.push(`Stream: ${stream} — opportunity network, not an attention feed.`)
  reasons.push(`${authorRole} · reputation ${rep.score} (${rep.label}).`)

  if (!me) {
    reasons.push('Sign in and complete your Twin for personalized fit reasons.')
    return reasons.slice(0, 4)
  }

  const skills = (me.skills || []).map(s => s.toLowerCase())
  const interests = (me.interests || []).map(s => s.toLowerCase())
  const goals = (me.goals || []).map(s => s.toLowerCase())
  const bag = [...skills, ...interests, ...goals]

  const hits = bag.filter(w => w.length > 2 && content.includes(w)).slice(0, 3)
  if (hits.length) {
    reasons.push(`Overlaps your Twin signals: ${hits.join(', ')}.`)
  } else if (me.role && content.includes(me.role.toLowerCase().split(/\s+/)[0])) {
    reasons.push(`Related to your role (${me.role}).`)
  }

  if (stream === 'opportunities' && goals.some(g => /hire|job|fund|invest|opportun/i.test(g))) {
    reasons.push('Matches your opportunity-seeking goals.')
  }
  if (stream === 'people' && goals.some(g => /co-?founder|mentor|collaborat|network/i.test(g))) {
    reasons.push('Aligned with your people / collaboration goals.')
  }
  if (stream === 'knowledge' && interests.length) {
    reasons.push('Knowledge stream can sharpen skills tied to your interests.')
  }
  if (forYouScore(post, me) >= 40) {
    reasons.push('Ranks highly in your For you graph right now.')
  }

  return reasons.slice(0, 5)
}

export type OppAction = {
  id: string
  label: string
  to: string
  kind: 'primary' | 'secondary'
}

export function opportunityActions(post: Post): OppAction[] {
  const stream = classifyPostStream(post)
  const authorId = post.author_id
  const username = post.profiles?.username
  const profilePath = username ? `/p/${username}` : '/match'
  const msg = `/messages?u=${authorId}`

  if (stream === 'opportunities') {
    return [
      { id: 'hire', label: 'Hire / apply path', to: '/opportunities', kind: 'primary' },
      { id: 'invest', label: 'Invest / fund', to: '/opportunities', kind: 'secondary' },
      { id: 'msg', label: 'Message', to: msg, kind: 'secondary' },
    ]
  }
  if (stream === 'people') {
    return [
      { id: 'collab', label: 'Collaborate', to: msg, kind: 'primary' },
      { id: 'mentor', label: 'Mentor / advise', to: profilePath, kind: 'secondary' },
      { id: 'match', label: 'View match graph', to: '/match', kind: 'secondary' },
    ]
  }
  if (stream === 'communities') {
    return [
      { id: 'hubs', label: 'Open hubs', to: '/communities', kind: 'primary' },
      { id: 'msg', label: 'Message', to: msg, kind: 'secondary' },
    ]
  }
  return [
    { id: 'learn', label: 'Related hubs', to: '/communities', kind: 'primary' },
    { id: 'twin', label: 'Strengthen Twin', to: '/twin', kind: 'secondary' },
    { id: 'msg', label: 'Message', to: msg, kind: 'secondary' },
  ]
}

export function forYouScore(post: Post, me: Profile | null): number {
  const stream = classifyPostStream(post)
  let score = 10
  const ageH = (Date.now() - new Date(post.created_at).getTime()) / 36e5
  score += Math.max(0, 24 - ageH)
  score += Math.min(20, (post.likes_count || 0) * 2 + (post.comments_count || 0) * 3)
  score += reputationScore(post.profiles) * 0.15

  if (!me) return score + (stream === 'opportunities' ? 5 : 0)

  const bag = [
    ...(me.skills || []),
    ...(me.interests || []),
    ...(me.goals || []),
    me.role || '',
  ].join(' ').toLowerCase()

  const content = (post.content || '').toLowerCase()
  const words = bag.split(/[^a-z0-9+#]+/).filter(w => w.length > 3)
  let hits = 0
  for (const w of words.slice(0, 40)) {
    if (content.includes(w)) hits += 1
  }
  score += Math.min(35, hits * 4)

  if (stream === 'opportunities' && /hire|job|fund|role|invest/i.test(bag + content)) score += 8
  if (stream === 'people' && /co-?founder|mentor|collaborat/i.test(bag + content)) score += 8
  return score
}

export function filterAndSortPosts(
  posts: Post[],
  stream: FeedStream,
  me: Profile | null,
): Post[] {
  if (stream === 'all') return posts
  if (stream === 'foryou') {
    return [...posts].sort((a, b) => forYouScore(b, me) - forYouScore(a, me))
  }
  return posts.filter(p => classifyPostStream(p) === stream)
}
