import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, ArrowLeft, Loader2, MessageSquareHeart, RefreshCw,
  Sparkles, Target, TrendingUp, Users,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { fetchTractionSnapshot, TractionSnapshot } from '../lib/traction'
import { track } from '../lib/analytics'

function MetricCard({
  label,
  value,
  sub,
  accent = 'text-teal-300',
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div
      className="p-4 rounded-2xl border border-white/5"
      style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
    >
      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-extrabold ${accent}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1 leading-relaxed">{sub}</p>}
    </div>
  )
}

function fmtPct(n: number | null) {
  return n === null ? '—' : `${n}%`
}

export default function TractionPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [snap, setSnap] = useState<TractionSnapshot | null>(null)

  const load = async (windowDays = days) => {
    setLoading(true)
    const data = await fetchTractionSnapshot(windowDays)
    setSnap(data)
    setLoading(false)
    track('traction_view', { window_days: windowDays, ready: data.tableReady })
  }

  useEffect(() => {
    void load(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Activity size={22} className="text-teal-400" />
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Traction metrics</h1>
          <StatusBadge kind="live" label="Live events" size="md" />
          <StatusBadge kind="partial" label="Team-visible" size="md" />
        </div>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Weekly numbers we can defend with investors: activation, retention, matching intros,
          opportunity engagement, and “would use again” validation.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                days === d ? 'border-pi-500/40 text-white bg-pi-500/15' : 'border-white/10 text-slate-400'
              }`}
            >
              Last {d}d
            </button>
          ))}
          <button
            type="button"
            onClick={() => void load(days)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300 border border-white/10 hover:border-white/20"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-20 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-pi-400" /> Loading metrics…
        </div>
      )}

      {!loading && snap?.error && !snap.tableReady && (
        <div className="p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 text-sm text-slate-300 mb-6">
          <p className="font-semibold text-amber-200 mb-2">Metrics tables not ready</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Run <code className="text-teal-300">supabase_product_metrics.sql</code> in the Supabase SQL Editor,
            then refresh this page. Until then, events stay in the browser session only.
          </p>
          <p className="text-red-400/90 text-xs mt-2">{snap.error}</p>
        </div>
      )}

      {!loading && snap && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <MetricCard
              label="Activation"
              value={fmtPct(snap.activation.ratePct)}
              sub={`${snap.activation.onboardingComplete} onboard · ${snap.activation.twinViewed} twin views · ${snap.activation.profileComplete} profile complete`}
              accent="text-teal-300"
            />
            <MetricCard
              label="Retention (multi-day)"
              value={fmtPct(snap.retention.ratePct)}
              sub={`${snap.retention.returningUsers} of ${snap.retention.activeUsers} active users returned on another day`}
              accent="text-cyan-300"
            />
            <MetricCard
              label="Match intros started"
              value={String(snap.matching.introsStarted)}
              sub={`${snap.matching.matchPageViews} match views · ${snap.matching.matchExpands} why-expand`}
              accent="text-emerald-300"
            />
            <MetricCard
              label="Opp. interest"
              value={String(snap.opportunities.interestMarked)}
              sub={`${snap.opportunities.pageViews} views · ${snap.opportunities.expands} expands`}
              accent="text-amber-300"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div
              className="p-5 rounded-2xl border border-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-pi-400" />
                <h2 className="text-white font-bold text-sm">Communities loop</h2>
              </div>
              <p className="text-2xl font-extrabold text-white mb-1">
                {snap.communities.joins} <span className="text-sm font-medium text-slate-500">joins</span>
              </p>
              <p className="text-slate-400 text-xs">{snap.communities.posts} community posts · {snap.eventsTotal} total events in window</p>
            </div>

            <div
              className="p-5 rounded-2xl border border-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-teal-400" />
                <h2 className="text-white font-bold text-sm">Growth infrastructure (Phase 2)</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-2xl font-extrabold text-teal-300">{snap.growth.aiSuggestionsSent}</p>
                  <p className="text-slate-500">AI suggestions sent</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-cyan-300">{snap.growth.notifOpens}</p>
                  <p className="text-slate-500">Notif / For-you opens</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-emerald-300">
                    {snap.growth.pushEnableOk}/{snap.growth.pushEnableAttempts}
                  </p>
                  <p className="text-slate-500">Push enable ok / attempts</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-amber-300">{snap.growth.coreLoopCompletes}</p>
                  <p className="text-slate-500">Core-loop steps completed</p>
                </div>
              </div>
              <p className="text-slate-500 text-[11px] mt-3">
                Weekly digests shown: {snap.growth.weeklyDigestShown}
              </p>
            </div>

            <div
              className="p-5 rounded-2xl border border-white/5 md:col-span-2"
              style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquareHeart size={16} className="text-pink-400" />
                <h2 className="text-white font-bold text-sm">Would use again</h2>
              </div>
              <p className="text-2xl font-extrabold text-pink-300 mb-1">{fmtPct(snap.feedback.wouldUseAgainPct)}</p>
              <p className="text-slate-400 text-xs mb-3">
                {snap.feedback.yes} yes · {snap.feedback.maybe} maybe · {snap.feedback.no} no
                ({snap.feedback.total} responses)
              </p>
              {snap.feedback.recentBlockers.length > 0 ? (
                <ul className="space-y-1.5">
                  {snap.feedback.recentBlockers.map((b, i) => (
                    <li key={i} className="text-xs text-slate-400 flex gap-2">
                      <Target size={11} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 text-xs">No blocker notes yet — prompt users via the feedback button.</p>
              )}
            </div>
          </div>

          <div
            className="p-4 rounded-2xl border border-pi-500/20 flex flex-col sm:flex-row sm:items-center gap-3"
            style={{ background: 'rgba(20,184,166,0.08)' }}
          >
            <TrendingUp size={18} className="text-pi-400 shrink-0" />
            <p className="text-sm text-slate-300 flex-1">
              <span className="text-pi-300 font-semibold">How to use this:</span>{' '}
              Review weekly with Cristian. Improve the weakest loop first. Investor access comes after these numbers move.
            </p>
            <button
              type="button"
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:underline shrink-0"
            >
              <Sparkles size={12} /> What’s live
            </button>
          </div>
        </>
      )}
    </div>
  )
}
