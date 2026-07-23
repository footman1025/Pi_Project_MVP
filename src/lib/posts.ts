import { supabase, Post, Profile } from './supabase'

export type AuthorLite = Pick<Profile, 'id' | 'full_name' | 'username' | 'role' | 'avatar_url'>

/** Prefer full name, then @username nickname. */
export function displayName(
  person?: { full_name?: string | null; username?: string | null } | null,
  fallback = 'Member'
): string {
  const name = person?.full_name?.trim()
  if (name) return name
  const nick = person?.username?.trim()
  if (nick) return nick.startsWith('@') ? nick : `@${nick}`
  return fallback
}

/** Attach author profiles when embed join is missing or empty. */
export async function enrichPostsWithAuthors(posts: Post[]): Promise<Post[]> {
  if (!posts.length) return posts

  const missingIds = [
    ...new Set(
      posts
        .filter(p => !p.profiles?.full_name && !p.profiles?.username)
        .map(p => p.author_id)
        .filter(Boolean)
    ),
  ]

  if (!missingIds.length) return posts

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, role, avatar_url')
    .in('id', missingIds)

  const map = new Map((data || []).map(p => [p.id, p as AuthorLite]))

  return posts.map(p => {
    if (p.profiles?.full_name || p.profiles?.username) return p
    const author = map.get(p.author_id)
    if (!author) return p
    return { ...p, profiles: { ...(p.profiles as Profile), ...author } as Profile }
  })
}

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30)
}
