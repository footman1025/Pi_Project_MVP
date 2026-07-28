import { supabase } from './supabase'

type Props = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    __piAnalytics?: { track: (event: string, props?: Props) => void }
    gtag?: (...args: unknown[]) => void
  }
}

const SESSION_KEY = 'pi_session_id'
const EVENTS_KEY = 'pi_events'
const LAST_ACTIVE_KEY = 'pi_last_active_day'

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return `s_anon_${Date.now()}`
  }
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Lightweight analytics — local buffer + persist to Supabase when signed in */
export function track(event: string, props?: Props) {
  const path = typeof location !== 'undefined' ? location.pathname : undefined
  const payload = { event, ...props, path, ts: Date.now(), session_id: sessionId() }

  try {
    if (typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.hostname)) {
      // eslint-disable-next-line no-console
      console.debug('[pi:analytics]', payload)
    }
    window.__piAnalytics?.track(event, props)
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, props || {})
    }
    const prev = sessionStorage.getItem(EVENTS_KEY)
    const list = prev ? (JSON.parse(prev) as unknown[]) : []
    list.push(payload)
    sessionStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(-200)))
  } catch {
    /* ignore storage failures */
  }

  void persistEvent(event, props, path)
}

async function persistEvent(event: string, props?: Props, path?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const cleanProps: Record<string, string | number | boolean | null> = {}
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined) continue
        cleanProps[k] = v
      }
    }

    await supabase.from('product_events').insert({
      user_id: session.user.id,
      session_id: sessionId(),
      event,
      props: cleanProps,
      path: path || null,
    })
  } catch {
    /* table may not exist yet — fail silently */
  }
}

export function trackPageView(path: string) {
  track('page_view', { path })
  try {
    const today = dayKey()
    const prev = localStorage.getItem(LAST_ACTIVE_KEY)
    if (prev !== today) {
      localStorage.setItem(LAST_ACTIVE_KEY, today)
      track('session_day', { day: today, returning: !!prev })
    }
  } catch {
    /* ignore */
  }
}

export function getAnalyticsSessionId() {
  return sessionId()
}
