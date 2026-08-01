/** Messaging reliability helpers — retries, offline detection, human-readable errors */

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export function friendlyNetworkError(err: unknown, fallback = 'Something went wrong'): string {
  if (!isOnline()) {
    return 'You’re offline. Reconnect, then tap Retry.'
  }
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  const lower = msg.toLowerCase()
  if (/failed to fetch|networkerror|network request failed|load failed|timeout|timed out/i.test(msg)) {
    return 'Network glitch — check your connection and tap Retry.'
  }
  if (/bucket|not found|row-level security/i.test(msg)) {
    return msg
  }
  if (/jwt|session|auth|not authenticated|permission/i.test(lower)) {
    return 'Session expired — sign in again, then retry.'
  }
  if (/payload|too large|entity too large|25 mb/i.test(lower)) {
    return msg || 'File is too large (max 25 MB).'
  }
  return msg || fallback
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(err: unknown): boolean {
  if (!isOnline()) return true
  const msg = err instanceof Error ? err.message : String(err || '')
  if (/bucket|not found|row-level security|not supported|under 25 mb|file type/i.test(msg)) {
    return false
  }
  if (/jwt|session|not authenticated|permission denied|violates/i.test(msg)) {
    return false
  }
  return /failed to fetch|network|timeout|timed out|503|502|504|429|abort/i.test(msg) || msg.length === 0
}

/**
 * Retry an async op with exponential backoff.
 * Skips retry for validation / auth / setup errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseMs?: number; label?: string },
): Promise<T> {
  const attempts = opts?.attempts ?? 3
  const baseMs = opts?.baseMs ?? 500
  let lastErr: unknown

  for (let i = 0; i < attempts; i++) {
    if (!isOnline() && i > 0) {
      throw new Error('You’re offline. Reconnect, then tap Retry.')
    }
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const retryable = isRetryableError(err)
      if (!retryable || i === attempts - 1) throw err
      await sleep(baseMs * Math.pow(2, i))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(opts?.label || 'Request failed')
}
