import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, MapPin, Tag, MessageCircle, UserRoundPlus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { mockMatches } from '../data/mockData'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MatchResult, rankMatches } from '../lib/matching'

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
        setMatches(rankMatches(profile, data).slice(0, 12))
        setUsingLive(true)
      } else {
        setMatches([])
        setUsingLive(false)
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
  const demoFiltered = filter === 'All'
    ? mockMatches
    : mockMatches.filter(m => roleFilter(m.role, filter))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={22} className="text-pi-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">AI Matching</h1>
          <span className={`ml-2 text-xs px-2.5 py-1 rounded-full font-semibold border ${
            usingLive
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
          }`}>
            {usingLive ? 'Live profiles' : 'Demo data'}
          </span>
        </div>
        <p className="text-slate-400">
          {usingLive
            ? 'Pi scored real members against your role, skills, interests, and goals.'
            : 'Complete your profile and invite teammates — live matches appear when other Pi members exist. Showing sample matches meanwhile.'}
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all
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
            <p className="text-slate-500 text-sm text-center py-10">No members match this filter yet.</p>
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
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-white text-lg cursor-pointer hover:text-pi-300"
                          onClick={() => p.username && navigate(`/p/${p.username}`)}>{name}</h3>
                        {p.role && <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-white/5 rounded-full">{p.role}</span>}
                      </div>
                      <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                        {p.bio || p.ai_summary || 'Active on Pi and open to collaboration.'}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs text-pi-300 bg-pi-500/10 border border-pi-500/20 px-2.5 py-1 rounded-full">
                              <Tag size={10} />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.location && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin size={12} />{p.location}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-center">
                      <div className="relative w-16 h-16 mb-2">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
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
                          <span className="text-sm font-extrabold text-white">{m.match}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">match</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t border-white/5 flex-wrap">
                    <button
                      onClick={() => p.username ? navigate(`/p/${p.username}`) : navigate('/messages')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white pi-mark">
                      <UserRoundPlus size={15} /> Connect
                    </button>
                    <button onClick={() => navigate('/messages')}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20">
                      <MessageCircle size={15} /> Message
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === id ? null : id)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15">
                      <Sparkles size={12} />
                      Why this match?
                      {expandedId === id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {expandedId === id && (
                  <div className="px-5 pb-5 animate-fade-in">
                    <div className="p-4 rounded-xl border border-pi-500/20" style={{ background: 'rgba(20,184,166,0.08)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-pi-400" />
                        <p className="text-pi-300 text-xs font-bold uppercase tracking-wider">Pi Intelligence — Why this match</p>
                      </div>
                      <ul className="space-y-2">
                        {m.reasons.map((reason, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
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
        <div className="space-y-4">
          {demoFiltered.map((m, i) => (
            <div key={m.id}
              className="rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease ${i * 100}ms, transform 0.5s ease ${i * 100}ms, border-color 0.3s ease`,
              }}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-white text-lg">{m.name}</h3>
                      <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-white/5 rounded-full">{m.role}</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{m.description}</p>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {m.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-xs text-pi-300 bg-pi-500/10 border border-pi-500/20 px-2.5 py-1 rounded-full">
                          <Tag size={10} />{tag}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} />{m.location}
                    </span>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <div className="relative w-16 h-16 mb-2">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                        <circle cx="32" cy="32" r="26" fill="none"
                          stroke="url(#matchGradDemo)" strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 26}`}
                          strokeDashoffset={animated ? `${2 * Math.PI * 26 * (1 - m.match / 100)}` : `${2 * Math.PI * 26}`}
                          style={{ transition: `stroke-dashoffset 1.5s ease ${i * 100 + 200}ms` }}
                        />
                        <defs>
                          <linearGradient id="matchGradDemo" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#2dd4bf" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-extrabold text-white">{m.match}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">match</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white pi-mark">
                    <UserRoundPlus size={15} /> Connect
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10">
                    <MessageCircle size={15} /> Message
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === String(m.id) ? null : String(m.id))}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20">
                    <Sparkles size={12} /> Why this match?
                    {expandedId === String(m.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>
              {expandedId === String(m.id) && (
                <div className="px-5 pb-5 animate-fade-in">
                  <div className="p-4 rounded-xl border border-pi-500/20" style={{ background: 'rgba(20,184,166,0.08)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-pi-400" />
                      <p className="text-pi-300 text-xs font-bold uppercase tracking-wider">Pi Intelligence — Why this match</p>
                    </div>
                    <ul className="space-y-2">
                      {m.aiReasons.map((reason, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-pi-400 flex-shrink-0 mt-1.5"></span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
