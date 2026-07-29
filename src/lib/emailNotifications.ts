import { supabase } from './supabase'

/** Deliver email alert if the recipient opted in (Resend on server). */
export async function sendEmailToUser(opts: {
  userId: string
  title: string
  body: string
  path?: string
}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) return

    await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(opts),
    })
  } catch {
    /* non-blocking */
  }
}

export type NotificationPrefs = {
  email_enabled: boolean
  email: string | null
  push_enabled: boolean
}

export async function fetchNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('email_enabled, email, push_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    email_enabled: !!data?.email_enabled,
    email: data?.email ?? null,
    push_enabled: data?.push_enabled !== false,
  }
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: Partial<NotificationPrefs>,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('notification_preferences').upsert(
    {
      user_id: userId,
      email_enabled: prefs.email_enabled ?? false,
      email: prefs.email?.trim() || null,
      push_enabled: prefs.push_enabled ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    return {
      error: error.message.includes('does not exist')
        ? 'Run supabase_notification_preferences.sql in Supabase first.'
        : error.message,
    }
  }
  return {}
}
