/** Persist guest intent across signup/login so Apply/Connect can finish after auth. */

export type HubResumeAction = 'apply' | 'connect' | 'view'

export type HubResume = {
  path: string
  action: HubResumeAction
  opportunityId: string
  title: string
  ownerId?: string | null
  slug?: string | null
  at: number
}

const KEY = 'pi_hub_resume_v1'
const MAX_AGE_MS = 2 * 60 * 60 * 1000

export function saveHubResume(resume: Omit<HubResume, 'at'>) {
  try {
    const row: HubResume = { ...resume, at: Date.now() }
    sessionStorage.setItem(KEY, JSON.stringify(row))
  } catch {
    /* ignore */
  }
}

export function peekHubResume(): HubResume | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const row = JSON.parse(raw) as HubResume
    if (!row?.path || !row.opportunityId) return null
    if (Date.now() - (row.at || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY)
      return null
    }
    return row
  } catch {
    return null
  }
}

export function clearHubResume() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function consumeHubResumeFor(opportunityId: string): HubResume | null {
  const row = peekHubResume()
  if (!row) return null
  const match =
    row.opportunityId === opportunityId
    || (!!row.slug && row.slug === opportunityId)
    || row.path.includes(opportunityId)
  if (!match) return null
  clearHubResume()
  return row
}

/** Safe internal next path for auth redirects. */
export function authNextHref(path: string, mode: 'signup' | 'login' = 'signup'): string {
  const next = path.startsWith('/') && !path.startsWith('//') ? path : '/opportunities'
  const q = `next=${encodeURIComponent(next)}`
  return mode === 'login' ? `/login?${q}` : `/signup?${q}`
}
