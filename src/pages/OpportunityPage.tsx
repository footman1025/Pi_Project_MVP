import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase, Sparkles, Clock4, ChevronDown, ChevronUp, Loader2, Heart, Zap,
  Send, X, Inbox, Plus, ExternalLink, MessageCircle, BarChart3, Users,
} from 'lucide-react'
import MockIcon from '../components/MockIcon'
import StatusBadge from '../components/StatusBadge'
import CreateOpportunityModal from '../components/CreateOpportunityModal'
import { useAuth } from '../contexts/AuthContext'
import { opportunityReasonForUser, scoreOpportunityForUser } from '../lib/matching'
import {
  fetchOpportunities,
  opportunityPublicPath,
  type OpportunityItem,
} from '../lib/opportunities'
import {
  fetchMyOpportunityInterests,
  upsertOpportunityInterest,
  withdrawOpportunityInterest,
  type InterestStatus,
  type OpportunityInterest,
} from '../lib/opportunityInterest'
import {
  fetchOpportunityHubMetrics,
  fetchOwnerOpportunityInbox,
  opportunityMessagePath,
  type OpportunityHubMetrics,
  type OwnerInterestRow,
} from '../lib/opportunityHub'
import { track } from '../lib/analytics'
import { playConnectSound } from '../lib/connectSound'

const categories = [
  'All', 'Job', 'Service', 'Partnership', 'Co-founder', 'Talent', 'Project',
  'Competition', 'Funding', 'Community', 'Accelerator',
]

function matchColor(pct: number) {
  if (pct >= 70) return '#34d399'
  if (pct >= 50) return '#2dd4bf'
  return '#fbbf24'
}

type ScoredOpp = OpportunityItem & {
  personalizedReason: string
  personalizedMatch: number
}

