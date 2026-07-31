import { supabase } from './supabase'
import { track } from './analytics'

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'illegal'
  | 'misinformation'
  | 'other'

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export type ContentReport = {
  id?: string
  reporter_id: string
  target_type: 'post' | 'comment' | 'profile' | 'message'
  target_id: string
  reason: ReportReason | string
  details?: string | null
  status?: ReportStatus | string
  created_at: string
}

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam or fake engagement' },
  { id: 'scam', label: 'Fraud / scam risk' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'illegal', label: 'Illegal or dangerous content' },
  { id: 'misinformation', label: 'Coordinated misinformation' },
  { id: 'other', label: 'Other trust & safety concern' },
]

const LOCAL_KEY = 'pi_content_reports_v1'

function pushLocal(entry: ContentReport) {
  try {
    const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as ContentReport[]
    prev.unshift({ ...entry, status: entry.status || 'open' })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prev.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

export function listLocalReports(): ContentReport[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as ContentReport[]
  } catch {
    return []
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
  const payload: ContentReport = {
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: (input.details || '').slice(0, 1000),
    status: 'open',
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
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return { ok: true }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function fetchContentReports(): Promise<{
  items: ContentReport[]
  source: 'supabase' | 'local'
}> {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80)

  if (!error && data) {
    return { items: data as ContentReport[], source: 'supabase' }
  }
  return { items: listLocalReports(), source: 'local' }
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || id.startsWith('local-')) {
    return { ok: false, error: 'Local-only report — apply SQL to manage server status.' }
  }
  const { error } = await supabase
    .from('content_reports')
    .update({ status })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  track('content_report_status', { status })
  return { ok: true }
}
