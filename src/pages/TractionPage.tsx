import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Bell, Bot, Briefcase, Clock,
  Copy, ExternalLink, Flame, Loader2, MessageSquareHeart, RefreshCw, Sparkles,
  Target, TrendingUp, Users, Zap,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { fetchTractionSnapshot, TractionSnapshot } from '../lib/traction'
import { fetchNicheCatalog, type NicheCatalogItem } from '../lib/nicheCatalog'
import { track } from '../lib/analytics'

function fmtPct(n: number | null) {
  return n === null ? '—' : `${n}%`
}

function fmtMinutes(n: number | null) {
  if (n === null) return '—'
  if (n < 60) return `${n}m`
  const h = Math.floor(n / 60)
  const m = n % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function MetricCard({
  label,
  value,
  sub,
  accent = '#14b8a6',
  Icon,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  Icon: typeof Activity
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 transition-transform hover:-translate-y-0.5"
      style={{
        background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.95))',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,0,0,0.2)`,
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-30 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon size={15} />
        </div>
      </div>
      <p className="relative text-3xl font-black tracking-tight text-white mb-1.5" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="relative text-slate-500 text-[11px] leading-relaxed">{sub}</p>}
    </div>
  )
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="rounded-xl bg-black/25 border border-white/[0.06] px-3 py-2.5">
      <p className="text-xl font-extrabold tabular-nums" style={{ color }}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{label}</p>
    </div>
  )
}

