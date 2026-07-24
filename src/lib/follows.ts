import { supabase } from './supabase'

/** Live follower / following counts from the follows table (source of truth). */
export async function getFollowCounts(profileId: string) {
  const [followers, following] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profileId),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ])
  return {
    followers_count: followers.count ?? 0,
    following_count: following.count ?? 0,
  }
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return !!data
}

/** Ensure the signed-in user has a profiles row (required by follows FK). */
export async function ensureFollowerProfile(userId: string, fallbackName?: string) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (existing) return

  const fullName = fallbackName || 'Pi Member'
  const username =
    String(fullName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') ||
    `user_${userId.slice(0, 8)}`

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    username,
  })
  // Ignore race if trigger already created the profile
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw new Error(error.message)
  }
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('You cannot follow yourself.')

  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  })

  if (error) {
    // Already following — treat as success
    if (/duplicate|unique/i.test(error.message)) return
    if (/row-level security|permission|policy/i.test(error.message)) {
      throw new Error(
        'Follow was blocked by database permissions. In Supabase SQL Editor, run supabase_follows_fix.sql.',
      )
    }
    if (/foreign key|violates/i.test(error.message)) {
      throw new Error('Follow failed: profile is missing. Try signing out and back in.')
    }
    throw new Error(error.message)
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) {
    if (/row-level security|permission|policy/i.test(error.message)) {
      throw new Error(
        'Unfollow was blocked by database permissions. In Supabase SQL Editor, run supabase_follows_fix.sql.',
      )
    }
    throw new Error(error.message)
  }
}
