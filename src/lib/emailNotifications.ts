import { supabase } from './supabase'
import { friendlyNetworkError, isOnline, withRetry } from './messagingReliability'

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

    const res = await fetch('/api/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(opts),
    })
    if (!res.ok) {
      console.warn('[email] delivery failed', res.status)
    }
  } catch {
    /* non-blocking */
  }
}

export type NotificationPrefs = {
  email_enabled: boolean
  email: string | null
  push_enabled: boolean
}

export async function fetchNotificationPrefs(
  userId: string,
): Promise<{ prefs: NotificationPrefs; error?: string }> {
  const defaults: NotificationPrefs = {
    email_enabled: false,
    email: null,
    push_enabled: true,
  }
  try {
    const data = await withRetry(async () => {
      const { data: row, error } = await supabase
        .from('notification_preferences')
        .select('email_enabled, email, push_enabled')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return row
    }, { attempts: 2, baseMs: 350, label: 'Could not load notification prefs' })

    return {
      prefs: {
        email_enabled: !!data?.email_enabled,
        email: data?.email ?? null,
        push_enabled: data?.push_enabled !== false,
      },
    }
  } catch (err) {
    return {
      prefs: defaults,
      error: friendlyNetworkError(err, 'Could not load notification preferences'),
    }
  }
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: Partial<NotificationPrefs>,
): Promise<{ error?: string }> {
  if (!isOnline()) {
    return { error: 'You’re offline. Reconnect, then try again.' }
  }
  try {
    await withRetry(async () => {
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
        if (error.message.includes('does not exist')) {
          throw new Error('Run supabase_notification_preferences.sql in Supabase first.')
        }
        throw new Error(error.message)
      }
    }, { attempts: 2, baseMs: 400, label: 'Could not save preferences' })
    return {}
  } catch (err) {
    return { error: friendlyNetworkError(err, 'Could not save preferences') }
  }
}
