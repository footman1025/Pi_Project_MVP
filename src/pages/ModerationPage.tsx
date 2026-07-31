import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Flag, Loader2, Shield } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import {
  fetchContentReports,
  updateReportStatus,
  type ContentReport,
  type ReportStatus,
} from '../lib/contentReports'
import { track } from '../lib/analytics'

export default function ModerationPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ContentReport[]>([])
  const [source, setSource] = useState<'supabase' | 'local'>('local')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetchContentReports()
    setItems(res.items)
    setSource(res.source)
    setLoading(false)
    track('moderation_view', { count: res.items.length, source: res.source })
  }, [])

  useEffect(() => { void load() }, [load])

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
  }

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

        <header className="mb-6">
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
                <StatusBadge kind="partial" label={source === 'supabase' ? 'Live reports' : 'Local fallback'} />
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm pl-[52px] max-w-xl leading-relaxed">
            Multi-layer moderation starts here: community reports → human review → status. Appeals and AI risk scoring come next.
          </p>
        </header>

        {source === 'local' && (
          <div className="mb-4 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] text-xs text-slate-300">
            Showing device/local reports or SQL not applied. Run{' '}
            <code className="text-teal-300">supabase_content_reports.sql</code> +{' '}
            <code className="text-teal-300">supabase_content_reports_team.sql</code> for the team inbox.
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
            <Shield size={14} /> Appeals principle
          </div>
          Users may ask why content was restricted and request human review. Every status change should be explainable (Truth Guarantee).
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-teal-400" /></div>
        ) : items.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl border border-white/[0.07]"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <p className="text-white font-semibold mb-1">No reports yet</p>
            <p className="text-slate-500 text-sm">Reports from Feed (and soon profiles) appear here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((r, i) => {
              const id = r.id || `local-${i}`
              const status = (r.status as ReportStatus) || 'open'
              return (
                <article
                  key={id}
                  className="rounded-2xl border border-white/[0.07] p-4"
                  style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-white text-sm font-semibold capitalize">{r.target_type} · {r.reason}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                        {r.target_id} · {new Date(r.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      status === 'open' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                        : status === 'reviewing' ? 'text-teal-300 border-teal-500/30 bg-teal-500/10'
                          : status === 'resolved' ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-slate-400 border-white/10'
                    }`}>
                      {status}
                    </span>
                  </div>
                  {r.details && <p className="text-slate-400 text-xs mb-3 leading-relaxed">{r.details}</p>}
                  {r.id && source === 'supabase' && (
                    <div className="flex flex-wrap gap-1.5">
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
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
