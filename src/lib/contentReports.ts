import { supabase } from './supabase'
import { track } from './analytics'
import { levelFromScore, scoreReportRisk, type RiskLevel } from './trustRisk'

export type ReportReason =
  | 'spam'
  | 'scam'
  | 'harassment'
  | 'illegal'
  | 'misinformation'
  | 'other'

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export type AppealStatus = 'requested' | 'under_review' | 'upheld' | 'overturned'

export type ContentReport = {
  id?: string
  reporter_id: string
  target_type: 'post' | 'comment' | 'profile' | 'message'
  target_id: string
  reason: ReportReason | string
  details?: string | null
  status?: ReportStatus | string
  risk_score?: number | null
  risk_level?: RiskLevel | string | null
  appeal_status?: AppealStatus | string | null
  appeal_note?: string | null
  appeal_at?: string | null
  created_at: string
  updated_at?: string | null
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

function patchLocal(id: string, patch: Partial<ContentReport>) {
  try {
    const prev = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as ContentReport[]
    const next = prev.map(r => (r.id === id ? { ...r, ...patch } : r))
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
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

function withComputedRisk(row: ContentReport): ContentReport {
  if (typeof row.risk_score === 'number' && row.risk_level) return row
  const risk = scoreReportRisk({
    reason: row.reason,
    details: row.details,
    targetType: row.target_type,
  })
  return { ...row, risk_score: risk.score, risk_level: risk.level }
}

/** Submit a content report — prefers Supabase, always keeps a local audit trail. */
export async function submitContentReport(input: {
  reporterId: string
  targetType: 'post' | 'comment' | 'profile' | 'message'
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<{ ok: true; risk: ReturnType<typeof scoreReportRisk> } | { ok: false; error: string }> {
  const risk = scoreReportRisk({
    reason: input.reason,
    details: input.details,
    targetType: input.targetType,
  })

  const localId = `local-${Date.now()}`
  const payload: ContentReport = {
    id: localId,
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: (input.details || '').slice(0, 1000),
    status: 'open',
    risk_score: risk.score,
    risk_level: risk.level,
    created_at: new Date().toISOString(),
  }

  pushLocal(payload)
  track('content_report', {
    target_type: input.targetType,
    reason: input.reason,
    risk_score: risk.score,
    risk_level: risk.level,
  })

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: payload.reporter_id,
      target_type: payload.target_type,
      target_id: payload.target_id,
      reason: payload.reason,
      details: payload.details || null,
      risk_score: risk.score,
      risk_level: risk.level,
      status: 'open',
    })
    .select('id')
    .maybeSingle()

  if (error) {
    // Column missing → retry without risk fields (pre-v2 SQL)
    if (/risk_score|risk_level|schema cache|column/i.test(error.message)) {
      const fallback = await supabase.from('content_reports').insert({
        reporter_id: payload.reporter_id,
        target_type: payload.target_type,
        target_id: payload.target_id,
        reason: payload.reason,
        details: payload.details || null,
      })
      if (fallback.error && !/relation|does not exist|schema cache/i.test(fallback.error.message)) {
        return { ok: false, error: fallback.error.message }
      }
      return { ok: true, risk }
    }
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return { ok: true, risk }
    }
    return { ok: false, error: error.message }
  }

  if (data?.id) {
    patchLocal(localId, { id: data.id })
  }

  return { ok: true, risk }
}

export async function fetchContentReports(): Promise<{
  items: ContentReport[]
  source: 'supabase' | 'local'
}> {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!error && data) {
    const items = (data as ContentReport[]).map(withComputedRisk)
    items.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0) || +new Date(b.created_at) - +new Date(a.created_at))
    return { items, source: 'supabase' }
  }
  const items = listLocalReports().map(withComputedRisk)
  items.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
  return { items, source: 'local' }
}

export async function fetchMyReports(reporterId: string): Promise<ContentReport[]> {
  const { data, error } = await supabase
    .from('content_reports')
    .select('*')
    .eq('reporter_id', reporterId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!error && data) {
    return (data as ContentReport[]).map(withComputedRisk)
  }
  return listLocalReports()
    .filter(r => r.reporter_id === reporterId)
    .map(withComputedRisk)
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || id.startsWith('local-')) {
    patchLocal(id, { status, updated_at: new Date().toISOString() })
    if (id.startsWith('local-')) {
      track('content_report_status', { status, local: true })
      return { ok: true }
    }
    return { ok: false, error: 'Local-only report — apply SQL to manage server status.' }
  }
  const { error } = await supabase
    .from('content_reports')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  track('content_report_status', { status })
  return { ok: true }
}

/** Reporter requests human re-review after a decision (or while open). */
export async function submitAppeal(
  id: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const appeal_note = note.trim().slice(0, 1000)
  if (appeal_note.length < 8) {
    return { ok: false, error: 'Please add a short appeal note (at least a sentence).' }
  }
  const patch: Partial<ContentReport> = {
    appeal_status: 'requested',
    appeal_note,
    appeal_at: new Date().toISOString(),
    status: 'reviewing',
    updated_at: new Date().toISOString(),
  }

  if (!id || id.startsWith('local-')) {
    patchLocal(id, patch)
    track('content_report_appeal', { local: true })
    return { ok: true }
  }

  const { error } = await supabase
    .from('content_reports')
    .update({
      appeal_status: 'requested',
      appeal_note,
      appeal_at: patch.appeal_at,
      status: 'reviewing',
      updated_at: patch.updated_at,
    })
    .eq('id', id)

  if (error) {
    if (/appeal_status|schema cache|column/i.test(error.message)) {
      return { ok: false, error: 'Run supabase_content_reports_v2.sql to enable appeals.' }
    }
    return { ok: false, error: error.message }
  }
  track('content_report_appeal', {})
  return { ok: true }
}

/** Moderator resolves an appeal. */
export async function resolveAppeal(
  id: string,
  decision: 'upheld' | 'overturned',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status: ReportStatus = decision === 'overturned' ? 'dismissed' : 'resolved'
  const patch = {
    appeal_status: decision,
    status,
    updated_at: new Date().toISOString(),
  }

  if (!id || id.startsWith('local-')) {
    patchLocal(id, patch)
    track('content_report_appeal_resolve', { decision, local: true })
    return { ok: true }
  }

  const { error } = await supabase
    .from('content_reports')
    .update(patch)
    .eq('id', id)

  if (error) return { ok: false, error: error.message }
  track('content_report_appeal_resolve', { decision })
  return { ok: true }
}

export function canAppeal(row: ContentReport): boolean {
  const appeal = row.appeal_status
  if (appeal === 'requested' || appeal === 'under_review') return false
  if (appeal === 'upheld' || appeal === 'overturned') return false
  const status = row.status || 'open'
  return status === 'resolved' || status === 'dismissed' || status === 'open'
}

export function ensureRiskLevel(row: ContentReport): RiskLevel {
  if (row.risk_level === 'low' || row.risk_level === 'medium' || row.risk_level === 'high' || row.risk_level === 'critical') {
    return row.risk_level
  }
  return levelFromScore(row.risk_score || 0)
}
