import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, Sparkles, Clock4, ChevronDown, ChevronUp, Loader2, Heart, Zap,
  Send, X, Inbox, Plus, ExternalLink, MessageCircle, BarChart3, Users, MapPin,
  ArrowRight, Star, Copy, Search, Pencil, Trash2,
} from 'lucide-react'
import MockIcon from '../components/MockIcon'
import StatusBadge from '../components/StatusBadge'
import CreateOpportunityModal from '../components/CreateOpportunityModal'
import FeatureOpportunityModal from '../components/FeatureOpportunityModal'
import { useAuth } from '../contexts/AuthContext'
import { opportunityReasonForUser, scoreOpportunityForUser } from '../lib/matching'
import {
  deactivateOpportunity,
  fetchOpportunities,
  HUB_FILTER_CATEGORIES,
  isRemoteLocation,
  opportunityPublicPath,
  trackOpportunityOutcome,
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
import {
  confirmFeaturedCheckout,
  isFeaturedActive,
} from '../lib/opportunityFeatured'
import { fetchNicheCatalog, type NicheCatalogItem } from '../lib/nicheCatalog'
import { track } from '../lib/analytics'
import { playConnectSound } from '../lib/connectSound'

const LOOP_STEPS = ['Create', 'Discover', 'Apply', 'Connect', 'Outcome'] as const
const CREATE_CORE = ['Job', 'Service', 'Co-founder', 'Partnership', 'Project'] as const

function matchColor(pct: number) {
  if (pct >= 70) return '#34d399'
  if (pct >= 50) return '#2dd4bf'
  return '#fbbf24'
}

function MatchRing({ pct }: { pct: number }) {
  const accent = matchColor(pct)
  const r = 16
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <div className="relative w-12 h-12 shrink-0" title={`${pct}% Twin fit`}>
      <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-black tabular-nums leading-none" style={{ color: accent }}>
          {pct}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 leading-none mt-0.5">
          fit
        </span>
      </div>
    </div>
  )
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
  const [featureFor, setFeatureFor] = useState<OpportunityItem | null>(null)
  const [niche, setNiche] = useState<NicheCatalogItem[]>([])
  const [nicheCopied, setNicheCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<'All' | 'Remote' | 'On-site'>('All')
  const [editItem, setEditItem] = useState<OpportunityItem | null>(null)

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
      const [m, catalog] = await Promise.all([
        fetchOpportunityHubMetrics(30),
        fetchNicheCatalog(),
      ])
      if (!cancelled) {
        setHubMetrics(m)
        setNiche(catalog)
      }
    })()
    return () => { cancelled = true }
  }, [interestMap, items.length])

  const copyNicheLinks = async () => {
    if (!niche.length) return
    const text = niche.map(n => `${n.title}\n${n.url}`).join('\n\n')
    await navigator.clipboard?.writeText(text)
    setNicheCopied(true)
    track('niche_links_copied', { count: niche.length, surface: 'opportunities' })
    setTimeout(() => setNicheCopied(false), 2000)
  }

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
    setEditItem(null)
    setCreateOpen(true)
  }

  const openEdit = (o: OpportunityItem) => {
    if (!user || o.ownerId !== user.id) return
    setEditItem(o)
    setCreateOpen(true)
  }

  const confirmDelete = async (o: OpportunityItem) => {
    if (!user || o.ownerId !== user.id) return
    const ok = window.confirm(
      `Delete “${o.title}”? This unpublishes the listing (removes it from the Hub and public page). You can’t undo this from the app.`,
    )
    if (!ok) return
    setBusyId(o.id)
    const res = await deactivateOpportunity(o.id, user.id)
    setBusyId(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setItems(prev => prev.filter(p => p.id !== o.id))
    setSuccess('Listing unpublished. It’s no longer public or discoverable.')
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

  const filterCategories = useMemo(() => {
    const present = new Set(items.map(o => o.category))
    return HUB_FILTER_CATEGORIES.filter(c => c === 'All' || present.has(c) || (CREATE_CORE as readonly string[]).includes(c))
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(o => {
      if (active !== 'All' && o.category !== active) return false
      if (locationFilter === 'Remote' && !isRemoteLocation(o.location)) return false
      if (locationFilter === 'On-site' && (isRemoteLocation(o.location) || !o.location)) return false
      if (!q) return true
      const hay = [
        o.title,
        o.subtitle,
        o.description,
        o.location,
        o.category,
        o.prize,
        ...(o.skills || []),
      ].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [items, active, locationFilter, search])

  const withReasons = useMemo(() =>
    filtered
      .map(o => ({
        ...o,
        personalizedReason: opportunityReasonForUser(profile, o.aiReason, o.title),
        personalizedMatch: scoreOpportunityForUser(profile, o),
      }))
      .sort((a, b) => {
        const af = isFeaturedActive(a) ? 1 : 0
        const bf = isFeaturedActive(b) ? 1 : 0
        if (bf !== af) return bf - af
        return b.personalizedMatch - a.personalizedMatch
      }),
  [filtered, profile])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const featured = params.get('featured')
    if (featured === 'cancel') {
      setSuccess('')
      setError('Featured checkout cancelled — no charge. Your listing stays free.')
      navigate('/opportunities', { replace: true })
      return
    }
    if (featured !== 'success') return
    const sessionId = params.get('session_id')
    if (!sessionId) {
      setError('Payment returned without a session. Contact support if you were charged.')
      navigate('/opportunities', { replace: true })
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await confirmFeaturedCheckout(sessionId)
      if (cancelled) return
      navigate('/opportunities', { replace: true })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setError('')
      setSuccess('Payment confirmed — your listing is Featured and pinned to the top.')
      void reloadCatalog()
      track('opportunity_featured_success_view', { opportunity_id: res.opportunityId })
    })()
    return () => { cancelled = true }
  }, [location.search, navigate, reloadCatalog])

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
    <div className="min-h-full relative overflow-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-20 w-[28rem] h-[28rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)' }}
        />
        <div
          className="absolute top-40 -right-16 w-[22rem] h-[22rem] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.16), transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Opportunity Hub
                </span>
                <StatusBadge kind={isLive ? 'live' : 'demo'} label={isLive ? 'Live' : 'Demo'} />
                <StatusBadge
                  kind={interestSource === 'supabase' ? 'live' : 'partial'}
                  label={interestSource === 'supabase' ? 'Apply synced' : 'Apply local'}
                />
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white tracking-tight leading-[1.1] mb-3">
                Discover & create
                <span className="block text-transparent bg-clip-text" style={{
                  backgroundImage: 'linear-gradient(135deg, #fbbf24, #f59e0b 45%, #14b8a6)',
                  WebkitBackgroundClip: 'text',
                }}>
                  real opportunities
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-[15px] leading-relaxed max-w-xl">
                Jobs, clients, co-founders, services, partnerships — ranked by Twin fit.
                Create in minutes, share a public page, apply, connect — or Feature for priority placement.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 12px 40px rgba(245,158,11,0.25)',
                }}
              >
                <Plus size={16} />
                Create opportunity
              </button>
              <div className="flex gap-2">
                {user && myList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowMine(s => !s); setShowInbox(false) }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition-colors ${
                      showMine
                        ? 'text-teal-200 border-teal-500/40 bg-teal-500/15'
                        : 'text-slate-300 border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <Inbox size={14} />
                    Mine ({myList.length})
                  </button>
                )}
                {user && inbox.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowInbox(s => !s); setShowMine(false) }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition-colors ${
                      showInbox
                        ? 'text-amber-100 border-amber-500/40 bg-amber-500/15'
                        : 'text-slate-300 border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <Users size={14} />
                    Inbox ({inbox.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Loop strip */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 mb-5">
            {LOOP_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-amber-950"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300">{step}</span>
                </div>
                {i < LOOP_STEPS.length - 1 && (
                  <ArrowRight size={12} className="text-slate-600 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          {/* Metrics */}
          {hubMetrics?.tableReady && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2"
            >
              {[
                ['Created', hubMetrics.created, '#f59e0b'],
                ['Views', hubMetrics.publicViews, '#38bdf8'],
                ['Applied', hubMetrics.applied, '#34d399'],
                ['Chats', hubMetrics.conversationsStarted, '#a78bfa'],
                ['Outcomes', hubMetrics.outcomes, '#f472b6'],
                ['Repeat', hubMetrics.repeatUsers, '#2dd4bf'],
                ['Featured', hubMetrics.featuredCheckout, '#fbbf24'],
                ['Interest', hubMetrics.interestMarked, '#94a3b8'],
              ].map(([label, value, accent]) => (
                <div
                  key={String(label)}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.07] px-3.5 py-3"
                  style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
                >
                  <div
                    className="pointer-events-none absolute -top-6 -right-4 w-16 h-16 rounded-full opacity-30 blur-2xl"
                    style={{ background: String(accent) }}
                  />
                  <div className="relative flex items-center justify-between mb-1">
                    <BarChart3 size={12} style={{ color: String(accent) }} />
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {hubMetrics.windowDays}d
                    </span>
                  </div>
                  <p className="relative text-2xl font-black text-white tabular-nums leading-none">
                    {value}
                  </p>
                  <p className="relative text-[11px] text-slate-500 mt-1.5 font-medium">{label}</p>
                </div>
              ))}
            </motion.div>
          )}

          {niche.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-amber-500/20 px-4 py-3.5"
              style={{ background: 'linear-gradient(160deg, rgba(40,28,12,0.55), rgba(10,14,22,0.85))' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <p className="text-amber-100/90 text-xs font-bold">Solo founders niche · share these</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    0→1 proof: public links → apply → chat → Featured. Watch Traction.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyNicheLinks()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-950"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  <Copy size={11} /> {nicheCopied ? 'Copied' : 'Copy all links'}
                </button>
              </div>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {niche.map(n => (
                  <li key={n.id}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-[11px] rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 hover:border-amber-500/30 transition-colors"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/70 shrink-0">
                        {n.category}
                      </span>
                      <span className="text-slate-200 font-medium truncate flex-1">{n.title}</span>
                      <ExternalLink size={10} className="text-teal-400 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </motion.header>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-200 text-sm flex flex-wrap items-center gap-2 justify-between"
            >
              <span>{success}</span>
              {postApply?.ownerId && postApply.ownerId !== user?.id && (
                <button
                  type="button"
                  onClick={() => messagePoster(postApply, 'applied', postApplyNote || interestMap[postApply.id]?.note || undefined)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  <MessageCircle size={12} /> Connect in Messages
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Owner inbox */}
        <AnimatePresence>
          {showInbox && user && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div
                className="rounded-3xl border border-amber-500/20 p-4 sm:p-5"
                style={{ background: 'linear-gradient(160deg, rgba(40,28,12,0.92), rgba(10,14,22,0.98))' }}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="text-white text-sm font-bold">Applications inbox</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Reply opens Messages. Mark outcome when you connect, hire, or pass.
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowInbox(false)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5">
                    <X size={14} />
                  </button>
                </div>
                {inbox.length === 0 ? (
                  <p className="text-slate-500 text-xs">No applies yet — share your public page.</p>
                ) : (
                  <ul className="space-y-2">
                    {inbox.map(row => (
                      <li
                        key={`${row.opportunity_id}-${row.user_id}`}
                        className="flex flex-wrap items-center gap-2 text-xs border border-white/5 rounded-2xl px-3.5 py-2.5 bg-black/25"
                      >
                        <span className="text-white font-semibold">{row.applicant_name}</span>
                        <span className="text-slate-500 truncate flex-1">{row.opportunity_title}</span>
                        <span className={`px-2 py-0.5 rounded-lg border font-bold uppercase tracking-wider text-[10px] ${
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
                          className="inline-flex items-center gap-1 text-teal-300 font-semibold px-2 py-1 rounded-lg hover:bg-teal-500/10"
                        >
                          <MessageCircle size={12} /> Connect
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            trackOpportunityOutcome({
                              opportunityId: row.opportunity_id,
                              applicantId: row.user_id,
                              outcome: 'connected',
                            })
                            setSuccess(`Outcome saved: connected with ${row.applicant_name}.`)
                          }}
                          className="inline-flex items-center gap-1 text-amber-200 font-semibold px-2 py-1 rounded-lg hover:bg-amber-500/10"
                        >
                          Mark connected
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* My interests */}
        <AnimatePresence>
          {showMine && user && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div
                className="rounded-3xl border border-white/[0.07] p-4 sm:p-5"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
              >
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div>
                    <p className="text-white text-sm font-bold">Your interests</p>
                    <p className="text-slate-500 text-xs mt-0.5">Saved apply intents on this account</p>
                  </div>
                  <button type="button" onClick={() => setShowMine(false)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5">
                    <X size={14} />
                  </button>
                </div>
                {myList.length === 0 ? (
                  <p className="text-slate-500 text-xs">None yet — mark interest or apply below.</p>
                ) : (
                  <ul className="space-y-2">
                    {myList.map(row => (
                      <li
                        key={row.opportunity_id}
                        className="flex flex-wrap items-center gap-2 text-xs border border-white/5 rounded-2xl px-3.5 py-2.5 bg-black/25"
                      >
                        <span className="text-white font-semibold flex-1 min-w-0 truncate">
                          {row.opportunity_title || row.opportunity_id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg border font-bold uppercase tracking-wider text-[10px] ${
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
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-5 backdrop-blur-xl"
          style={{ background: 'linear-gradient(180deg, rgba(8,13,26,0.92), rgba(8,13,26,0.78))' }}
        >
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Browse
            </p>
            {!loading && (
              <p className="text-[11px] text-slate-500">
                {withReasons.length} · sorted by Twin fit
              </p>
            )}
          </div>
          <div className="relative mb-2.5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title, skills, location…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none mb-2">
            {(['All', 'Remote', 'On-site'] as const).map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocationFilter(loc)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  locationFilter === loc
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                    : 'border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {loc === 'All' ? 'Any location' : loc}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {filterCategories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  active === c
                    ? 'text-white shadow-lg shadow-teal-900/40'
                    : 'text-slate-400 bg-white/[0.03] border border-white/10 hover:text-white hover:border-white/20'
                }`}
                style={
                  active === c
                    ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
                    : undefined
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="h-52 rounded-3xl border border-white/[0.06] animate-pulse"
                style={{ background: 'rgba(18,28,40,0.6)' }}
              />
            ))}
          </div>
        ) : withReasons.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center"
            style={{ background: 'rgba(14,20,25,0.45)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #f59e0b33, #d9770633)' }}
            >
              <Briefcase size={22} className="text-amber-300" />
            </div>
            <p className="text-white font-bold text-lg mb-1">No opportunities here</p>
            <p className="text-slate-500 text-sm mb-5">
              {search || locationFilter !== 'All' || active !== 'All'
                ? 'Try clearing search or filters — or publish a new listing.'
                : 'Be the first to publish in this niche.'}
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Plus size={14} /> Create opportunity
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {withReasons.map((o, i) => {
              const pct = o.personalizedMatch
              const accent = matchColor(pct)
              const status = statusOf(o.id)
              const open = expandedId === o.id
              const busy = busyId === o.id
              const featured = isFeaturedActive(o)
              const isOwner = !!(user && o.ownerId && o.ownerId === user.id)

              return (
                <motion.article
                  id={`opp-${o.id}`}
                  key={o.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.24) }}
                  className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                    featured
                      ? 'border-amber-500/40'
                      : open
                        ? 'border-teal-500/35'
                        : 'border-white/[0.07] hover:border-white/15 hover:-translate-y-0.5'
                  }`}
                  style={{
                    background: featured
                      ? 'linear-gradient(165deg, rgba(40,28,12,0.96) 0%, rgba(8,12,20,0.98) 100%)'
                      : 'linear-gradient(165deg, rgba(18,28,40,0.96) 0%, rgba(8,12,20,0.98) 100%)',
                  }}
                >
                  {featured && (
                    <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-950"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                    >
                      <Star size={10} fill="currentColor" /> Featured
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${accent}88, transparent)` }}
                  />
                  <div
                    className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-35"
                    style={{ background: accent }}
                  />

                  <div className="relative p-5">
                    <div className="flex items-start gap-3.5 mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${o.iconColor} flex items-center justify-center shrink-0 ring-1 ring-white/10`}
                      >
                        <MockIcon name={o.iconName} size={20} />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-white font-bold text-[15px] sm:text-base leading-snug tracking-tight">
                              {o.title}
                            </h3>
                            <p className="text-slate-400 text-xs leading-relaxed mt-1.5 line-clamp-2">
                              {o.subtitle}
                            </p>
                          </div>
                          <MatchRing pct={pct} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100/90 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                        <Briefcase size={10} />
                        {o.prize || 'Open'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white/[0.03] border border-white/10 px-2 py-1 rounded-lg">
                        <Clock4 size={10} />
                        {o.deadline}
                      </span>
                      {o.location && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white/[0.03] border border-white/10 px-2 py-1 rounded-lg">
                          <MapPin size={10} />
                          {o.location}
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-300 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                        {o.category}
                      </span>
                      {isOwner && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border border-white/15 text-slate-300 bg-white/[0.04]">
                          Yours
                        </span>
                      )}
                      {o.skills?.slice(0, 3).map(sk => (
                        <span
                          key={sk}
                          className="text-[10px] text-slate-400 bg-white/[0.03] border border-white/10 px-2 py-1 rounded-lg"
                        >
                          {sk}
                        </span>
                      ))}
                      {status && (
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg border ${
                          status === 'applied'
                            ? 'text-amber-200 border-amber-500/30 bg-amber-500/10'
                            : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                        }`}>
                          {status}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {isOwner ? (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white border border-white/15 hover:bg-white/5"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void confirmDelete(o)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-200 border border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                          {!featured && (
                            <button
                              type="button"
                              onClick={() => setFeatureFor(o)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-950"
                              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                            >
                              <Star size={12} fill="currentColor" /> Feature
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(opportunityPublicPath(o))}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
                          >
                            <ExternalLink size={12} /> Public
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openApply(o)}
                              disabled={busy || status === 'applied'}
                              title="Saves your application and notifies the owner. Next: Connect in Messages."
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-55 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                              style={
                                status === 'applied'
                                  ? { background: 'rgba(245,158,11,0.18)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.3)' }
                                  : { background: 'linear-gradient(135deg, #f59e0b, #d97706)' }
                              }
                            >
                              {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                              {status === 'applied' ? 'Applied' : 'Apply'}
                            </button>
                            <button
                              type="button"
                              onClick={() => markInterest(o)}
                              disabled={busy || status === 'interested' || status === 'applied'}
                              title="Soft save — owner is notified. Not an application."
                              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-55 ${
                                status === 'interested' || status === 'applied'
                                  ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                                  : 'text-slate-200 border-white/10 bg-white/[0.03] hover:border-teal-500/30 hover:text-teal-200'
                              }`}
                            >
                              <Heart size={13} fill={status ? 'currentColor' : 'none'} />
                              {status === 'interested' || status === 'applied' ? 'Saved' : 'Interest'}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {o.ownerId && (
                              <button
                                type="button"
                                onClick={() => messagePoster(o, status, interestMap[o.id]?.note || undefined)}
                                title="Opens Messages with the listing owner — this is Connect."
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 border border-white/10 hover:border-teal-500/35 hover:text-teal-200 hover:bg-teal-500/5"
                              >
                                <MessageCircle size={12} /> Connect
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(opportunityPublicPath(o))}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
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
                              className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                                open
                                  ? 'text-teal-200 border-teal-500/35 bg-teal-500/10'
                                  : 'text-slate-300 border-white/10 hover:border-white/20'
                              }`}
                            >
                              <Sparkles size={12} />
                              Why
                              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5">
                          <div
                            className="rounded-2xl border border-teal-500/20 p-4"
                            style={{ background: 'rgba(20,184,166,0.08)' }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Zap size={12} className="text-teal-400" />
                              <p className="text-teal-300 text-[10px] font-bold uppercase tracking-[0.14em]">
                                Twin fit reason
                              </p>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{o.personalizedReason}</p>
                            <button
                              type="button"
                              onClick={() => navigate('/twin')}
                              className="mt-3 inline-flex items-center gap-1 text-xs text-teal-300 font-semibold hover:text-teal-200"
                            >
                              Improve twin signals <ArrowRight size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>

      {/* Apply modal */}
      <AnimatePresence>
        {applyFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal
            onClick={() => !busyId && setApplyFor(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 sm:p-6"
              style={{
                background: 'linear-gradient(165deg, #141a28 0%, #0a0e18 100%)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="sm:hidden flex justify-center pt-0 pb-3">
                <span className="w-10 h-1 rounded-full bg-white/15" />
              </div>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/90 mb-1">
                    Apply · free
                  </p>
                  <h2 className="text-white font-bold text-lg leading-snug">{applyFor.title}</h2>
                  <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                    {applyFor.personalizedMatch}% Twin fit. Submit notifies the owner.
                    Next step is <span className="text-teal-300 font-semibold">Connect</span> in Messages — no payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setApplyFor(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={applyNote}
                onChange={e => setApplyNote(e.target.value)}
                rows={3}
                placeholder="Optional note: why you’re a fit, timeline, or what you’re looking for…"
                className="w-full mb-4 bg-black/35 border border-white/10 rounded-2xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => setApplyFor(null)}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!busyId}
                  onClick={() => void saveInterest(applyFor, 'applied', applyNote)}
                  className="flex-[1.4] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  {busyId === applyFor.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Submit apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {featureFor && (
        <FeatureOpportunityModal
          open
          item={featureFor}
          onClose={() => setFeatureFor(null)}
          onIntentRecorded={message => {
            setError('')
            setSuccess(message)
          }}
        />
      )}

      {createOpen && user && (
        <CreateOpportunityModal
          open
          ownerId={user.id}
          editItem={editItem}
          onClose={() => {
            setCreateOpen(false)
            setEditItem(null)
          }}
          onCreated={item => {
            setItems(prev => [item, ...prev.filter(p => p.id !== item.id)])
            setError('')
            setSuccess('Published live — public page is ready to share. Share the link; Apply notifies you.')
            setIsLive(true)
            void reloadCatalog()
            navigate(opportunityPublicPath(item))
          }}
          onUpdated={item => {
            setItems(prev => prev.map(p => (p.id === item.id ? item : p)))
            setError('')
            setSuccess('Listing updated — public page reflects your changes.')
            setEditItem(null)
            void reloadCatalog()
          }}
        />
      )}
    </div>
  )
}
