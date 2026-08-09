import { supabase } from './supabase'
import { sendPushToUser } from './pushNotifications'
import { sendEmailToUser } from './emailNotifications'

export type NotifType = 'like' | 'comment' | 'follow' | 'message' | 'ai_match' | 'ai_opportunity'

type NotifyInput = {
  userId: string
  actorId: string
  type: NotifType
  postId?: string | null
  message: string
  /** Deep link for push tap */
  path?: string
  title?: string
}

/** How far back to treat an identical event as a duplicate (not a new alert). */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000

/** Session guard — same event must not push twice from parallel client + trigger paths. */
const fannedThisSession = new Set<string>()

function eventKey(input: {
  userId: string
  actorId: string
  type: NotifType
  postId?: string | null
  message: string
}) {
  const post = input.postId || ''
  const msg = input.type === 'ai_opportunity' || input.type === 'message' ? input.message : ''
  return `${input.userId}|${input.type}|${input.actorId}|${post}|${msg}`
}

function defaultPath(type: NotifType, actorId: string, _postId?: string | null) {
  if (type === 'message') return `/messages?u=${actorId}`
  if (type === 'follow') return '/notifications'
  if (type === 'like' || type === 'comment') return '/feed'
  if (type === 'ai_match') return '/match'
  if (type === 'ai_opportunity') return '/opportunities'
  return '/notifications'
}

function defaultTitle(type: NotifType) {
  switch (type) {
    case 'message':
      return 'New message on Pi'
    case 'follow':
      return 'New follower on Pi'
    case 'like':
      return 'New like on Pi'
    case 'comment':
      return 'New comment on Pi'
    case 'ai_match':
      return 'Pi Intelligence'
    case 'ai_opportunity':
      return 'Pi Opportunity'
    default:
      return 'Pi notification'
  }
}

function pushTagFor(type: NotifType, id: string, actorId: string) {
  // Stable tags so OS replaces, never stacks duplicates of the same event.
  if (type === 'message') return `pi-msg-${actorId}`
  if (type === 'follow') return `pi-follow-${actorId}`
  if (type === 'like') return `pi-like-${id}`
  if (type === 'comment') return `pi-comment-${id}`
  if (type === 'ai_match') return 'pi-ai-match'
  if (type === 'ai_opportunity') return 'pi-ai-opp'
  return `pi-notif-${id}`
}

/** One unread message row per sender — refresh text and delete extras. */
async function coalesceUnreadMessage(input: {
  userId: string
  actorId: string
  message: string
}): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', input.userId)
    .eq('actor_id', input.actorId)
    .eq('type', 'message')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const rows = data || []
  if (!rows.length) return null

  const keepId = rows[0].id as string
  const dropIds = rows.slice(1).map(r => r.id as string)

  await supabase
    .from('notifications')
    .update({ message: input.message, is_read: false })
    .eq('id', keepId)

  if (dropIds.length) {
    await supabase.from('notifications').delete().in('id', dropIds)
  }

  return { id: keepId }
}

/** If trigger + client both wrote the same event, keep one row. */
async function collapseRecentDuplicates(input: {
  userId: string
  actorId: string
  type: NotifType
  postId?: string | null
  message: string
}): Promise<{ id: string } | null> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
  let q = supabase
    .from('notifications')
    .select('id')
    .eq('user_id', input.userId)
    .eq('actor_id', input.actorId)
    .eq('type', input.type)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  if (input.postId) q = q.eq('post_id', input.postId)
  else q = q.is('post_id', null)
  if (input.type === 'ai_opportunity') q = q.eq('message', input.message)

  const { data } = await q
  const rows = data || []
  if (!rows.length) return null

  const keepId = rows[0].id as string
  const dropIds = rows.slice(1).map(r => r.id as string)
  if (dropIds.length) {
    await supabase.from('notifications').delete().in('id', dropIds)
  }
  return { id: keepId }
}

async function fanOut(input: {
  userId: string
  notifId: string
  type: NotifType
  actorId: string
  message: string
  path?: string
  title?: string
  postId?: string | null
}) {
  const deepLink = input.path || defaultPath(input.type, input.actorId, input.postId)
  const notifTitle = input.title || defaultTitle(input.type)
  const tag = pushTagFor(input.type, input.notifId, input.actorId)

  await Promise.allSettled([
    sendPushToUser({
      userId: input.userId,
      title: notifTitle,
      body: input.message,
      path: deepLink,
      tag,
    }),
    sendEmailToUser({
      userId: input.userId,
      title: notifTitle,
      body: input.message,
      path: deepLink,
    }),
  ])
}

/**
 * Create an in-app notification + Web Push + email if opted in.
 * Dedupes against DB triggers / retries / rapid re-fires so the same event
 * never creates two rows or two alerts.
 */
