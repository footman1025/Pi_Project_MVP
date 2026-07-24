/** Client-side pins & reactions for chat (no DB migration required). */

const REACT_KEY = 'pi_msg_reactions_v1'
const PIN_KEY = 'pi_msg_pins_v1'

type ReactionMap = Record<string, string[]> // messageId -> emojis (unique, latest first)
type PinMap = Record<string, string> // chatKey (sorted user ids) -> messageId

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota */ }
}

export function chatKey(a: string, b: string) {
  return [a, b].sort().join(':')
}

export function getReactions(messageId: string): string[] {
  return readJson<ReactionMap>(REACT_KEY, {})[messageId] || []
}

export function toggleReaction(messageId: string, emoji: string): string[] {
  const all = readJson<ReactionMap>(REACT_KEY, {})
  const cur = all[messageId] || []
  const next = cur.includes(emoji) ? cur.filter(e => e !== emoji) : [emoji, ...cur.filter(e => e !== emoji)].slice(0, 6)
  all[messageId] = next
  writeJson(REACT_KEY, all)
  return next
}

export function getPinnedMessageId(userA: string, userB: string): string | null {
  return readJson<PinMap>(PIN_KEY, {})[chatKey(userA, userB)] || null
}

export function setPinnedMessageId(userA: string, userB: string, messageId: string | null) {
  const all = readJson<PinMap>(PIN_KEY, {})
  const key = chatKey(userA, userB)
  if (!messageId) delete all[key]
  else all[key] = messageId
  writeJson(PIN_KEY, all)
}