export default function TractionPage() {
  const navigate = useNavigate()
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [snap, setSnap] = useState<TractionSnapshot | null>(null)
  const [niche, setNiche] = useState<NicheCatalogItem[]>([])
  const [copied, setCopied] = useState(false)

  const load = async (windowDays = days) => {
    setLoading(true)
    const [data, catalog] = await Promise.all([
      fetchTractionSnapshot(windowDays),
      fetchNicheCatalog(),
    ])
    setSnap(data)
    setNiche(catalog)
    setLoading(false)
    track('traction_view', { window_days: windowDays, ready: data.tableReady, niche: catalog.length })
  }

  useEffect(() => {
    void load(days)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  const copyNicheLinks = async () => {
    if (!niche.length) return
    const text = niche.map(n => `${n.title}\n${n.url}`).join('\n\n')
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    track('niche_links_copied', { count: niche.length })
    setTimeout(() => setCopied(false), 2000)
  }

  const yesPct = snap?.feedback.wouldUseAgainPct ?? 0

  return (
    <div className="min-h-full relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-60"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 20% 0%, rgba(20,184,166,0.18), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} /> Dashboard
        </button>

        <header className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                <Activity size={18} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Traction</h1>
              <StatusBadge kind="live" label="Live events" />
              <StatusBadge kind="partial" label="Team-visible" />
            </div>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              WP001 Strong Circle Liquidity Baseline — measure the loop, name the constraint, then WP002.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-1 p-1 rounded-2xl border border-white/10 self-start"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          >
            {[7, 14, 30].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  days === d
                    ? 'text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={days === d ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : undefined}
              >
                {d}d
              </button>
            ))}
            <button
              type="button"
              onClick={() => void load(days)}
              className="ml-0.5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {loading && !snap && (
          <div className="flex justify-center py-24 text-slate-400 text-sm gap-2">
            <Loader2 size={18} className="animate-spin text-teal-400" /> Loading metrics…
          </div>
        )}

        {!loading && snap?.error && !snap.tableReady && (
          <div className="p-5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] text-sm text-slate-300 mb-6">
            <p className="font-semibold text-amber-200 mb-2">Metrics tables not ready</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Run <code className="text-teal-300">supabase_product_metrics.sql</code> in the Supabase SQL Editor,
              then refresh. Until then, events stay in the browser session only.
            </p>
            <p className="text-red-400/90 text-xs mt-2">{snap.error}</p>
          </div>
        )}

        {snap && (
          <div className={`space-y-5 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* WP001 — Strong Circle Liquidity Baseline */}
            <section
              className="rounded-2xl border border-teal-500/30 p-5 sm:p-6"
              style={{ background: 'linear-gradient(160deg, rgba(12,40,36,0.95), rgba(10,14,22,0.98))' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                    >
                      <Target size={16} className="text-white" />
                    </div>
                    <h2 className="text-white font-bold text-base">WP001 · Liquidity Baseline</h2>
                    <StatusBadge kind="live" label="Measure only" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                    Activation → valuable action timing, intro rate, rejection reasons, and the single biggest constraint.
                  </p>
                </div>
              </div>

              <div className="mb-4 rounded-xl border border-teal-500/25 bg-teal-500/[0.08] px-3.5 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-300/80 mb-1">
                  #1 measurable constraint
                </p>
                <p className="text-sm text-white leading-relaxed font-medium">
                  {snap.wp001.primaryConstraint}
                </p>
                {snap.wp001.biggestDropLabel && (
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Hub drop-off focus: {snap.wp001.biggestDropLabel}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <MiniStat
                  value={fmtPct(snap.wp001.activationRatePct)}
                  label="Activation → valuable action"
                  color="#2dd4bf"
                />
                <MiniStat
                  value={fmtPct(snap.wp001.valuableIntroductionRatePct)}
                  label="Valuable intro rate"
                  color="#34d399"
                />
                <MiniStat
                  value={fmtMinutes(snap.wp001.timeToFirstValuable.medianMinutes)}
                  label="TTFVA median"
                  color="#fbbf24"
                />
                <MiniStat
                  value={String(snap.wp001.matchRejected)}
                  label="Match passes"
                  color="#fb7185"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2 inline-flex items-center gap-1">
                    <Clock size={11} /> Time to first valuable action
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat
                      value={fmtMinutes(snap.wp001.timeToFirstValuable.medianMinutes)}
                      label="Median"
                      color="#fbbf24"
                    />
                    <MiniStat
                      value={fmtMinutes(snap.wp001.timeToFirstValuable.p75Minutes)}
                      label="P75"
                      color="#f59e0b"
                    />
                    <MiniStat
                      value={fmtMinutes(snap.wp001.timeToFirstValuable.p90Minutes)}
                      label="P90"
                      color="#d97706"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    n={snap.wp001.timeToFirstValuable.sampleSize} · activated{' '}
                    {snap.wp001.activatedUsers} · valuable {snap.wp001.usersWithValuableAction}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
                    Match accept vs pass
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat value={String(snap.wp001.matchShown)} label="Shown" color="#94a3b8" />
                    <MiniStat value={String(snap.wp001.matchAccepted)} label="Connect/msg" color="#34d399" />
                    <MiniStat value={String(snap.wp001.matchRejected)} label="Passed" color="#fb7185" />
                  </div>
                  {snap.wp001.rejectionReasons.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {snap.wp001.rejectionReasons.slice(0, 5).map(r => (
                        <li key={r.reason} className="text-[11px] text-slate-400 flex justify-between gap-2">
                          <span className="truncate">{r.reason.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-slate-300 tabular-nums">{r.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-600">
                      No passes yet — use Pass on /match and pick a reason.
                    </p>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Valuable action = apply, opportunity conversation start, or match connect/message.
                WP002 is not chosen until this baseline has enough volume to name one constraint.
              </p>
            </section>

            {/* P1 — Hub traction engine */}
            <section
              className="rounded-2xl border border-amber-500/25 p-5 sm:p-6"
              style={{ background: 'linear-gradient(160deg, rgba(40,28,12,0.92), rgba(10,14,22,0.98))' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                      <Briefcase size={16} className="text-white" />
                    </div>
                    <h2 className="text-white font-bold text-base">P1 · Hub traction engine</h2>
                    <StatusBadge kind="live" label="Funnel live" />
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                    Discover → View → Apply → Connect → Outcome. Conversions, cohorts, outcome quality, and the biggest drop-off.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void copyNicheLinks()}
                    disabled={!niche.length}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-950 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                  >
                    <Copy size={12} /> {copied ? 'Copied' : 'Copy all links'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/opportunities')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 border border-white/15 hover:bg-white/5"
                  >
                    Open Hub <ExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Funnel stages */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {snap.hubFunnel.stages.map((stage, i) => (
                  <div
                    key={stage.id}
                    className="relative rounded-xl border border-white/[0.07] bg-black/30 px-3 py-3"
                    title={stage.definition}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1">
                      {stage.label}
                    </p>
                    <p className="text-2xl font-black text-white tabular-nums">{stage.count}</p>
                    {i > 0 && (
                      <p className="mt-1 text-[11px] font-semibold text-teal-300/90">
                        {fmtPct(stage.conversionFromPrevPct)} from prev
                      </p>
                    )}
                    {i === 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">Top of funnel</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <Target size={13} className="text-amber-300" />
                  Discover → Outcome:{' '}
                  <span className="font-bold text-white">{fmtPct(snap.hubFunnel.overallDiscoverToOutcomePct)}</span>
                </span>
                <span className="text-white/15">·</span>
                <span className="text-slate-500">
                  Created {snap.opportunities.created} · Interest {snap.opportunities.interestMarked}
                </span>
              </div>

              {snap.hubFunnel.biggestDropOff && (
                <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.08] px-3.5 py-3 flex gap-2.5">
                  <AlertTriangle size={16} className="text-rose-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-rose-100 text-xs font-bold mb-0.5">
                      Biggest drop-off: {snap.hubFunnel.biggestDropOff.fromLabel}
                      <ArrowRight size={11} className="inline mx-1" />
                      {snap.hubFunnel.biggestDropOff.toLabel}
                    </p>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      {snap.hubFunnel.biggestDropOff.insight}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">Cohorts</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat value={String(snap.hubFunnel.cohorts.firstTimeUsers)} label="First-time" color="#94a3b8" />
                    <MiniStat value={String(snap.hubFunnel.cohorts.returningUsers)} label="Returning" color="#2dd4bf" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Return rate {fmtPct(snap.hubFunnel.cohorts.returningUserRatePct)} · Applies{' '}
                    {snap.hubFunnel.cohorts.firstTimeApplied} first / {snap.hubFunnel.cohorts.returningApplied} returning
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">Outcome quality</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat value={String(snap.hubFunnel.outcomeQuality.completed)} label="Completed" color="#34d399" />
                    <MiniStat value={String(snap.hubFunnel.outcomeQuality.pending)} label="Pending" color="#fbbf24" />
                    <MiniStat value={String(snap.hubFunnel.outcomeQuality.declined)} label="Declined" color="#fb7185" />
                    <MiniStat value={String(snap.hubFunnel.outcomeQuality.closed)} label="Closed" color="#94a3b8" />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <Clock size={11} />
                    Time to outcome · median{' '}
                    {snap.hubFunnel.outcomeQuality.medianHoursToOutcome == null
                      ? '—'
                      : `${snap.hubFunnel.outcomeQuality.medianHoursToOutcome}h`}
                    {' · avg '}
                    {snap.hubFunnel.outcomeQuality.avgHoursToOutcome == null
                      ? '—'
                      : `${snap.hubFunnel.outcomeQuality.avgHoursToOutcome}h`}
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">Post-outcome feedback</p>
                  <p className="text-2xl font-black text-pink-300 tabular-nums mb-1">
                    {fmtPct(snap.hubFunnel.outcomeFeedback.usefulPct)}
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    {snap.hubFunnel.outcomeFeedback.yes} yes · {snap.hubFunnel.outcomeFeedback.maybe} maybe ·{' '}
                    {snap.hubFunnel.outcomeFeedback.no} no
                    <span className="text-slate-600"> · {snap.hubFunnel.outcomeFeedback.total} responses</span>
                  </p>
                  {snap.hubFunnel.outcomeFeedback.recentNotes[0] ? (
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      “{snap.hubFunnel.outcomeFeedback.recentNotes[0]}”
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-600">
                      Prompt appears in Hub Mine / Inbox after an outcome.
                    </p>
                  )}
                </div>
              </div>

              <details className="mb-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-slate-200">
                  Event definitions (how each stage is counted)
                </summary>
                <ul className="mt-2 space-y-1.5 pb-1">
                  {snap.hubFunnel.stages.map(s => (
                    <li key={s.id} className="text-[11px] text-slate-400 leading-relaxed">
                      <span className="text-slate-200 font-semibold">{s.label}:</span> {s.definition}
                    </li>
                  ))}
                </ul>
              </details>

              {niche.length > 0 ? (
                <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {niche.map(n => (
                    <li
                      key={n.id}
                      className="flex flex-wrap items-center gap-2 text-xs border border-white/5 rounded-xl px-3 py-2 bg-black/25"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80 shrink-0">
                        {n.category}
                      </span>
                      <span className="text-white font-semibold flex-1 min-w-0 truncate">{n.title}</span>
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-300 font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        /o/{n.slug} <ExternalLink size={11} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-xs">
                  Niche catalog empty — run <code className="text-teal-300">npm run seed:opportunities</code> locally.
                </p>
              )}
            </section>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                label="Activation"
                value={fmtPct(snap.activation.ratePct)}
                sub={`${snap.activation.onboardingComplete} onboard · ${snap.activation.twinViewed} twin · ${snap.activation.profileComplete} profile`}
                accent="#2dd4bf"
                Icon={Zap}
              />
              <MetricCard
                label="Retention"
                value={fmtPct(snap.retention.ratePct)}
                sub={`${snap.retention.returningUsers} of ${snap.retention.activeUsers} multi-day`}
                accent="#22d3ee"
                Icon={Flame}
              />
              <MetricCard
                label="Match intros"
                value={String(snap.matching.introsStarted)}
                sub={`${snap.matching.matchPageViews} views · ${snap.matching.matchExpands} expand · ${snap.matching.matchRejected} pass`}
                accent="#34d399"
                Icon={Sparkles}
              />
              <MetricCard
                label="Discover → Outcome"
                value={fmtPct(snap.hubFunnel.overallDiscoverToOutcomePct)}
                sub={`${snap.opportunities.discover} discover · ${snap.opportunities.publicViews} view · ${snap.opportunities.applied} apply · ${snap.opportunities.conversationsStarted} connect · ${snap.opportunities.outcomes} outcome · drop-off ${snap.hubFunnel.biggestDropOff ? `${snap.hubFunnel.biggestDropOff.fromLabel}→${snap.hubFunnel.biggestDropOff.toLabel}` : '—'}`}
                accent="#fbbf24"
                Icon={Target}
              />
            </div>

            <div className="grid lg:grid-cols-5 gap-3">
              {/* Communities */}
              <div
                className="lg:col-span-2 rounded-2xl border border-white/[0.07] p-5"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.95))' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center">
                    <Users size={15} />
                  </div>
                  <h2 className="text-white font-bold text-sm">Communities</h2>
                </div>
                <p className="text-4xl font-black text-white tracking-tight mb-1">
                  {snap.communities.joins}
                  <span className="text-sm font-medium text-slate-500 ml-2">joins</span>
                </p>
                <p className="text-slate-500 text-xs">
                  {snap.communities.posts} posts · {snap.eventsTotal.toLocaleString()} events in window
                </p>
              </div>

              {/* Growth — no Phase 2 label */}
              <div
                className="lg:col-span-3 rounded-2xl border border-white/[0.07] p-5"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.95))' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
                    <Bot size={15} />
                  </div>
                  <h2 className="text-white font-bold text-sm">Growth</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <MiniStat value={String(snap.growth.aiSuggestionsSent)} label="AI suggestions" color="#2dd4bf" />
                  <MiniStat value={String(snap.growth.notifOpens)} label="Notif opens" color="#22d3ee" />
                  <MiniStat
                    value={`${snap.growth.pushEnableOk}/${snap.growth.pushEnableAttempts}`}
                    label="Push enable"
                    color="#34d399"
                  />
                  <MiniStat value={String(snap.growth.coreLoopCompletes)} label="Loop steps" color="#fbbf24" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { n: snap.growth.weeklyDigestShown, l: 'Digests' },
                    { n: snap.growth.inviteShares, l: 'Invites' },
                    { n: snap.growth.signupAttributed, l: 'Attributed' },
                    { n: snap.growth.partnerClicks, l: 'Partners' },
                    { n: snap.growth.discussRequests, l: 'Discuss' },
                  ].map(x => (
                    <span
                      key={x.l}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1"
                    >
                      <span className="text-white tabular-nums">{x.n}</span> {x.l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation */}
            <div
              className="rounded-2xl border border-white/[0.07] p-5 sm:p-6"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.95))' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-5">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 text-pink-300 flex items-center justify-center">
                    <MessageSquareHeart size={15} />
                  </div>
                  <h2 className="text-white font-bold text-sm">Would use again</h2>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, yesPct)}%`,
                        background: 'linear-gradient(90deg, #ec4899, #f472b6)',
                      }}
                    />
                  </div>
                </div>
                <p className="text-3xl font-black text-pink-300 tabular-nums shrink-0">
                  {fmtPct(snap.feedback.wouldUseAgainPct)}
                </p>
              </div>
              <p className="text-slate-500 text-xs mb-3">
                {snap.feedback.yes} yes · {snap.feedback.maybe} maybe · {snap.feedback.no} no
                <span className="text-slate-600"> · {snap.feedback.total} responses</span>
              </p>
              {snap.feedback.recentBlockers.length > 0 ? (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {snap.feedback.recentBlockers.map((b, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-300 flex gap-2 rounded-xl bg-black/25 border border-white/[0.05] px-3 py-2"
                    >
                      <Bell size={12} className="text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 text-xs">No blocker notes yet — prompt users via the feedback popup.</p>
              )}
            </div>

            <div
              className="rounded-2xl border border-teal-500/20 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ background: 'linear-gradient(90deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))' }}
            >
              <TrendingUp size={16} className="text-teal-400 shrink-0" />
              <p className="text-sm text-slate-300 flex-1 leading-relaxed">
                <span className="text-teal-300 font-semibold">P1 rule:</span>{' '}
                Ship → Dogfood → Measure → Learn → Decide. Fix the biggest drop-off before P2.
              </p>
              <button
                type="button"
                onClick={() => navigate('/transparency')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-200 hover:text-white shrink-0"
              >
                What’s live →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