export async function createNotification({
  userId,
  actorId,
  type,
  postId = null,
  message,
  path,
  title,
}: NotifyInput) {
  if (!userId || !actorId) return
  if (userId === actorId && type !== 'ai_opportunity' && type !== 'ai_match') return

  // Messages: allow a new OS bump per send, but still one unread in-app row
  const key = eventKey({ userId, actorId, type, postId, message })
  if (type !== 'message') {
    if (fannedThisSession.has(key)) return
    fannedThisSession.add(key)
  }

  try {
    if (type === 'message') {
      const coalesced = await coalesceUnreadMessage({ userId, actorId, message })
      if (coalesced) {
        await fanOut({
          userId,
          notifId: coalesced.id,
          type,
          actorId,
          message,
          path,
          title,
          postId,
        })
        return
      }
    }

    // Collapse any rows already written by a DB trigger (or a raced client insert)
    const existing = await collapseRecentDuplicates({ userId, actorId, type, postId, message })
    if (existing) {
      await fanOut({
        userId,
        notifId: existing.id,
        type,
        actorId,
        message,
        path,
        title,
        postId,
      })
      return
    }

    // Do not retry inserts — a successful insert with a failed response would create doubles
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        actor_id: actorId,
        type,
        post_id: postId,
        message,
      })
      .select('id')
      .maybeSingle()

    if (error) {
      const raced = await collapseRecentDuplicates({ userId, actorId, type, postId, message })
      if (raced) {
        await fanOut({
          userId,
          notifId: raced.id,
          type,
          actorId,
          message,
          path,
          title,
          postId,
        })
        return
      }
      console.warn('[notify] insert failed', error.message)
      return
    }

    if (!data?.id) return

    // Final pass in case trigger wrote a twin in the same tick
    const kept = await collapseRecentDuplicates({ userId, actorId, type, postId, message })
    await fanOut({
      userId,
      notifId: kept?.id || data.id,
      type,
      actorId,
      message,
      path,
      title,
      postId,
    })
  } catch (err) {
    console.warn('[notify] failed', err instanceof Error ? err.message : err)
  }
}

export async function notifyPostAuthorOfLike(
  postId: string,
  actorId: string,
  actorName: string,
) {
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()
  if (!post) return
  await createNotification({
    userId: post.author_id,
    actorId,
    type: 'like',
    postId,
    message: `${actorName} liked your post`,
    path: '/feed',
  })
}

export async function notifyPostAuthorOfComment(
  postId: string,
  actorId: string,
  actorName: string,
) {
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()
  if (!post) return
  await createNotification({
    userId: post.author_id,
    actorId,
    type: 'comment',
    postId,
    message: `${actorName} commented on your post`,
    path: '/feed',
  })
}

export async function notifyUserOfFollow(userId: string, actorId: string, actorName: string) {
  await createNotification({
    userId,
    actorId,
    type: 'follow',
    message: `${actorName} started following you`,
    path: '/notifications',
  })
}

export async function notifyUserOfMessage(
  receiverId: string,
  actorId: string,
  actorName: string,
) {
  await createNotification({
    userId: receiverId,
    actorId,
    type: 'message',
    message: `${actorName} sent you a message`,
    path: `/messages?u=${actorId}`,
  })
}

/** Notify opportunity owner when someone marks interest or applies. */
export async function notifyOpportunityOwnerOfInterest(input: {
  ownerId: string
  actorId: string
  actorName: string
  opportunityTitle: string
  status: 'interested' | 'applied'
  opportunityId?: string
  slug?: string | null
}) {
  if (!input.ownerId || input.ownerId === input.actorId) return
  const verb = input.status === 'applied' ? 'applied to' : 'is interested in'
  const path = input.slug
    ? `/o/${encodeURIComponent(input.slug)}`
    : '/opportunities'
  await createNotification({
    userId: input.ownerId,
    actorId: input.actorId,
    type: 'ai_opportunity',
    message: `${input.actorName} ${verb} “${input.opportunityTitle.slice(0, 80)}”`,
    path,
    title: input.status === 'applied' ? 'New apply on Pi' : 'New interest on Pi',
  })
}

/** Notify applicant when the owner sets a loop outcome. */
export async function notifyApplicantOfOutcome(input: {
  applicantId: string
  ownerId: string
  ownerName: string
  opportunityTitle: string
  outcome: 'connected' | 'hired' | 'passed' | 'closed'
  slug?: string | null
}) {
  if (!input.applicantId || input.applicantId === input.ownerId) return
  const label =
    input.outcome === 'connected' ? 'marked you as connected on'
      : input.outcome === 'hired' ? 'marked an outcome (hired / selected) on'
        : input.outcome === 'passed' ? 'passed on your application for'
          : 'closed'
  const path = input.slug
    ? `/o/${encodeURIComponent(input.slug)}`
    : '/opportunities'
  await createNotification({
    userId: input.applicantId,
    actorId: input.ownerId,
    type: 'ai_opportunity',
    message: `${input.ownerName} ${label} “${input.opportunityTitle.slice(0, 80)}”`,
    path,
    title: 'Opportunity update on Pi',
  })
}
