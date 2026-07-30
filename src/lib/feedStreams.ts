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

export function classifyPostStream(post: Post): PostStreamTag {
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

/** Simple reputation proxy — not vanity followers alone */
export function reputationScore(profile?: Profile | null): number {
  if (!profile) return 40
  const posts = profile.posts_count || 0
  const followers = profile.followers_count || 0
  const skills = profile.skills?.length || 0
  const goals = profile.goals?.length || 0
  const twinReady = (skills + goals) > 0 ? 18 : 0
  const raw = Math.min(98, 35 + twinReady + Math.min(25, posts * 2) + Math.min(20, Math.floor(followers / 2)))
  return raw
}

export function forYouScore(post: Post, me: Profile | null): number {
  const stream = classifyPostStream(post)
  let score = 10
  const ageH = (Date.now() - new Date(post.created_at).getTime()) / 36e5
  score += Math.max(0, 24 - ageH) // fresher posts
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
