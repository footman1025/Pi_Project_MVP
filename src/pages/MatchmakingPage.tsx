import { useState, useEffect } from 'react'
import { Sparkles, MapPin, Tag, MessageCircle, UserRoundPlus, ChevronDown, ChevronUp } from 'lucide-react'
import { mockMatches } from '../data/mockData'

export default function MatchmakingPage() {
  const [animated, setAnimated] = useState(false)
  const [filter, setFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const filters = ['All', 'Co-founders', 'Investors', 'Designers', 'Engineers', 'Mentors']

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={22} className="text-pi-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">AI Matching</h1>
          <span className="ml-2 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
            Live
          </span>
        </div>
        <p className="text-slate-400">Pi analyzed your profile and goals to surface the most compatible connections. <span className="text-amber-400 text-xs font-semibold border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-full ml-1">Demo data</span></p>
      </div>

      {/* Filter tabs */}
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

      {/* Match cards */}
      <div className="space-y-4">
        {mockMatches.map((m, i) => (
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
                {/* Avatar */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                  {m.avatar}
                </div>

                {/* Info */}
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

                {/* Match score */}
                <div className="flex-shrink-0 text-center">
                  <div className="relative w-16 h-16 mb-2">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                      <circle cx="32" cy="32" r="26" fill="none"
                        stroke="url(#matchGrad)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={animated ? `${2 * Math.PI * 26 * (1 - m.match / 100)}` : `${2 * Math.PI * 26}`}
                        style={{ transition: `stroke-dashoffset 1.5s ease ${i * 100 + 200}ms` }}
                      />
                      <defs>
                        <linearGradient id="matchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
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

              {/* Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  <UserRoundPlus size={15} /> Connect
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all">
                  <MessageCircle size={15} /> Message
                </button>

                {/* Why Pi recommends this */}
                <button
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15 transition-all">
                  <Sparkles size={12} />
                  Why this match?
                  {expandedId === m.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>
            </div>

            {/* AI Reasoning panel */}
            {expandedId === m.id && (
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
    </div>
  )
}
