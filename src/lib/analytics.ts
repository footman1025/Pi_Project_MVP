type Props = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    __piAnalytics?: { track: (event: string, props?: Props) => void }
    gtag?: (...args: unknown[]) => void
  }
}

/** Lightweight analytics — console in DEV, optional window.__piAnalytics / gtag hooks later */
export function track(event: string, props?: Props) {
  const payload = { event, ...props, ts: Date.now() }
  try {
    if (typeof location !== 'undefined' && /localhost|127\.0\.0\.1/.test(location.hostname)) {
      // eslint-disable-next-line no-console
      console.debug('[pi:analytics]', payload)
    }
    window.__piAnalytics?.track(event, props)
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, props || {})
    }
    const prev = sessionStorage.getItem('pi_events')
    const list = prev ? (JSON.parse(prev) as unknown[]) : []
    list.push(payload)
    sessionStorage.setItem('pi_events', JSON.stringify(list.slice(-200)))
  } catch {
    /* ignore storage / analytics failures */
  }
}

export function trackPageView(path: string) {
  track('page_view', { path })
}
