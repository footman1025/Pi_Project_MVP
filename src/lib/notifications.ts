import { supabase } from './supabase'
import { sendPushToUser } from './pushNotifications'
import { sendEmailToUser } from './emailNotifications'
import { withRetry } from './messagingReliability'

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

/** Create an in-app notification + Web Push (cellphone) + email if opted in. */
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

  let data: { id: string } | null = null
  try {
    data = await withRetry(async () => {
      const { data: row, error } = await supabase
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
      if (error) throw new Error(error.message)
      return row
    }, { attempts: 2, baseMs: 350, label: 'Notification insert failed' })
  } catch (err) {
    console.warn('[notify] insert failed', err instanceof Error ? err.message : err)
    return
  }

  if (!data?.id) return

  const deepLink = path || defaultPath(type, actorId, postId)
  const notifTitle = title || defaultTitle(type)
  const pushTag =
    type === 'ai_match'
      ? 'pi-ai-match'
      : type === 'ai_opportunity'
        ? 'pi-ai-opp'
        : `pi-notif-${data.id}`

  // Fan-out is best-effort — in-app row already saved
  await Promise.allSettled([
    sendPushToUser({
      userId,
      title: notifTitle,
      body: message,
      path: deepLink,
      tag: pushTag,
    }),
    sendEmailToUser({
      userId,
      title: notifTitle,
      body: message,
      path: deepLink,
    }),
  ])
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
    : input.opportunityId
      ? `/opportunities`
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
