import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Sparkles, Building2, MapPin, ArrowLeft, Radar, Target, Cpu, Globe2,
  Layers, TrendingUp, Route, Bot, Activity, ArrowRight, LayoutDashboard,
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
  { phase: 'Now', items: ['SEO + growth infra', 'Pi Social Opportunity Feed (streams)', 'UGE experience prefs', 'Trust & Safety + Truth Guarantee principles', 'Investor Demo + Transparency'] },
  { phase: 'Next', items: ['Deeper Twin ranking on Feed', 'Moderation + appeals pipeline', 'Stronger graph density', 'Measured acquisition loops'] },
  { phase: 'Later', items: ['Trust-based monetization', 'E2E private messaging', 'Verification tiers', 'Apply / marketplace', 'Pi Earth / Autopilot'] },
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

const panelStyle = {
  background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))',
} as const

function SectionIcon({
  icon: Icon,
  accent = 'teal',
}: {
  icon: typeof Activity
  accent?: 'teal' | 'amber' | 'cyan' | 'emerald'
}) {
  const bg =
    accent === 'amber' ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : accent === 'cyan' ? 'linear-gradient(135deg, #22d3ee, #0891b2)'
        : accent === 'emerald' ? 'linear-gradient(135deg, #34d399, #059669)'
          : 'linear-gradient(135deg, #14b8a6, #0d9488)'
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
      <Icon size={16} className="text-white" />
    </div>
  )
}

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
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: '#06090f' }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-55"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 18% 0%, rgba(20,184,166,0.22), transparent)' }}
      />
      <div
        className="pointer-events-none absolute top-48 right-0 w-72 h-72 opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.3), transparent)' }}
      />

      <nav
        className="sticky top-0 z-40 border-b border-white/[0.06] px-4 sm:px-6 py-3 flex items-center gap-2.5 sm:gap-3"
        style={{ background: 'rgba(6,9,15,0.88)', backdropFilter: 'blur(18px)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/demo')}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Back to demo"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            π
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">Pi · Investor view</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">Company narrative · not just an app screen</p>
          </div>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => navigate('/transparency')}
          className="text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors hidden sm:inline"
        >
          What’s live
        </button>
        <StatusBadge kind="demo" label="Demo search · Live elsewhere" />
      </nav>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* Vision */}
        <section>
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Product vision
              </p>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
                An AI-native ecosystem where people, businesses, and opportunities work together.
              </h1>
            </div>
          </div>
          <ul className="space-y-2 mb-5 pl-[56px]">
            {visionBullets.map(b => (
              <li key={b} className="text-slate-400 text-sm flex gap-2 leading-relaxed">
                <Sparkles size={14} className="text-teal-400 shrink-0 mt-0.5" /> {b}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pl-[56px]">
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Open Investor Demo <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/traction')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10 hover:border-white/20 transition-colors"
            >
              Live Traction
            </button>
            <button
              type="button"
              onClick={() => navigate('/connect')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10 hover:border-white/20 transition-colors"
            >
              Meet Pi AI
            </button>
          </div>
        </section>

        {/* Twin storytelling */}
        <section
          className="relative overflow-hidden rounded-3xl border border-teal-500/25 p-5 sm:p-7"
          style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.16), rgba(8,13,26,0.96))' }}
        >
          <div
            className="pointer-events-none absolute -top-14 -right-10 w-44 h-44 rounded-full opacity-25 blur-3xl"
            style={{ background: '#14b8a6' }}
          />
          <div className="relative flex items-center gap-2.5 mb-3 flex-wrap">
            <SectionIcon icon={Bot} />
            <h2 className="font-display text-xl font-extrabold text-white">Digital Twin storytelling</h2>
            <StatusBadge kind="live" label="Live from profile" />
          </div>
          <p className="relative text-slate-300 text-sm leading-relaxed mb-5 max-w-3xl">
            Traditional platforms store a profile. Pi builds a <span className="text-white font-semibold">Digital Twin</span> —
            an AI representation of skills, goals, and experience that ranks who accelerates your goals and which
            opportunities fit — with reasons you can audit. That’s why AI sits at the center of Pi, not as a chat gadget.
          </p>
          <div className="relative grid sm:grid-cols-3 gap-2.5">
            {[
              { t: 'Identity', d: 'Twin from role, skills, goals, experience' },
              { t: 'Action', d: 'Intros, matches, and opportunity paths' },
              { t: 'Trust', d: 'Honest Live vs Demo labeling for investors' },
            ].map(x => (
              <div
                key={x.t}
                className="rounded-xl bg-black/30 border border-white/[0.08] px-3.5 py-3"
              >
                <p className="text-white text-sm font-bold mb-1">{x.t}</p>
                <p className="text-slate-400 text-xs leading-relaxed">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Core metrics / traction */}
        <section>
          <div className="flex items-center gap-2.5 mb-2">
            <SectionIcon icon={Activity} />
            <h2 className="font-display text-xl font-extrabold text-white">Core metrics & maturity</h2>
          </div>
          <p className="text-slate-500 text-xs mb-4 pl-[46px]">
            Investor-facing summary of what is measurable today. Signed-in team Traction (`/traction`) holds weekly numbers.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {investorMetrics.map(m => (
              <div
                key={m.label}
                className="rounded-2xl border border-white/[0.07] p-4"
                style={panelStyle}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{m.label}</p>
                  <StatusBadge kind={m.kind} />
                </div>
                <p className="text-white font-bold text-sm mb-1">{m.value}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{m.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap + architecture */}
        <div className="grid md:grid-cols-2 gap-3">
          <section className="rounded-2xl border border-white/[0.07] p-5" style={panelStyle}>
            <div className="flex items-center gap-2.5 mb-4">
              <SectionIcon icon={Route} accent="amber" />
              <h2 className="text-white font-bold">Roadmap</h2>
            </div>
            <div className="space-y-4">
              {roadmap.map(r => (
                <div key={r.phase}>
                  <p className="text-teal-300 text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5">{r.phase}</p>
                  <ul className="space-y-1.5">
                    {r.items.map(i => (
                      <li key={i} className="text-slate-400 text-xs flex gap-1.5 leading-relaxed">
                        <Target size={11} className="text-slate-600 mt-0.5 shrink-0" /> {i}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] p-5" style={panelStyle}>
            <div className="flex items-center gap-2.5 mb-4">
              <SectionIcon icon={Layers} accent="cyan" />
              <h2 className="text-white font-bold">Technical architecture</h2>
            </div>
            <div className="space-y-2.5">
              {architecture.map(a => (
                <div
                  key={a.label}
                  className="flex justify-between gap-3 text-sm border-b border-white/[0.05] pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="text-slate-500 shrink-0">{a.label}</span>
                  <span className="text-slate-200 text-right text-xs sm:text-sm">{a.detail}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* AI + market */}
        <div className="grid md:grid-cols-2 gap-3">
          <section className="rounded-2xl border border-white/[0.07] p-5" style={panelStyle}>
            <div className="flex items-center gap-2.5 mb-3">
              <SectionIcon icon={Cpu} />
              <h2 className="text-white font-bold">AI capabilities</h2>
            </div>
            <ul className="space-y-2">
              {aiCaps.map(c => (
                <li key={c} className="text-slate-400 text-xs leading-relaxed flex gap-2">
                  <span className="text-teal-500 shrink-0">·</span> {c}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-white/[0.07] p-5" style={panelStyle}>
            <div className="flex items-center gap-2.5 mb-3">
              <SectionIcon icon={Globe2} accent="emerald" />
              <h2 className="text-white font-bold">Market opportunity</h2>
            </div>
            <ul className="space-y-2 mb-3">
              {marketPoints.map(c => (
                <li key={c} className="text-slate-400 text-xs leading-relaxed flex gap-2">
                  <TrendingUp size={12} className="text-emerald-500 shrink-0 mt-0.5" /> {c}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Discipline first: validate product value and traction before heavy fundraising theatre.
            </p>
          </section>
        </div>

        {/* Opportunity graph search */}
        <section>
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <SectionIcon icon={Radar} />
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">Search the opportunity graph</h2>
            <StatusBadge kind="demo" label="Demo deal flow" />
          </div>
          <p className="text-slate-400 text-sm max-w-2xl mb-4 pl-[46px]">
            Investors become customers. Query the Pi graph for founders, traction, technology fit, and contact paths.
          </p>

          <form
            onSubmit={e => { e.preventDefault(); run(query) }}
            className="flex gap-2 mb-3 rounded-2xl border border-white/10 p-1.5 focus-within:border-teal-500/40 transition-colors"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
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
              className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0 hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5 mb-6">
            {investorSearchPresets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => run(p)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  submitted === p
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-200'
                    : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">
            Showing {results.length} graph hits for “{submitted}”
          </p>

          <div className="space-y-3">
            {results.map(h => (
              <div
                key={h.name}
                className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-5"
                style={panelStyle}
              >
                <div
                  className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-15 blur-2xl"
                  style={{ background: '#14b8a6' }}
                />
                <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_0_24px_rgba(20,184,166,0.25)]"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <Building2 size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">{h.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 uppercase tracking-wider font-semibold">
                        {h.stage}
                      </span>
                      <span className="ml-auto text-[11px] font-extrabold text-teal-200 bg-teal-500/15 border border-teal-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Sparkles size={12} /> {h.match}% match
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs flex items-center gap-1 mb-3">
                      <MapPin size={12} /> {h.geography} · {h.sector} · Raising {h.raising}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                      <div className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Founders</p>
                        <p className="text-slate-200">{h.founders}</p>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Traction</p>
                        <p className="text-slate-200">{h.traction}</p>
                      </div>
                      <div className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5 sm:col-span-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Technology</p>
                        <p className="text-slate-200">{h.tech}</p>
                      </div>
                    </div>
                    <p className="text-xs text-teal-100/90 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2.5">
                      <span className="font-semibold">Contact path:</span> {h.contactPath}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div
          className="relative overflow-hidden rounded-2xl border border-teal-500/25 p-5 sm:p-6 text-center"
          style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.12), rgba(8,13,26,0.95))' }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-40"
            style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(20,184,166,0.25), transparent)' }}
          />
          <p className="relative text-white font-bold text-sm mb-1">Ready for the next conversation</p>
          <p className="relative text-slate-400 text-xs mb-4">
            Vision + honesty on maturity. The product proves the rest.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={() => navigate('/connect')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Meet Pi AI · Contact & Partnership
            </button>
            <button
              type="button"
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20 transition-colors"
            >
              Engineering Transparency
            </button>
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-teal-200 text-sm border border-teal-500/30 hover:bg-teal-500/10 transition-colors"
            >
              Replay Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
