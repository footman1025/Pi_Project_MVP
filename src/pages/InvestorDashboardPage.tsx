import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Sparkles, Building2, MapPin, ArrowLeft, Radar, Target, Cpu, Globe2,
  Layers, TrendingUp, Route, Bot, Activity, ArrowRight,
} from 'lucide-react'
import { investorSearchPresets, runInvestorSearch } from '../data/investorDemo'
import { track } from '../lib/analytics'
import StatusBadge from '../components/StatusBadge'

const visionBullets = [
  'AI-native human opportunity operating system — not another social feed.',
  'Digital Twin turns skills and goals into ranked intros and opportunities.',
  'One ecosystem: identity, matching, communities, opportunities, and investor intelligence.',
]

const roadmap = [
  { phase: 'Now', items: ['SEO + growth infra', 'Market expansion (/grow · invites · partners · discuss)', 'Investor Demo + Transparency', 'Traction & Meet Pi AI'] },
  { phase: 'Next', items: ['Stronger graph density', 'Deeper partner pipelines', 'Measured acquisition loops'] },
  { phase: 'Later', items: ['Apply / marketplace', 'Enterprise workspace', 'Pi Earth / Autopilot concepts'] },
]

const architecture = [
  { label: 'Frontend', detail: 'React + Vite + TypeScript' },
  { label: 'Data & auth', detail: 'Supabase (Postgres, RLS, realtime)' },
  { label: 'AI / push', detail: 'Serverless APIs on Vercel (Groq, Web Push, email)' },
  { label: 'Honesty layer', detail: 'Live / Partial / Demo / Soon badges' },
]

const aiCaps = [
  'Digital Twin from profile signals (rules-based; full LLM twin later)',
  'Ranked matching with explicit “why” reasons',
  'Opportunity fit scoring against twin',
  'Meet Pi AI — first contact + human handoff with context',
  'AI suggestions (match + opportunity) with cooldown — no spam duplicates',
]

const marketPoints = [
  'People seeking co-founders, capital, talent, and careers worldwide',
  'Investors and partners who need an intelligent graph — not vanity metrics',
  'Creators and professionals who want distribution inside one platform',
]

/** Demo-labeled investor metrics until live Traction is shared in the room */
const investorMetrics = [
  { label: 'Activation signal', value: 'Twin + onboarding', note: 'Live product loops', kind: 'live' as const },
  { label: 'Matching', value: 'Ranked + why', note: 'Live when members exist', kind: 'live' as const },
  { label: 'Communities', value: 'Twin-ranked hubs', note: 'Live join + post', kind: 'live' as const },
  { label: 'Opportunities', value: 'Fit-scored catalog', note: 'Live catalog or demo fallback', kind: 'partial' as const },
  { label: 'Satisfaction', value: 'Would-use-again', note: 'Captured on Traction', kind: 'live' as const },
  { label: 'Deal flow search', value: 'Demo graph', note: 'Storytelling — not live deals', kind: 'demo' as const },
]

