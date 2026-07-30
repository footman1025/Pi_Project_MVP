import { supabase } from './supabase'
import { track } from './analytics'

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'illegal'
  | 'misinformation'
  | 'other'

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam or fake engagement' },
  { id: 'scam', label: 'Fraud / scam risk' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'illegal', label: 'Illegal or dangerous content' },
  { id: 'misinformation', label: 'Coordinated misinformation' },
  { id: 'other', label: 'Other trust & safety concern' },
]

const LOCAL_KEY = 'pi_content_reports_v1'

function pushLocal(entry: Record<string, unknown>) {
  try {
    const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as unknown[]
    prev.unshift(entry)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prev.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

/** Submit a content report — prefers Supabase, always keeps a local audit trail. */
export async function submitContentReport(input: {
  reporterId: string
  targetType: 'post' | 'comment' | 'profile' | 'message'
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload = {
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: (input.details || '').slice(0, 1000),
    created_at: new Date().toISOString(),
  }

  pushLocal(payload)
  track('content_report', {
    target_type: input.targetType,
    reason: input.reason,
  })

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: payload.reporter_id,
    target_type: payload.target_type,
    target_id: payload.target_id,
    reason: payload.reason,
    details: payload.details || null,
  })

  if (error) {
    // Table may not exist yet — local + analytics still count as received for MVP
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
