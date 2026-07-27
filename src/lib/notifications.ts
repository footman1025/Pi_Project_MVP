import { supabase } from './supabase'
import { sendPushToUser } from './pushNotifications'

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

function defaultPath(type: NotifType, actorId: string, postId?: string | null) {
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

/** Create an in-app notification + deliver Web Push when possible. */
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

  const { data } = await supabase
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

  const deepLink = path || defaultPath(type, actorId, postId)
  await sendPushToUser({
    userId,
    title: title || defaultTitle(type),
    body: message,
    path: deepLink,
    tag: data?.id ? `pi-notif-${data.id}` : `pi-${type}-${Date.now()}`,
  })
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
