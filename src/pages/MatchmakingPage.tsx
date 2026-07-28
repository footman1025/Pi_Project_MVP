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
import { track } from '../lib/analytics'
import { isProfileActivated } from '../lib/traction'

export default function MatchmakingPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [animated, setAnimated] = useState(false)
  const [filter, setFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [usingLive, setUsingLive] = useState(false)
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .limit(40)

      if (cancelled) return

      if (data && data.length > 0) {
        const ranked = rankMatches(profile, data).slice(0, 12)
        setMatches(ranked)
        setUsingLive(true)
        track('match_view', { count: ranked.length, live: true })
      } else {
        setMatches([])
        setUsingLive(false)
        track('match_view', { count: 0, live: false })
      }
      setLoading(false)
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

  const liveFiltered = matches.filter(m => roleFilter(m.profile.role, filter))
  const profileReady = isProfileActivated(profile)

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto overflow-x-hidden w-full min-w-0">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Sparkles size={22} className="text-pi-400 shrink-0" />
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Pi Intelligence Engine</h1>
          <StatusBadge
            kind={usingLive ? 'live' : 'partial'}
            label={usingLive ? 'Live graph' : 'Awaiting members'}
            size="md"
          />
        </div>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Not “people you may like.” Pi ranks who can <span className="text-teal-300 font-semibold">accelerate your goals</span> —
          with live scores from skills, interests, goals, roles, location, and profile narrative.
          {!usingLive && (
            <span className="block mt-1 text-slate-500">
              The live graph needs other Pi members. Run the demo seed SQL or invite teammates — we don’t show fake match cards.
            </span>
          )}
        </p>
        {!profileReady && (
          <div className="mt-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span>Your twin signals look thin — stronger profile = better match quality.</span>
            <button type="button" onClick={() => navigate('/profile/edit')} className="text-teal-300 font-semibold hover:underline">
              Strengthen profile →
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1 scrollbar-none">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${filter === f ? 'text-white border border-pi-500/40' : 'text-slate-400 border border-white/5 hover:text-white hover:border-white/10'}`}
            style={filter === f ? { background: 'rgba(20,184,166,0.15)' } : {}}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 size={28} className="animate-spin text-pi-400 mb-3" />
          <p className="text-slate-400 text-sm">Computing matches…</p>
        </div>
      ) : usingLive ? (
        <div className="space-y-4">
          {liveFiltered.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-10">No members match this filter yet. Try “All”.</p>
          )}
          {liveFiltered.map((m, i) => {
            const p = m.profile
            const name = p.full_name || p.username || 'Member'
            const tags = [...(p.skills || []), ...(p.interests || [])].slice(0, 4)
            const id = p.id
            return (
              <div key={id}
                className="rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))',
                  opacity: animated ? 1 : 0,
                  transform: animated ? 'translateY(0)' : 'translateY(20px)',
                  transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms, border-color 0.3s ease`,
                }}>
                <div className="p-4 sm:p-5 min-w-0">
                  {/* Header: identity + match % */}
                  <div className="flex items-start gap-3 min-w-0">
                      <UserAvatar
                        url={p.avatar_url}
                        name={name}
                        id={p.id}
                        username={p.username}
                        from="/match"
                        size={56}
                        rounded="rounded-2xl"
                        className="shadow-lg shadow-pi-500/15 ring-1 ring-white/10"
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
                            <span className="inline-block mt-1 text-[11px] sm:text-xs text-slate-500 font-medium px-2 py-0.5 bg-white/5 rounded-full max-w-full truncate">
                              {p.role}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-center">
                          <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                              <circle cx="32" cy="32" r="26" fill="none"
                                stroke="url(#matchGradLive)" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={animated ? `${2 * Math.PI * 26 * (1 - m.match / 100)}` : `${2 * Math.PI * 26}`}
                                style={{ transition: `stroke-dashoffset 1.5s ease ${i * 100 + 200}ms` }}
                              />
                              <defs>
                                <linearGradient id="matchGradLive" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#14b8a6" />
                                  <stop offset="100%" stopColor="#2dd4bf" />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-extrabold text-white">{m.match}%</span>
                            </div>
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">match</p>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2 break-words">
                        {p.bio || p.ai_summary || 'Active on Pi and open to collaboration.'}
                      </p>
                    </div>
                  </div>

                  {/* Tags — full card width so they aren't squeezed */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 w-full min-w-0">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          title={tag}
                          className="inline-flex items-center gap-1 max-w-full text-[11px] sm:text-xs text-pi-300 bg-pi-500/10 border border-pi-500/20 px-2.5 py-1 rounded-full"
                        >
                          <Tag size={10} className="shrink-0 opacity-70" />
                          <span className="truncate max-w-[11rem] sm:max-w-[14rem]">{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {p.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 mt-2.5">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{p.location}</span>
                    </span>
                  )}

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => {
                        track('match_connect', { target: p.id, match: m.match })
                        if (p.username) navigate(`/p/${p.username}`, { state: { from: '/match' } })
                        else navigate('/messages')
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white pi-mark">
                      <UserRoundPlus size={14} className="shrink-0" /> Connect
                    </button>
                    <button onClick={() => {
                      track('match_message', { target: p.id, match: m.match })
                      void playConnectSound()
                      navigate(`/messages?u=${p.id}`)
                    }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20">
                      <MessageCircle size={14} className="shrink-0" /> Message
                    </button>
                    <button
                      onClick={() => {
                        const next = expandedId === id ? null : id
                        if (next) track('match_expand', { target: p.id, match: m.match })
                        setExpandedId(next)
                      }}
                      className="col-span-2 sm:ml-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15">
                      <Sparkles size={12} className="shrink-0" />
                      Why this match?
                      {expandedId === id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {expandedId === id && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 animate-fade-in">
                    <div className="p-3 sm:p-4 rounded-xl border border-pi-500/20" style={{ background: 'rgba(20,184,166,0.08)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-pi-400 shrink-0" />
                        <p className="text-pi-300 text-xs font-bold uppercase tracking-wider">Pi Intelligence — Why this match</p>
                      </div>
                      <ul className="space-y-2">
                        {m.reasons.map((reason, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-slate-300 break-words">
                            <span className="w-1.5 h-1.5 rounded-full bg-pi-400 flex-shrink-0 mt-1.5"></span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-sm text-slate-300 max-w-xl mx-auto">
          <p className="font-semibold text-amber-200 mb-2">Live match graph is empty</p>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Matching only shows real Pi members. For investor demos, run{' '}
            <code className="text-teal-300">supabase_seed_demo_members.sql</code> (or{' '}
            <code className="text-teal-300">npm run seed:demo</code>) so the graph fills with 8 demo profiles.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/search')} className="text-teal-300 font-semibold text-xs hover:underline">
              Search people →
            </button>
            <button type="button" onClick={() => navigate('/transparency')} className="text-teal-300 font-semibold text-xs hover:underline">
              What’s live →
            </button>
            <button type="button" onClick={() => navigate('/demo')} className="text-teal-300 font-semibold text-xs hover:underline">
              Scripted Investor Demo →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
