import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, Sparkles, Clock4, ChevronDown, ChevronUp, Loader2, Heart, Zap,
} from 'lucide-react'
import MockIcon from '../components/MockIcon'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { opportunityReasonForUser, scoreOpportunityForUser } from '../lib/matching'
import { fetchOpportunities, OpportunityItem } from '../lib/opportunities'
import { track } from '../lib/analytics'

const categories = ['All', 'Competition', 'Funding', 'Community', 'Co-founder', 'Talent', 'Accelerator']

function matchColor(pct: number) {
  if (pct >= 70) return '#34d399'
  if (pct >= 50) return '#2dd4bf'
  return '#fbbf24'
}

export default function OpportunityPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [active, setActive] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [interested, setInterested] = useState<Set<string>>(new Set())
  const [items, setItems] = useState<OpportunityItem[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const markInterest = (o: OpportunityItem & { personalizedMatch: number }) => {
    setInterested(prev => new Set(prev).add(o.id))
    track('opportunity_interest', { id: o.id, title: o.title, match: o.personalizedMatch, live: isLive })
    void import('../lib/engagement').then(m => m.recordEngagementAction('opportunity_interest'))
  }

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
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Opportunities</h1>
            <StatusBadge kind={isLive ? 'live' : 'demo'} label={isLive ? 'Live catalog' : 'Demo catalog'} />
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-3">
            Funding, roles, grants, accelerators, and partnerships — ranked by{' '}
            <span className="text-teal-300 font-semibold">fit from your Digital Twin</span>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge
              kind={isLive ? 'live' : 'demo'}
              label={isLive ? 'Supabase catalog' : 'Demo fallback'}
            />
            <StatusBadge kind="live" label="Twin fit scores" />
            <StatusBadge kind="partial" label="Interest tracked" />
          </div>
        </header>

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
              const saved = interested.has(o.id)
              const open = expandedId === o.id

              return (
                <article
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
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => markInterest(o)}
                        disabled={saved}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          saved
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'text-white'
                        }`}
                        style={saved ? undefined : { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        <Heart size={12} fill={saved ? 'currentColor' : 'none'} />
                        {saved ? 'Interest saved' : 'Mark interest'}
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
    </div>
  )
}
