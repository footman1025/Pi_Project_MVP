import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Sparkles, Clock4, ChevronDown, ChevronUp, Loader2, Heart } from 'lucide-react'
import MockIcon from '../components/MockIcon'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { opportunityReasonForUser, scoreOpportunityForUser } from '../lib/matching'
import { fetchOpportunities, OpportunityItem } from '../lib/opportunities'
import { track } from '../lib/analytics'

const categories = ['All', 'Competition', 'Funding', 'Community', 'Co-founder', 'Talent', 'Accelerator']

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
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Briefcase size={22} className="text-amber-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">Opportunity Intelligence Hub</h1>
          <StatusBadge kind={isLive ? 'live' : 'demo'} label={isLive ? 'Live catalog' : 'Demo catalog'} size="md" />
        </div>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
          Discover funding, jobs, grants, accelerators, and partnerships — with{' '}
          <span className="text-teal-300 font-semibold">fit scores from your live Digital Twin</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <StatusBadge
            kind={isLive ? 'live' : 'demo'}
            label={isLive ? 'Listings = live Supabase catalog' : 'Listings = demo fallback (run opportunities SQL)'}
            size="md"
          />
          <StatusBadge kind="live" label="Match % = live from your profile signals" size="md" />
          <StatusBadge kind="partial" label="Mark interest = tracked now" size="md" />
          <StatusBadge kind="soon" label="Apply / marketplace = Phase 2" size="md" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {categories.map(c => (
          <button key={c} onClick={() => setActive(c)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${active === c ? 'text-white border border-pi-500/40' : 'text-slate-400 border border-white/5 hover:text-white hover:border-white/10'}`}
            style={active === c ? { background: 'rgba(20,184,166,0.15)' } : {}}>
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-pi-400" /> Loading opportunities…
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {withReasons.map((o, i) => (
            <div key={o.id}
              className={`rounded-2xl border bg-gradient-to-br ${o.color} ${o.border} transition-all duration-300 animate-fade-in`}
              style={{ animationDelay: `${i * 80}ms` }}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${o.iconColor} flex items-center justify-center flex-shrink-0`}>
                    <MockIcon name={o.iconName} size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">{o.title}</h3>
                    <p className="text-slate-400 text-sm mb-3">{o.subtitle}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">{o.prize}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock4 size={11} />{o.deadline}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold ml-auto">
                        <Sparkles size={11} />{o.personalizedMatch}% match
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => markInterest(o)}
                    disabled={interested.has(o.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      interested.has(o.id)
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                        : 'text-white'
                    }`}
                    style={interested.has(o.id) ? {} : { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <Heart size={12} />
                    {interested.has(o.id) ? 'Interest saved' : 'Mark interest'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = expandedId === o.id ? null : o.id
                      if (next) track('opportunity_expand', { id: o.id, match: o.personalizedMatch })
                      setExpandedId(next)
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-pi-300 bg-black/20 border border-pi-500/20 hover:bg-pi-500/10"
                  >
                    <Sparkles size={12} />
                    Why
                    {expandedId === o.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {expandedId === o.id && (
                <div className="px-5 pb-5 animate-fade-in">
                  <div className="p-4 rounded-xl border border-pi-500/20 bg-black/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={13} className="text-pi-400" />
                      <p className="text-pi-300 text-xs font-bold uppercase tracking-wider">Pi Intelligence</p>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{o.personalizedReason}</p>
                    <button
                      type="button"
                      onClick={() => navigate('/twin')}
                      className="mt-3 text-xs text-teal-300 font-semibold hover:underline"
                    >
                      Improve twin signals for better fit →
                    </button>
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
