/** Reply metadata embedded in message content (no DB migration required). */

export type ReplyMeta = {
  id: string
  author: string
  preview: string
}

const PREFIX = '[[reply:'

export function encodeReply(meta: ReplyMeta, body: string) {
  return `${PREFIX}${JSON.stringify(meta)}]]\n${body}`
}

/**
 * Parse [[reply:{...}]]body — tolerant of missing/extra newlines after ]].
 * Older messages may have been stored without the trailing newline.
 */
export function parseReply(content: string): { meta: ReplyMeta; body: string } | null {
  if (!content.startsWith(PREFIX)) return null

  // Find the end of the JSON object after [[reply:
  const jsonStart = PREFIX.length
  if (content[jsonStart] !== '{') return null

  let depth = 0
  let inString = false
  let escaped = false
  let jsonEnd = -1

  for (let i = jsonStart; i < content.length; i++) {
    const ch = content[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        jsonEnd = i
        break
      }
    }
  }

  if (jsonEnd === -1) return null
  // Expect ]] right after the JSON object
  if (content.slice(jsonEnd + 1, jsonEnd + 3) !== ']]') return null

  try {
    const raw = content.slice(jsonStart, jsonEnd + 1)
    const meta = JSON.parse(raw) as ReplyMeta
    if (!meta?.id || typeof meta.preview !== 'string') return null
    // Skip ]] and any following whitespace/newlines
    let bodyStart = jsonEnd + 3
    while (bodyStart < content.length && (content[bodyStart] === '\n' || content[bodyStart] === '\r' || content[bodyStart] === ' ')) {
      bodyStart += 1
    }
    return { meta, body: content.slice(bodyStart) }
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
