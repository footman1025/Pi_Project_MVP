/** Stable distinct gradient colors for user avatars (by id or name). */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #14b8a6, #0d9488)', // teal
  'linear-gradient(135deg, #6366f1, #4f46e5)', // indigo
  'linear-gradient(135deg, #ec4899, #db2777)', // pink
  'linear-gradient(135deg, #f59e0b, #d97706)', // amber
  'linear-gradient(135deg, #06b6d4, #0891b2)', // cyan
  'linear-gradient(135deg, #8b5cf6, #7c3aed)', // violet
  'linear-gradient(135deg, #10b981, #059669)', // emerald
  'linear-gradient(135deg, #f43f5e, #e11d48)', // rose
  'linear-gradient(135deg, #3b82f6, #2563eb)', // blue
  'linear-gradient(135deg, #ff7a45, #e85d2a)', // coral
  'linear-gradient(135deg, #84cc16, #65a30d)', // lime
  'linear-gradient(135deg, #a855f7, #9333ea)', // purple
]

function hashKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return h
}

/** Returns a CSS background gradient unique to this person (stable across renders). */
export function avatarGradient(idOrName: string | null | undefined): string {
  const key = (idOrName || '?').trim() || '?'
  return AVATAR_GRADIENTS[hashKey(key) % AVATAR_GRADIENTS.length]
}

export function avatarInitial(name: string | null | undefined): string {
  return (name?.trim().charAt(0) || '?').toUpperCase()
}
