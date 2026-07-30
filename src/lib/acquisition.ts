import { SITE_URL } from './seo'
import { track } from './analytics'

const REF_KEY = 'pi_invite_ref'
const REF_AT_KEY = 'pi_invite_ref_at'

/** Stable invite code from username (or short id). */
export function inviteCodeFromProfile(username?: string | null, userId?: string | null): string {
  const u = (username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (u.length >= 2) return u
  if (userId) return userId.replace(/-/g, '').slice(0, 8)
  return 'pi'
}

export function inviteUrl(code: string): string {
  const c = encodeURIComponent(code.trim())
  return `${SITE_URL}/invite/${c}`
}

export function captureInviteRef(code: string) {
  const clean = code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!clean) return
  try {
    localStorage.setItem(REF_KEY, clean)
    localStorage.setItem(REF_AT_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  track('invite_landing', { ref: clean })
}

export function getStoredInviteRef(): string | null {
  try {
    const ref = localStorage.getItem(REF_KEY)
    const at = Number(localStorage.getItem(REF_AT_KEY) || 0)
    // Expire after 30 days
    if (!ref || !at || Date.now() - at > 30 * 86400000) return null
    return ref
  } catch {
    return null
  }
}

export function clearInviteRef() {
  try {
    localStorage.removeItem(REF_KEY)
    localStorage.removeItem(REF_AT_KEY)
  } catch {
    /* ignore */
  }
}

/** Call after successful signup to attribute acquisition. */
export function trackSignupAttribution() {
  const ref = getStoredInviteRef()
  if (ref) {
    track('signup_attributed', { ref })
    clearInviteRef()
  }
}

export async function shareInviteLink(url: string, title = 'Join me on Pi'): Promise<'shared' | 'copied' | 'failed'> {
  track('invite_share_attempt')
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title,
        text: 'Pi — AI-native opportunity ecosystem. Build your Digital Twin and match with people & opportunities.',
        url,
      })
      track('invite_share', { method: 'native' })
      return 'shared'
    }
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return 'failed'
  }
  try {
    await navigator.clipboard.writeText(url)
    track('invite_share', { method: 'clipboard' })
    return 'copied'
  } catch {
    track('invite_share_failed')
    return 'failed'
  }
}

export const PARTNERSHIP_TYPES = [
  {
    id: 'integration',
    title: 'Product integration',
    detail: 'Connect your stack to Pi’s Twin, matching, or opportunity surfaces.',
  },
  {
    id: 'distribution',
    title: 'Distribution / co-marketing',
    detail: 'Reach builders and professionals together — honest Live vs Demo messaging.',
  },
  {
    id: 'ecosystem',
    title: 'Ecosystem / community',
    detail: 'Hubs, creators, and professional networks that compound inside Pi.',
  },
  {
    id: 'enterprise',
    title: 'Enterprise pilot',
    detail: 'Org workspace concepts — evaluate fit before heavy B2B build-out.',
  },
] as const

export const DISCUSS_CHECKLIST = [
  { label: 'Investor Demo walkthrough', path: '/demo', why: 'Shared product narrative in ~5 minutes' },
  { label: 'Company investor view', path: '/investor', why: 'Vision, Twin, metrics maturity, roadmap' },
  { label: 'Engineering Transparency', path: '/transparency', why: 'Honest Live / Partial / Demo / Soon' },
  { label: 'Traction metrics (signed-in)', path: '/traction', why: 'Activation, retention, intros, growth loops' },
  { label: 'Feature SEO hub', path: '/features', why: 'Discoverable product identity' },
] as const
