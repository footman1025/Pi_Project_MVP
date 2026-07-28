/** Safe external / profile URL helpers (LinkedIn shares, website fields, etc.) */

export function normalizeWebsite(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  // Strip common tracking wrappers / whitespace / trailing punctuation from pasted links
  let cleaned = v
    .replace(/^<|>$/g, '')
    .replace(/[.,;:!?)]+$/g, '')
    .trim()
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  // linkedin.com/in/... or www.linkedin.com/...
  if (/^(www\.)?linkedin\.com\//i.test(cleaned)) return `https://${cleaned.replace(/^www\./i, 'www.')}`
  if (/^linkedin\.com\//i.test(cleaned)) return `https://www.${cleaned}`
  return `https://${cleaned}`
}

export function isValidWebsite(raw: string): boolean {
  const v = raw.trim()
  if (!v) return true
  try {
    const u = new URL(normalizeWebsite(v))
    return !!u.hostname && u.hostname.includes('.')
  } catch {
    return false
  }
}

/** href-safe absolute URL for profile website / LinkedIn / personal site */
export function externalHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const href = normalizeWebsite(raw)
    const u = new URL(href)
    if (!/^https?:$/i.test(u.protocol)) return null
    return u.toString()
  } catch {
    return null
  }
}

export function profilePath(username: string | null | undefined): string | null {
  const u = username?.trim()
  if (!u) return null
  return `/p/${encodeURIComponent(u)}`
}

export function absoluteProfileUrl(username: string | null | undefined): string | null {
  const path = profilePath(username)
  if (!path || typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