export default function OpportunityPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [active, setActive] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [items, setItems] = useState<OpportunityItem[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [interestMap, setInterestMap] = useState<Record<string, OpportunityInterest>>({})
  const [interestSource, setInterestSource] = useState<'supabase' | 'local'>('local')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [applyFor, setApplyFor] = useState<ScoredOpp | null>(null)
  const [applyNote, setApplyNote] = useState('')
  const [showMine, setShowMine] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [hubMetrics, setHubMetrics] = useState<OpportunityHubMetrics | null>(null)
  const [inbox, setInbox] = useState<OwnerInterestRow[]>([])
  const [postApply, setPostApply] = useState<ScoredOpp | null>(null)
  const [postApplyNote, setPostApplyNote] = useState('')

  const reloadCatalog = useCallback(async () => {
    setLoading(true)
    const res = await fetchOpportunities()
    setItems(res.items)
    setIsLive(res.isLive)
    setLoading(false)
  }, [])

  const loadInterests = useCallback(async () => {
    if (!user) {
      setInterestMap({})
      return
    }
    const res = await fetchMyOpportunityInterests(user.id)
    setInterestSource(res.source)
    const map: Record<string, OpportunityInterest> = {}
    for (const row of res.items) map[row.opportunity_id] = row
    setInterestMap(map)
  }, [user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchOpportunities()
      if (cancelled) return
      setItems(res.items)
      setIsLive(res.isLive)
      setLoading(false)
      track('opportunity_view', { count: res.items.length, live: res.isLive })
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void loadInterests()
  }, [loadInterests])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await fetchOpportunityHubMetrics(30)
      if (!cancelled) setHubMetrics(m)
    })()
    return () => { cancelled = true }
  }, [interestMap, items.length])

  useEffect(() => {
    if (!user) {
      setInbox([])
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await fetchOwnerOpportunityInbox(user.id)
      if (!cancelled) setInbox(res.items)
    })()
    return () => { cancelled = true }
  }, [user, interestMap])

  useEffect(() => {
    const focusId = (location.state as { focusId?: string } | null)?.focusId
    if (!focusId || loading) return
    setExpandedId(focusId)
    const el = document.getElementById(`opp-${focusId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [location.state, loading, items])

  const openCreate = () => {
    if (!user) {
      navigate('/login')
      return
    }
    setCreateOpen(true)
  }

  const messagePoster = (o: OpportunityItem, status?: InterestStatus | null, note?: string) => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!o.ownerId || o.ownerId === user.id) return
    void playConnectSound()
    navigate(
      opportunityMessagePath({
        ownerId: o.ownerId,
        title: o.title,
        opportunityId: o.id,
        note,
        status: status || 'interested',
      }),
    )
  }

  const filtered = active === 'All' ? items : items.filter(o => o.category === active)

  const withReasons = useMemo(() =>
    filtered
      .map(o => ({
        ...o,
        personalizedReason: opportunityReasonForUser(profile, o.aiReason, o.title),
        personalizedMatch: scoreOpportunityForUser(profile, o),
      }))
      .sort((a, b) => b.personalizedMatch - a.personalizedMatch),
  [filtered, profile])

  const myList = useMemo(() => Object.values(interestMap), [interestMap])

  const saveInterest = async (
    o: ScoredOpp,
    status: 'interested' | 'applied',
    note?: string,
  ) => {
    if (!user) {
      navigate('/login')
      return
    }
    setBusyId(o.id)
    setError('')
    setSuccess('')
    const res = await upsertOpportunityInterest({
      userId: user.id,
      opportunityId: o.id,
      title: o.title,
      status,
      note,
      matchScore: o.personalizedMatch,
      ownerId: o.ownerId,
      slug: o.slug,
      actorName: profile?.full_name || user.email?.split('@')[0] || 'Someone',
    })
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setInterestSource(res.source)
    void import('../lib/engagement').then(m => m.recordEngagementAction('opportunity_interest'))
    await loadInterests()
    if (status === 'applied') {
      setPostApply(o)
      setPostApplyNote(note || '')
      setApplyFor(null)
      setApplyNote('')
      setSuccess(
        o.ownerId && o.ownerId !== user.id
          ? 'Apply intent saved — message the poster to start the conversation.'
          : 'Apply intent saved.',
      )
    } else {
      setSuccess('Interest saved. The poster is notified when the listing is Live.')
    }
  }

  const markInterest = (o: ScoredOpp) => {
    void saveInterest(o, 'interested')
  }

  const openApply = (o: ScoredOpp) => {
    if (!user) {
      navigate('/login')
      return
    }
    setApplyNote(interestMap[o.id]?.note || '')
    setApplyFor(o)
  }

  const withdraw = async (opportunityId: string) => {
    if (!user) return
    setBusyId(opportunityId)
    const res = await withdrawOpportunityInterest(user.id, opportunityId)
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    await loadInterests()
  }

  const statusOf = (id: string): InterestStatus | null => interestMap[id]?.status || null

  return (
    <div className="min-h-full relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-50"
        style={{ background: 'radial-gradient(ellipse 65% 80% at 15% 0%, rgba(251,191,36,0.14), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-5xl mx-auto">
        <header className="mb-7">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Briefcase size={18} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Opportunity Hub</h1>
            <StatusBadge kind={isLive ? 'live' : 'demo'} label={isLive ? 'Live catalog' : 'Demo catalog'} />
            <StatusBadge kind="live" label="0→1 loop" />
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-3">
            Create → public page → apply → message → outcome. Ranked by{' '}
            <span className="text-teal-300 font-semibold">fit from your Digital Twin</span>.
            Interest / apply is free; featured listings = Soon.
          </p>
          <div className="flex flex-wrap gap-1.5 items-center mb-3">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Plus size={14} /> Create opportunity
            </button>
            <StatusBadge
              kind={isLive ? 'live' : 'demo'}
              label={isLive ? 'Supabase catalog' : 'Demo fallback'}
            />
            <StatusBadge kind="live" label="Twin fit scores" />
            <StatusBadge
              kind={interestSource === 'supabase' ? 'live' : 'partial'}
              label={interestSource === 'supabase' ? 'Interest / Apply Live' : 'Interest local fallback'}
            />
            <StatusBadge kind="soon" label="Featured = Soon" />
            {user && myList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMine(s => !s)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-300 border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 rounded-lg"
              >
                <Inbox size={12} />
                My interests ({myList.length})
              </button>
            )}
            {user && inbox.length > 0 && (
              <button
                type="button"
                onClick={() => setShowInbox(s => !s)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-200 border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 rounded-lg"
              >
                <Users size={12} />
                Applications ({inbox.length})
              </button>
            )}
          </div>

          {hubMetrics?.tableReady && (
            <div
              className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-2xl border border-white/[0.07] p-3"
              style={{ background: 'rgba(0,0,0,0.28)' }}
            >
              <div className="col-span-2 sm:col-span-5 flex items-center gap-1.5 mb-0.5">
                <BarChart3 size={12} className="text-amber-300" />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Hub outcomes · last {hubMetrics.windowDays}d
                </p>
              </div>
              {[
                ['Created', hubMetrics.created],
                ['Interest', hubMetrics.interestMarked],
                ['Applied', hubMetrics.applied],
                ['Public views', hubMetrics.publicViews],
                ['Conversations', hubMetrics.conversationsStarted],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-2">
                  <p className="text-lg font-black text-white leading-none">{value}</p>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">{label}</p>
                </div>
              ))}
            </div>
          )}
        </header>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/25 text-teal-200 text-sm flex flex-wrap items-center gap-2 justify-between">
            <span>{success}</span>
            {postApply?.ownerId && postApply.ownerId !== user?.id && (
              <button
                type="button"
                onClick={() => messagePoster(postApply, 'applied', postApplyNote || interestMap[postApply.id]?.note || undefined)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                <MessageCircle size={12} /> Message poster
              </button>
            )}
          </div>
        )}

        {showInbox && user && (
          <section
            className="mb-5 rounded-2xl border border-amber-500/20 p-4"
            style={{ background: 'linear-gradient(160deg, rgba(40,28,12,0.95), rgba(10,14,22,0.98))' }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-white text-sm font-bold">Applications on your listings</p>
              <button type="button" onClick={() => setShowInbox(false)} className="text-slate-500 hover:text-white p-1">
                <X size={14} />
              </button>
            </div>
            {inbox.length === 0 ? (
              <p className="text-slate-500 text-xs">No applies yet — share your public /o page.</p>
            ) : (
              <ul className="space-y-2">
                {inbox.map(row => (
                  <li
                    key={`${row.opportunity_id}-${row.user_id}`}
                    className="flex flex-wrap items-center gap-2 text-xs border border-white/5 rounded-xl px-3 py-2 bg-black/20"
                  >
                    <span className="text-white font-semibold min-w-0 truncate">
                      {row.applicant_name}
                    </span>
                    <span className="text-slate-500 truncate flex-1">{row.opportunity_title}</span>
                    <span className={`px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider text-[10px] ${
                      row.status === 'applied'
                        ? 'text-amber-200 border-amber-500/30 bg-amber-500/10'
                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    }`}>
                      {row.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void playConnectSound()
                        navigate(
                          opportunityMessagePath({
                            ownerId: row.user_id,
                            title: row.opportunity_title || 'your opportunity',
                            opportunityId: row.opportunity_id,
                            note: row.note,
                            status: row.status,
                            as: 'owner',
                          }),
                        )
                      }}
                      className="inline-flex items-center gap-1 text-teal-300 font-semibold"
                    >
                      <MessageCircle size={12} /> Reply
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showMine && user && (
          <section
            className="mb-5 rounded-2xl border border-white/[0.07] p-4"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-white text-sm font-bold">Your interests & apply intents</p>
              <button type="button" onClick={() => setShowMine(false)} className="text-slate-500 hover:text-white p-1">
                <X size={14} />
              </button>
            </div>
            {myList.length === 0 ? (
              <p className="text-slate-500 text-xs">None yet — mark interest or apply on a card below.</p>
            ) : (
              <ul className="space-y-2">
                {myList.map(row => (
                  <li
                    key={row.opportunity_id}
                    className="flex flex-wrap items-center gap-2 text-xs border border-white/5 rounded-xl px-3 py-2 bg-black/20"
                  >
                    <span className="text-white font-semibold flex-1 min-w-0 truncate">
                      {row.opportunity_title || row.opportunity_id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider text-[10px] ${
                      row.status === 'applied'
                        ? 'text-amber-200 border-amber-500/30 bg-amber-500/10'
                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    }`}>
                      {row.status}
                    </span>
                    {typeof row.match_score === 'number' && (
                      <span className="text-slate-500">{row.match_score}% fit</span>
                    )}
                    <button
                      type="button"
                      disabled={busyId === row.opportunity_id}
                      onClick={() => void withdraw(row.opportunity_id)}
                      className="text-slate-400 hover:text-rose-300 font-semibold"
                    >
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {interestSource === 'local' && (
              <p className="text-[11px] text-amber-200/80 mt-3">
                Saved on this device. Run <code className="text-teal-300">supabase_opportunity_interest.sql</code> for account sync.
              </p>
            )}
          </section>
        )}

        <div
          className="flex gap-1 overflow-x-auto pb-1 mb-6 p-1 rounded-2xl border border-white/10"
          style={{ background: 'rgba(0,0,0,0.35)' }}
        >
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                active === c ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
              style={active === c ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : undefined}
            >
              {c}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-[11px] text-slate-500 mb-3">
            {withReasons.length} opportunit{withReasons.length === 1 ? 'y' : 'ies'}
            {active !== 'All' ? ` · ${active}` : ''} · sorted by match
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <Loader2 size={18} className="animate-spin text-amber-400" /> Loading opportunities…
          </div>
        ) : withReasons.length === 0 ? (
          <div
            className="rounded-2xl border border-white/[0.07] p-10 text-center"
            style={{ background: 'rgba(14,20,25,0.6)' }}
          >
            <p className="text-white font-semibold mb-1">No opportunities in this filter</p>
            <p className="text-slate-500 text-sm">Try All or another category.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3.5">
            {withReasons.map((o, i) => {
              const pct = o.personalizedMatch
              const accent = matchColor(pct)
              const status = statusOf(o.id)
              const open = expandedId === o.id
              const busy = busyId === o.id

              return (
                <article
                  id={`opp-${o.id}`}
                  key={o.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15"
                  style={{
                    background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))',
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl"
                    style={{ background: accent }}
                  />

                  <div className="relative p-4 sm:p-5">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${o.iconColor} flex items-center justify-center flex-shrink-0 shadow-lg`}
                      >
                        <MockIcon name={o.iconName} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-white font-bold text-[15px] leading-snug">{o.title}</h3>
                          <div
                            className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                            style={{
                              color: accent,
                              borderColor: `${accent}44`,
                              background: `${accent}18`,
                            }}
                          >
                            <Zap size={10} />
                            {pct}%
                          </div>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">{o.subtitle}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-200 bg-white/10 px-2 py-0.5 rounded-full">
                            {o.prize}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock4 size={10} />
                            {o.deadline}
                          </span>
                          {o.category && (
                            <span className="text-[10px] text-slate-500 border border-white/10 px-2 py-0.5 rounded-full">
                              {o.category}
                            </span>
                          )}
                          {status && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              status === 'applied'
                                ? 'text-amber-200 border-amber-500/30 bg-amber-500/10'
                                : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                            }`}>
                              {status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => markInterest(o)}
                        disabled={busy || status === 'interested' || status === 'applied'}
                        className={`flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 ${
                          status === 'interested' || status === 'applied'
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'text-white'
                        }`}
                        style={
                          status === 'interested' || status === 'applied'
                            ? undefined
                            : { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
                        }
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Heart size={12} fill={status ? 'currentColor' : 'none'} />}
                        {status === 'interested' || status === 'applied' ? 'Interested' : 'Mark interest'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openApply(o)}
                        disabled={busy || status === 'applied'}
                        className={`flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors disabled:opacity-60 ${
                          status === 'applied'
                            ? 'text-amber-200 border-amber-500/35 bg-amber-500/10'
                            : 'text-amber-100 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
                        }`}
                      >
                        <Send size={12} />
                        {status === 'applied' ? 'Applied' : 'Apply interest'}
                      </button>
                      {o.ownerId && o.ownerId !== user?.id && (
                        <button
                          type="button"
                          onClick={() => messagePoster(o, status, interestMap[o.id]?.note || undefined)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 border border-white/10 hover:border-teal-500/30 hover:text-teal-200"
                        >
                          <MessageCircle size={12} /> Message
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(opportunityPublicPath(o))}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
                        title="Public page"
                      >
                        <ExternalLink size={12} /> Public
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = open ? null : o.id
                          if (next) track('opportunity_expand', { id: o.id, match: pct })
                          setExpandedId(next)
                        }}
                        className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          open
                            ? 'text-teal-200 border-teal-500/35 bg-teal-500/10'
                            : 'text-slate-300 border-white/10 bg-white/[0.03] hover:border-white/20'
                        }`}
                      >
                        <Sparkles size={12} />
                        Why
                        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="relative px-4 sm:px-5 pb-5">
                      <div
                        className="rounded-xl border border-teal-500/20 p-4"
                        style={{ background: 'rgba(20,184,166,0.08)' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles size={12} className="text-teal-400" />
                          <p className="text-teal-300 text-[10px] font-bold uppercase tracking-[0.12em]">
                            Twin fit reason
                          </p>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">{o.personalizedReason}</p>
                        <button
                          type="button"
                          onClick={() => navigate('/twin')}
                          className="mt-3 text-xs text-teal-300 font-semibold hover:text-teal-200"
                        >
                          Improve twin signals →
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {applyFor && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => !busyId && setApplyFor(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl"
            style={{ background: 'linear-gradient(160deg, #12182b, #0a0f1c)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/90 mb-0.5">
                  Apply interest · no payment
                </p>
                <h2 className="text-white font-bold text-base leading-snug">{applyFor.title}</h2>
                <p className="text-slate-500 text-xs mt-1">{applyFor.personalizedMatch}% twin fit · intent only</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyFor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              This records your intent on Pi — not a formal application or payment. Teams can follow up later when marketplace / intro routing ships.
            </p>
            <textarea
              value={applyNote}
              onChange={e => setApplyNote(e.target.value)}
              rows={3}
              placeholder="Optional note: why you’re a fit, timeline, or what you’re looking for…"
              className="w-full mb-3 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => setApplyFor(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => void saveInterest(applyFor, 'applied', applyNote)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {busyId === applyFor.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Submit apply interest
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && user && (
        <CreateOpportunityModal
          open
          ownerId={user.id}
          onClose={() => setCreateOpen(false)}
          onCreated={item => {
            setItems(prev => [item, ...prev.filter(p => p.id !== item.id)])
            setError('')
            setSuccess('Published live — public page is ready to share.')
            setIsLive(true)
            void reloadCatalog()
            navigate(opportunityPublicPath(item))
          }}
        />
      )}
    </div>
  )
}
