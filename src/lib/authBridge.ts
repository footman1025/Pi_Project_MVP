/**
 * Lightweight auth snapshot for non-React code (analytics, etc.)
 * Avoids calling supabase.auth.getSession() which can trigger refresh storms / 429s.
 */
let userId: string | null = null
let accessToken: string | null = null

export function setAuthBridge(next: { userId: string | null; accessToken: string | null }) {
  userId = next.userId
  accessToken = next.accessToken
}

export function getAuthUserId() {
  return userId
}

export function getAuthAccessToken() {
  return accessToken
}
