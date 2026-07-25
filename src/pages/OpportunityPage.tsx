import { useState, useMemo } from 'react'
import { Briefcase, Sparkles, Clock4, ChevronDown, ChevronUp } from 'lucide-react'
import { mockOpportunities } from '../data/mockData'
import MockIcon from '../components/MockIcon'
import { useAuth } from '../contexts/AuthContext'
import { opportunityReasonForUser, scoreOpportunityForUser } from '../lib/matching'

const categories = ['All', 'Competition', 'Funding', 'Community', 'Co-founder', 'Talent', 'Accelerator']

export default function OpportunityPage() {
  const { profile } = useAuth()
  const [active, setActive] = useState('All')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = active === 'All' ? mockOpportunities : mockOpportunities.filter(o => o.category === active)

  const withReasons = useMemo(() =>
    filtered
      .map(o => ({
        ...o,
        personalizedReason: opportunityReasonForUser(profile, o.aiReason, o.title),
        personalizedMatch: scoreOpportunityForUser(profile, o),
      }))
      .sort((a, b) => b.personalizedMatch - a.personalizedMatch),
  [filtered, profile])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase size={22} className="text-amber-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">Opportunity Intelligence Hub</h1>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
          Discover funding, jobs, grants, accelerators, and partnerships — with{' '}
          <span className="text-teal-300 font-semibold">fit scores from your live Digital Twin</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 font-semibold">
            Listings = catalog demo (Phase 2 marketplace)
          </span>
          <span className="px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-semibold">
            Match % = live from your profile signals
          </span>
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

              <button
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                className="mt-4 w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-pi-300 bg-black/20 border border-pi-500/20 hover:bg-pi-500/10 transition-all">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} />
                  Why Pi recommends this for you
                </div>
                {expandedId === o.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {expandedId === o.id && (
              <div className="px-5 pb-5 animate-fade-in">
                <div className="p-4 rounded-xl border border-pi-500/20 bg-black/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={13} className="text-pi-400" />
                    <p className="text-pi-300 text-xs font-bold uppercase tracking-wider">Pi Intelligence</p>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{o.personalizedReason}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
