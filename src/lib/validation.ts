export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password should include letters and numbers.'
  }
  return null
}

export function normalizeWebsite(raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  return `https://${v}`
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
