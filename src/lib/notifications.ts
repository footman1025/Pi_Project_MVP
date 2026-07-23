import { supabase } from './supabase'

type NotifyInput = {
  userId: string
  actorId: string
  type: 'like' | 'comment' | 'follow' | 'message'
  postId?: string | null
  message: string
}

/** Create an in-app notification (no-op if actor is notifying themselves). */
export async function createNotification({
  userId,
  actorId,
  type,
  postId = null,
  message,
}: NotifyInput) {
  if (!userId || !actorId || userId === actorId) return
  await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: actorId,
    type,
    post_id: postId,
    message,
  })
}

export async function notifyPostAuthorOfLike(
  postId: string,
  actorId: string,
  actorName: string
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
  })
}

export async function notifyPostAuthorOfComment(
  postId: string,
  actorId: string,
  actorName: string
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
  })
}

export async function notifyUserOfFollow(userId: string, actorId: string, actorName: string) {
  await createNotification({
    userId,
    actorId,
    type: 'follow',
    message: `${actorName} started following you`,
  })
}

export async function notifyUserOfMessage(
  receiverId: string,
  actorId: string,
  actorName: string
) {
  await createNotification({
    userId: receiverId,
    actorId,
    type: 'message',
    message: `${actorName} sent you a message`,
  })
}