export default function InvestorDashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState(investorSearchPresets[0])
  const [submitted, setSubmitted] = useState(investorSearchPresets[0])

  const results = useMemo(() => runInvestorSearch(submitted), [submitted])

  const run = (q: string) => {
    const next = q.trim() || investorSearchPresets[0]
    setQuery(next)
    setSubmitted(next)
    track('investor_search', { q: next })
  }

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => navigate('/demo')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Pi · Investor view</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Company narrative · not just an app screen</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/transparency')}
          className="ml-auto text-xs text-slate-400 hover:text-teal-300 transition-colors hidden sm:inline mr-2">
          What’s live
        </button>
        <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 font-semibold">
          Demo search · Live product elsewhere
        </span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Vision */}
        <section>
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Product vision</p>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            An AI-native ecosystem where people, businesses, and opportunities work together.
          </h1>
          <ul className="space-y-2 mb-4">
            {visionBullets.map(b => (
              <li key={b} className="text-slate-400 text-sm flex gap-2">
                <Sparkles size={14} className="text-teal-400 shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              Open Investor Demo <ArrowRight size={14} />
            </button>
            <button type="button" onClick={() => navigate('/traction')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10">
              Live Traction
            </button>
            <button type="button" onClick={() => navigate('/connect')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10">
              Meet Pi AI
            </button>
          </div>
        </section>

        {/* Twin storytelling */}
        <section className="rounded-3xl border border-teal-500/25 p-5 sm:p-7"
          style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.14), rgba(8,13,26,0.95))' }}>
          <div className="flex items-center gap-2 mb-3">
            <Bot size={20} className="text-teal-400" />
            <h2 className="text-xl font-extrabold text-white">Digital Twin storytelling</h2>
            <StatusBadge kind="live" label="Live from profile" />
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-4 max-w-3xl">
            Traditional platforms store a profile. Pi builds a <span className="text-white font-semibold">Digital Twin</span> —
            an AI representation of skills, goals, and experience that ranks who accelerates your goals and which
            opportunities fit — with reasons you can audit. That’s why AI sits at the center of Pi, not as a chat gadget.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { t: 'Identity', d: 'Twin from role, skills, goals, experience' },
              { t: 'Action', d: 'Intros, matches, and opportunity paths' },
              { t: 'Trust', d: 'Honest Live vs Demo labeling for investors' },
            ].map(x => (
              <div key={x.t} className="rounded-xl bg-black/25 border border-white/10 px-3 py-3">
                <p className="text-white text-sm font-bold mb-1">{x.t}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core metrics / traction */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-teal-400" />
            <h2 className="text-xl font-extrabold text-white">Core metrics & maturity</h2>
          </div>
          <p className="text-slate-500 text-xs mb-4">
            Investor-facing summary of what is measurable today. Signed-in team Traction (`/traction`) holds weekly numbers.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {investorMetrics.map(m => (
              <div key={m.label} className="rounded-2xl border border-white/8 p-4"
                style={{ background: 'rgba(14,20,30,0.75)' }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] uppercase font-bold text-slate-500">{m.label}</p>
                  <StatusBadge kind={m.kind} />
                </div>
                <p className="text-white font-bold text-sm mb-1">{m.value}</p>
                <p className="text-slate-500 text-xs">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap + architecture */}
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,30,0.75)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Route size={16} className="text-amber-400" />
              <h2 className="text-white font-bold">Roadmap</h2>
            </div>
            <div className="space-y-4">
              {roadmap.map(r => (
                <div key={r.phase}>
                  <p className="text-teal-300 text-xs font-bold uppercase mb-1.5">{r.phase}</p>
                  <ul className="space-y-1">
                    {r.items.map(i => (
                      <li key={i} className="text-slate-400 text-xs flex gap-1.5">
                        <Target size={11} className="text-slate-600 mt-0.5 shrink-0" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,30,0.75)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-cyan-400" />
              <h2 className="text-white font-bold">Technical architecture</h2>
            </div>
            <div className="space-y-2">
              {architecture.map(a => (
                <div key={a.label} className="flex justify-between gap-3 text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-500">{a.label}</span>
                  <span className="text-slate-200 text-right">{a.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* AI + market */}
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,30,0.75)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={16} className="text-teal-400" />
              <h2 className="text-white font-bold">AI capabilities</h2>
            </div>
            <ul className="space-y-2">
              {aiCaps.map(c => (
                <li key={c} className="text-slate-400 text-xs leading-relaxed flex gap-2">
                  <span className="text-teal-500">·</span> {c}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,30,0.75)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Globe2 size={16} className="text-emerald-400" />
              <h2 className="text-white font-bold">Market opportunity</h2>
            </div>
            <ul className="space-y-2 mb-3">
              {marketPoints.map(c => (
                <li key={c} className="text-slate-400 text-xs leading-relaxed flex gap-2">
                  <TrendingUp size={12} className="text-emerald-500 shrink-0 mt-0.5" /> {c}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-600">
              Discipline first: validate product value and traction before heavy fundraising theatre.
            </p>
          </section>
        </div>

        {/* Opportunity graph search (kept) */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={20} className="text-teal-400" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">Search the opportunity graph</h2>
            <StatusBadge kind="demo" label="Demo deal flow" />
          </div>
          <p className="text-slate-400 text-sm max-w-2xl mb-4">
            Investors become customers. Query the Pi graph for founders, traction, technology fit, and contact paths.
          </p>

          <form
            onSubmit={e => { e.preventDefault(); run(query) }}
            className="flex gap-2 mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-teal-500/40"
          >
            <div className="flex items-center pl-3 text-slate-500">
              <Search size={16} />
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-2.5 min-w-0"
              placeholder="Find AI robotics startups in Europe raising €500k"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-2 mb-6">
            {investorSearchPresets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => run(p)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  submitted === p
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-200'
                    : 'border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Showing {results.length} graph hits for “{submitted}”
          </p>

          <div className="space-y-4">
            {results.map(h => (
              <div
                key={h.name}
                className="rounded-2xl border border-white/8 p-5"
                style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.85), rgba(8,13,26,0.95))' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    <Building2 size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">{h.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{h.stage}</span>
                      <span className="ml-auto text-teal-300 text-sm font-extrabold flex items-center gap-1">
                        <Sparkles size={14} /> {h.match}% match
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs flex items-center gap-1 mb-3">
                      <MapPin size={12} /> {h.geography} · {h.sector} · Raising {h.raising}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                      <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">Founders</p>
                        <p className="text-slate-200">{h.founders}</p>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">Traction</p>
                        <p className="text-slate-200">{h.traction}</p>
                      </div>
                      <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2 sm:col-span-2">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">Technology</p>
                        <p className="text-slate-200">{h.tech}</p>
                      </div>
                    </div>
                    <p className="text-xs text-teal-200/90 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
                      <span className="font-semibold">Contact path:</span> {h.contactPath}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pb-8">
          <button type="button" onClick={() => navigate('/connect')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            Meet Pi AI · Contact & Partnership
          </button>
          <button type="button" onClick={() => navigate('/transparency')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10">
            Engineering Transparency
          </button>
        </div>
      </div>
    </div>
  )
}
