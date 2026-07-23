/** Reply metadata embedded in message content (no DB migration required). */

export type ReplyMeta = {
  id: string
  author: string
  preview: string
}

const PREFIX = '[[reply:'
const SUFFIX = ']]\n'

export function encodeReply(meta: ReplyMeta, body: string) {
  return `${PREFIX}${JSON.stringify(meta)}${SUFFIX}${body}`
}

export function parseReply(content: string): { meta: ReplyMeta; body: string } | null {
  if (!content.startsWith(PREFIX)) return null
  const end = content.indexOf(SUFFIX)
  if (end === -1) return null
  try {
    const raw = content.slice(PREFIX.length, end)
    const meta = JSON.parse(raw) as ReplyMeta
    if (!meta?.id || typeof meta.preview !== 'string') return null
    return { meta, body: content.slice(end + SUFFIX.length) }
  } catch {
    return null
  }
}

/** Plain text suitable for clipboard / reply preview */
export function getMessagePlainText(content: string): string {
  const replied = parseReply(content)
  const body = replied?.body ?? content

  const sticker = body.match(/^\[\[sticker:(.+)\]\]$/u)
  if (sticker) return sticker[1]

  if (body.startsWith('[[file:') && body.endsWith(']]')) {
    try {
      const file = JSON.parse(body.slice('[[file:'.length, -2)) as { name?: string }
      return file?.name ? `📎 ${file.name}` : '📎 Attachment'
    } catch {
      return '📎 Attachment'
    }
  }

  return body
}

export function truncatePreview(text: string, max = 80) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
