import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flag, Loader2, Shield, Scale, AlertTriangle } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import {
  canAppeal,
  ensureRiskLevel,
  fetchContentReports,
  fetchMyReports,
  resolveAppeal,
  submitAppeal,
  updateReportStatus,
  type ContentReport,
  type ReportStatus,
} from '../lib/contentReports'
import { riskBadgeClass, type RiskLevel } from '../lib/trustRisk'
import { track } from '../lib/analytics'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'inbox' | 'appeals' | 'mine'

function RiskPill({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${riskBadgeClass(level)}`}>
      {level} · {score}
    </span>
  )
}

export default function ModerationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('inbox')
  const [items, setItems] = useState<ContentReport[]>([])
  const [mine, setMine] = useState<ContentReport[]>([])
  const [source, setSource] = useState<'supabase' | 'local'>('local')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [appealDraft, setAppealDraft] = useState<Record<string, string>>({})
  const [filterRisk, setFilterRisk] = useState<'all' | RiskLevel>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetchContentReports()
    setItems(res.items)
    setSource(res.source)
    if (user) {
      setMine(await fetchMyReports(user.id))
    }
    setLoading(false)
    track('moderation_view', { count: res.items.length, source: res.source })
  }, [user])

  useEffect(() => { void load() }, [load])

  const appeals = useMemo(
    () => items.filter(r => r.appeal_status === 'requested' || r.appeal_status === 'under_review'),
    [items],
  )

  const inbox = useMemo(() => {
    let list = items
    if (filterRisk !== 'all') {
      list = list.filter(r => ensureRiskLevel(r) === filterRisk)
    }
    return list
  }, [items, filterRisk])

  const setStatus = async (row: ContentReport, status: ReportStatus) => {
    if (!row.id) return
    setBusyId(row.id)
    const res = await updateReportStatus(row.id, status)
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setItems(list => list.map(r => (r.id === row.id ? { ...r, status } : r)))
    setMine(list => list.map(r => (r.id === row.id ? { ...r, status } : r)))
  }

  const onAppeal = async (row: ContentReport) => {
    if (!row.id) return
    const note = (appealDraft[row.id] || '').trim()
    setBusyId(row.id)
    const res = await submitAppeal(row.id, note)
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setAppealDraft(d => ({ ...d, [row.id!]: '' }))
    await load()
  }

  const onResolveAppeal = async (row: ContentReport, decision: 'upheld' | 'overturned') => {
    if (!row.id) return
    setBusyId(row.id)
    const res = await resolveAppeal(row.id, decision)
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await load()
  }

  const renderCard = (r: ContentReport, opts?: { showAppealForm?: boolean; showAppealActions?: boolean }) => {
    const id = r.id || `anon-${r.created_at}`
    const status = (r.status as ReportStatus) || 'open'
    const level = ensureRiskLevel(r)
    const score = r.risk_score ?? 0

    return (
      <article
        key={id}
        className="rounded-2xl border border-white/[0.07] p-4"
        style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold capitalize">{r.target_type} · {r.reason}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 break-all">
              {r.target_id} · {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <RiskPill level={level} score={score} />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
              status === 'open' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                : status === 'reviewing' ? 'text-teal-300 border-teal-500/30 bg-teal-500/10'
                  : status === 'resolved' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-slate-400 border-white/10'
            }`}>
              {status}
            </span>
            {r.appeal_status && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border text-violet-300 border-violet-500/30 bg-violet-500/10">
                appeal: {r.appeal_status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {r.details && <p className="text-slate-400 text-xs mb-2 leading-relaxed">{r.details}</p>}
        {r.appeal_note && (
          <p className="text-violet-200/90 text-xs mb-3 leading-relaxed border-l-2 border-violet-500/40 pl-2.5">
            <span className="font-semibold">Appeal:</span> {r.appeal_note}
          </p>
        )}

        {level === 'critical' || level === 'high' ? (
          <p className="text-[11px] text-orange-200/90 mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Prioritize human review — elevated risk score
          </p>
        ) : null}

        {r.id && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(['reviewing', 'resolved', 'dismissed'] as ReportStatus[]).map(s => (
              <button
                key={s}
                type="button"
                disabled={busyId === r.id || status === s}
                onClick={() => void setStatus(r, s)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 border border-white/10 hover:border-teal-500/30 disabled:opacity-40 capitalize"
              >
                {busyId === r.id ? '…' : s}
              </button>
            ))}
          </div>
        )}

        {opts?.showAppealActions && r.id && (r.appeal_status === 'requested' || r.appeal_status === 'under_review') && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => void onResolveAppeal(r, 'upheld')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-200 border border-emerald-500/30 bg-emerald-500/10"
            >
              Uphold decision
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => void onResolveAppeal(r, 'overturned')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-200 border border-amber-500/30 bg-amber-500/10"
            >
              Overturn
            </button>
          </div>
        )}

        {opts?.showAppealForm && r.id && canAppeal(r) && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <p className="text-[11px] text-slate-500">Request human re-review (Truth Guarantee · appeals)</p>
            <textarea
              value={appealDraft[r.id] || ''}
              onChange={e => setAppealDraft(d => ({ ...d, [r.id!]: e.target.value }))}
              rows={2}
              placeholder="Why should this decision be reviewed?"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40 resize-none"
            />
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => void onAppeal(r)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Scale size={12} /> Submit appeal
            </button>
          </div>
        )}
      </article>
    )
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', count: items.length },
    { id: 'appeals', label: 'Appeals', count: appeals.length },
    { id: 'mine', label: 'My reports', count: mine.length },
  ]

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.18), transparent)' }}
      />
      <div className="relative p-4 sm:p-6 max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/trust')}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white"
        >
          <ArrowLeft size={13} /> Trust & Safety
        </button>

        <header className="mb-5">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Flag size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90">Trust & Safety</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Moderation inbox</h1>
                <StatusBadge kind="partial" label="Risk v0 + appeals" />
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm pl-[52px] max-w-xl leading-relaxed">
            Community reports → rules-based risk score → human review → appeals. Full AI risk engine remains Soon.
          </p>
        </header>

        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                tab === t.id
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span className="ml-1.5 text-[10px] opacity-70">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'inbox' && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterRisk(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${
                  filterRisk === f
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {source === 'local' && (
          <div className="mb-4 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] text-xs text-slate-300">
            Local fallback or SQL incomplete. Run{' '}
            <code className="text-teal-300">supabase_content_reports.sql</code>,{' '}
            <code className="text-teal-300">supabase_content_reports_team.sql</code>, and{' '}
            <code className="text-teal-300">supabase_content_reports_v2.sql</code> for risk + appeals columns.
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div
          className="mb-5 p-4 rounded-2xl border border-teal-500/20 text-xs text-slate-400 leading-relaxed"
          style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.1), rgba(10,14,22,0.9))' }}
        >
          <div className="flex items-center gap-2 text-teal-200 font-semibold mb-1">
            <Shield size={14} /> Truth Guarantee
          </div>
          Risk scores are rules-based triage signals (Partial) — not autonomous enforcement. Appeals get human review.
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-teal-400" /></div>
        ) : tab === 'inbox' ? (
          inbox.length === 0 ? (
            <Empty title="No reports in this filter" desc="Reports from Feed and profiles appear here, sorted by risk." />
          ) : (
            <div className="space-y-2.5">{inbox.map(r => renderCard(r))}</div>
          )
        ) : tab === 'appeals' ? (
          appeals.length === 0 ? (
            <Empty title="No open appeals" desc="When someone requests re-review, it shows here for human decision." />
          ) : (
            <div className="space-y-2.5">{appeals.map(r => renderCard(r, { showAppealActions: true }))}</div>
          )
        ) : (
          !user ? (
            <Empty title="Sign in to see your reports" desc="Your submitted reports and appeal options appear here." />
          ) : mine.length === 0 ? (
            <Empty title="You haven’t reported anything yet" desc="Use Report on posts, comments, or profiles." />
          ) : (
            <div className="space-y-2.5">{mine.map(r => renderCard(r, { showAppealForm: true }))}</div>
          )
        )}
      </div>
    </div>
  )
}

function Empty({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      className="text-center py-14 rounded-2xl border border-white/[0.07]"
      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
    >
      <p className="text-white font-semibold mb-1">{title}</p>
      <p className="text-slate-500 text-sm px-6">{desc}</p>
    </div>
  )
}
