import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, MapPin, Tag, MessageCircle, UserRoundPlus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MatchResult, rankMatches } from '../lib/matching'
import { playConnectSound } from '../lib/connectSound'
import UserAvatar from '../components/UserAvatar'
import StatusBadge from '../components/StatusBadge'
import ProfileName from '../components/ProfileName'
import { MATCH_REJECT_REASONS, track, trackMatchRejected, type MatchRejectReason } from '../lib/analytics'
import { isProfileActivated } from '../lib/traction'

const RANKING_VERSION = 'v1-skills'

export default function MatchmakingPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [animated, setAnimated] = useState(false)
  const [filter, setFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [usingLive, setUsingLive] = useState(false)
  const [rejectForId, setRejectForId] = useState<string | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const filters = ['All', 'Co-founders', 'Investors', 'Designers', 'Engineers', 'Mentors']

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [matches])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      if (!profile) {
        setUsingLive(false)
        setMatches([])
        setLoading(false)
        return
      }
      try {
        const result = await Promise.race([
          supabase
            .from('profiles')
            .select('*')
            .neq('id', user?.id || '')
            .limit(40),
          new Promise<{ data: null; error: { message: string } }>(resolve =>
            setTimeout(
              () => resolve({ data: null, error: { message: 'Match query timed out' } }),
              12000,
            ),
          ),
        ])

        if (cancelled) return

        const data = result.data
        if (data && data.length > 0) {
          const ranked = rankMatches(profile, data).slice(0, 12)
          setMatches(ranked)
          setUsingLive(true)
          track('match_view', {
            count: ranked.length,
            live: true,
            ranking_version: RANKING_VERSION,
          })
        } else {
          setMatches([])
          setUsingLive(false)
          track('match_view', { count: 0, live: false, ranking_version: RANKING_VERSION })
        }
      } catch {
        if (!cancelled) {
          setMatches([])
          setUsingLive(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profile, user])

  const roleFilter = (role: string | null | undefined, f: string) => {
    if (f === 'All' || !role) return f === 'All'
    const r = role.toLowerCase()
    if (f === 'Co-founders') return /founder|entrepreneur|co-founder/.test(r)
    if (f === 'Investors') return /investor|angel|vc|venture/.test(r)
    if (f === 'Designers') return /design|ux|ui/.test(r)
    if (f === 'Engineers') return /engineer|developer|technical|software/.test(r)
    if (f === 'Mentors') return /mentor|advisor|coach/.test(r)
    return true
  }

  const liveFiltered = matches.filter(
    m => !dismissedIds.has(m.profile.id) && roleFilter(m.profile.role, filter),
  )
  const profileReady = isProfileActivated(profile)

  const passMatch = (m: MatchResult, reason: MatchRejectReason, rank: number) => {
    const p = m.profile
    trackMatchRejected({
      target: p.id,
      match: m.match,
      reason,
      rankingVersion: RANKING_VERSION,
      rank,
      topSignals: m.reasons.slice(0, 3).join(' | ').slice(0, 180),
    })
    setDismissedIds(prev => new Set(prev).add(p.id))
    setRejectForId(null)
    if (expandedId === p.id) setExpandedId(null)
  }

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-5xl mx-auto w-full min-w-0">
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Twin ranking
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Matching
                </h1>
                <StatusBadge
                  kind={usingLive ? 'live' : 'partial'}
                  label={usingLive ? 'Live graph' : 'Awaiting members'}
                />
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px] max-w-2xl">
            Not “people you may like.” Pi ranks who can{' '}
            <span className="text-teal-300/90 font-medium">accelerate your goals</span>
            {' '}— skills, interests, roles, location, and narrative.
            {!usingLive && (
              <span className="block mt-1 text-slate-600">
                Needs other members — no fake cards. Seed demo SQL or invite teammates.
              </span>
            )}
          </p>
          {!profileReady && (
            <div className="mt-4 ml-0 sm:ml-[52px] p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] text-xs text-slate-300 flex flex-wrap items-center gap-2">
              <span>Twin signals look thin — stronger profile = better match quality.</span>
              <button type="button" onClick={() => navigate('/profile/edit')} className="text-teal-300 font-semibold hover:underline">
                Strengthen profile →
              </button>
            </div>
          )}
        </header>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {filters.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                filter === f
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 size={28} className="animate-spin text-teal-400 mb-3" />
            <p className="text-slate-500 text-sm">Computing matches…</p>
          </div>
        ) : usingLive ? (
          <div className="space-y-3.5">
            {liveFiltered.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-10">No members match this filter yet. Try “All”.</p>
            )}
            {liveFiltered.map((m, i) => {
              const p = m.profile
              const name = p.full_name || p.username || 'Member'
              const tags = [...(p.skills || []), ...(p.interests || [])].slice(0, 4)
              const id = p.id
              const gradId = `matchGrad-${id}`
              return (
                <article
                  key={id}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all"
                  style={{
                    background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))',
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'translateY(0)' : 'translateY(16px)',
                    transition: `opacity 0.45s ease ${i * 70}ms, transform 0.45s ease ${i * 70}ms, border-color 0.25s ease`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl"
                    style={{ background: '#14b8a6' }}
                  />
                  <div className="relative p-4 sm:p-5 min-w-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar
                        url={p.avatar_url}
                        name={name}
                        id={p.id}
                        username={p.username}
                        from="/match"
                        size={52}
                        rounded="rounded-2xl"
                        className="ring-1 ring-white/10"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <ProfileName
                              name={name}
                              username={p.username}
                              from="/match"
                              className="font-bold text-white text-base sm:text-lg truncate block"
                            />
                            {p.role && (
                              <span className="inline-block mt-1 text-[11px] text-slate-500 font-medium px-2 py-0.5 bg-black/30 border border-white/[0.06] rounded-lg max-w-full truncate">
                                {p.role}
                              </span>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-center">
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                <circle
                                  cx="32" cy="32" r="26" fill="none"
                                  stroke={`url(#${gradId})`} strokeWidth="6" strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 26}`}
                                  strokeDashoffset={animated ? `${2 * Math.PI * 26 * (1 - m.match / 100)}` : `${2 * Math.PI * 26}`}
                                  style={{ transition: `stroke-dashoffset 1.4s ease ${i * 80 + 180}ms` }}
                                />
                                <defs>
                                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#2dd4bf" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums">{m.match}%</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-0.5">match</p>
                          </div>
                        </div>
                        <p className="text-slate-400 text-sm mt-2 line-clamp-2 break-words leading-relaxed">
                          {p.bio || p.ai_summary || 'Active on Pi and open to collaboration.'}
                        </p>
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3.5 w-full min-w-0">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            title={tag}
                            className="inline-flex items-center gap-1 max-w-full text-[11px] text-teal-300/90 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg"
                          >
                            <Tag size={10} className="shrink-0 opacity-70" />
                            <span className="truncate max-w-[11rem] sm:max-w-[14rem]">{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {p.location && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-2.5">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </span>
                    )}

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4 pt-3.5 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          track('match_connect', {
                            target: p.id,
                            match: m.match,
                            ranking_version: RANKING_VERSION,
                            rank: i + 1,
                          })
                          void import('../lib/engagement').then(mod => mod.recordEngagementAction('match_intro'))
                          if (p.username) navigate(`/p/${p.username}`, { state: { from: '/match' } })
                          else navigate('/messages')
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        <UserRoundPlus size={14} className="shrink-0" /> Connect
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          track('match_message', {
                            target: p.id,
                            match: m.match,
                            ranking_version: RANKING_VERSION,
                            rank: i + 1,
                          })
                          void import('../lib/engagement').then(mod => mod.recordEngagementAction('match_intro'))
                          void playConnectSound()
                          navigate(`/messages?u=${p.id}`)
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20"
                      >
                        <MessageCircle size={14} className="shrink-0" /> Message
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectForId(rejectForId === id ? null : id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-400 border border-white/10 hover:border-rose-500/30 hover:text-rose-200"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = expandedId === id ? null : id
                          if (next) {
                            track('match_expand', {
                              target: p.id,
                              match: m.match,
                              ranking_version: RANKING_VERSION,
                              rank: i + 1,
                            })
                          }
                          setExpandedId(next)
                        }}
                        className="col-span-2 sm:ml-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
                      >
                        <Sparkles size={12} className="shrink-0" />
                        Why this match?
                        {expandedId === id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {rejectForId === id && (
                      <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-3">
                        <p className="text-[11px] font-semibold text-rose-100/90 mb-2">
                          Why pass? (WP001 rejection signal)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {MATCH_REJECT_REASONS.map(r => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => passMatch(m, r.id, i + 1)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-300 border border-white/10 hover:border-rose-400/40 hover:text-white bg-black/20"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {expandedId === id && (
                    <div className="relative px-4 sm:px-5 pb-4 sm:pb-5">
                      <div
                        className="p-3.5 sm:p-4 rounded-xl border border-teal-500/20"
                        style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(10,14,22,0.6))' }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={14} className="text-teal-400 shrink-0" />
                          <p className="text-teal-300/90 text-[10px] font-bold uppercase tracking-[0.14em]">
                            Why this match
                          </p>
                        </div>
                        <ul className="space-y-2">
                          {m.reasons.map((reason, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-slate-300 break-words leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 mt-1.5" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-2xl border border-amber-500/20 p-5 sm:p-6 max-w-xl"
            style={{ background: 'linear-gradient(160deg, rgba(245,158,11,0.08), rgba(10,14,22,0.95))' }}
          >
            <p className="font-semibold text-amber-200 mb-2">Live match graph is empty</p>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              Matching only shows real Pi members. For investor demos, run{' '}
              <code className="text-teal-300">supabase_seed_demo_members.sql</code> (or{' '}
              <code className="text-teal-300">npm run seed:demo</code>) so the graph fills with 8 demo profiles.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-100 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
              >
                Search people →
              </button>
              <button
                type="button"
                onClick={() => navigate('/transparency')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
              >
                What’s live →
              </button>
              <button
                type="button"
                onClick={() => navigate('/demo')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
              >
                Investor Demo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
