import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bot, Briefcase, ChevronRight, MapPin, Sparkles,
  Target, TrendingUp, Users, LayoutDashboard
} from 'lucide-react'
import {
  sarahDemo, sarahMatches, sarahOpportunities
} from '../data/investorDemo'
import { track } from '../lib/analytics'

const stages = [
  { id: 'profile', label: 'Profile' },
  { id: 'twin', label: 'AI Twin' },
  { id: 'matches', label: 'Matches' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'path', label: 'Career path' },
] as const

type StageId = typeof stages[number]['id']

export default function InvestorDemoPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<StageId>('profile')
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    track('investor_demo_open')
  }, [])

  useEffect(() => {
    if (!auto) return
    const order: StageId[] = ['profile', 'twin', 'matches', 'opportunities', 'path']
    const idx = order.indexOf(stage)
    if (idx >= order.length - 1) return
    const t = setTimeout(() => setStage(order[idx + 1]), 4200)
    return () => clearTimeout(t)
  }, [stage, auto])

  const s = sarahDemo

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
          <span className="text-white font-bold">Pi</span>
        </button>
        <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 font-semibold">
          Demo · scripted tour
        </span>
        <button
          type="button"
          onClick={() => navigate('/transparency')}
          className="text-xs text-slate-400 hover:text-teal-300 transition-colors hidden sm:inline"
        >
          What’s live
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { setAuto(a => !a); track('investor_demo_auto', { on: !auto }) }}
          className="text-xs text-slate-400 hover:text-white transition-colors hidden sm:inline"
        >
          {auto ? 'Pause tour' : 'Resume tour'}
        </button>
        <button
          onClick={() => navigate('/investor')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          <LayoutDashboard size={14} /> Investor Dashboard
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Cinematic walkthrough</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Meet {s.name}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Demo user: <span className="text-white font-semibold">{s.title}</span>. Watch how Pi’s AI identity layer,
            matching engine, and opportunity graph create strategic value — not just another profile page.
          </p>
        </div>

        {/* Stage tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
          {stages.map((st, i) => (
            <button
              key={st.id}
              onClick={() => { setStage(st.id); setAuto(false) }}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                stage === st.id
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-200'
                  : 'border-white/5 text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">{i + 1}</span>
              {st.label}
            </button>
          ))}
        </div>

        {/* Stage content */}
        <div className="animate-fade-in" key={stage}>
          {stage === 'profile' && (
            <div className="rounded-3xl border border-white/10 p-6 sm:p-8"
              style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.9), rgba(8,13,26,0.95))' }}>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {s.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-extrabold text-white">{s.name}</h2>
                  <p className="text-teal-300 font-semibold mb-1">{s.title}</p>
                  <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-4">
                    <MapPin size={14} /> {s.location}
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{s.tagline}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {s.skills.map(sk => (
                      <span key={sk} className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-200">{sk}</span>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Goals</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {s.goals.map(g => <li key={g}>· {g}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Experience</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {s.experience.map(e => (
                          <li key={e.company}>· {e.title} @ {e.company}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => { setStage('twin'); setAuto(false) }}
                className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                Reveal AI Digital Twin <ChevronRight size={16} />
              </button>
            </div>
          )}

          {stage === 'twin' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-teal-500/25 p-6"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.14), rgba(8,13,26,0.95))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Bot size={20} className="text-teal-400" />
                  <h2 className="text-xl font-extrabold text-white">AI Digital Twin</h2>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">{s.twin.summary}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {s.twin.personality.map(p => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{p}</span>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-2 mb-5">
                  {s.twin.traits.map(t => (
                    <div key={t.label} className="rounded-xl bg-black/30 border border-white/5 px-3 py-2.5">
                      <p className="text-[10px] uppercase text-slate-500 font-bold">{t.label}</p>
                      <p className="text-white text-sm font-semibold">{t.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Twin actions</p>
                <div className="space-y-2">
                  {s.twin.actions.map(a => (
                    <div key={a.title} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-white text-sm font-semibold">{a.title}</p>
                      <p className="text-slate-500 text-xs">{a.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-slate-500 text-xs">
                Investor message: LinkedIn owns profiles. Pi owns the AI intelligence layer behind human potential.
              </p>
            </div>
          )}

          {stage === 'matches' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-teal-400" />
                <h2 className="text-xl font-extrabold text-white">Pi Intelligence Engine</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Not “people you may like” — the 5 people globally who can accelerate Sarah’s goal, and why.
              </p>
              <div className="space-y-3">
                {sarahMatches.map(m => (
                  <div key={m.name} className="rounded-2xl border border-white/8 p-4 sm:p-5"
                    style={{ background: 'rgba(14,20,30,0.7)' }}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold">{m.name}</p>
                          <span className="text-teal-300 text-xs font-extrabold">{m.match}%</span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2">{m.role} · {m.location}</p>
                        <ul className="space-y-1 mb-2">
                          {m.why.map(w => (
                            <li key={w} className="text-xs text-slate-300 flex gap-1.5">
                              <Sparkles size={11} className="text-teal-400 mt-0.5 flex-shrink-0" /> {w}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-teal-200/90 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2.5 py-2">
                          <span className="font-semibold">Accelerates goal:</span> {m.accelerate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 'opportunities' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={18} className="text-amber-400" />
                <h2 className="text-xl font-extrabold text-white">Opportunity Intelligence</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {sarahOpportunities.map(o => (
                  <div key={o.title} className="rounded-2xl border border-white/8 p-4"
                    style={{ background: 'rgba(14,20,30,0.7)' }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400/90">{o.type}</span>
                      <span className="text-emerald-400 text-xs font-bold">{o.match}% fit</span>
                    </div>
                    <h3 className="text-white font-bold text-sm mb-1">{o.title}</h3>
                    <p className="text-teal-300 text-xs font-semibold mb-2">{o.prize}</p>
                    <p className="text-slate-400 text-xs mb-2"><span className="text-slate-300 font-semibold">Why:</span> {o.why}</p>
                    <p className="text-[11px] text-slate-500">Path: {o.path}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === 'path' && (
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 p-6"
                style={{ background: 'rgba(14,20,30,0.85)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-teal-400" />
                  <h2 className="text-xl font-extrabold text-white">Career path · Pi Graph</h2>
                </div>
                <ol className="space-y-3">
                  {s.careerPath.map((step, i) => (
                    <li key={step} className="flex gap-3 items-start">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>{i + 1}</span>
                      <p className="text-slate-200 text-sm pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-3xl border border-amber-500/20 p-6"
                style={{ background: 'rgba(245,158,11,0.08)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={18} className="text-amber-400" />
                  <h2 className="text-lg font-extrabold text-white">Earning potential (simulation)</h2>
                </div>
                <p className="text-sm text-slate-300 mb-1"><span className="text-white font-semibold">Year 1:</span> {s.earningPotential.year1}</p>
                <p className="text-sm text-slate-300 mb-3"><span className="text-white font-semibold">Year 3:</span> {s.earningPotential.year3}</p>
                <p className="text-xs text-slate-500">{s.earningPotential.note}</p>
              </div>
              <div className="rounded-2xl border border-teal-500/25 p-5 text-center"
                style={{ background: 'rgba(20,184,166,0.1)' }}>
                <p className="text-white font-bold mb-1">Pi is not another social network.</p>
                <p className="text-slate-400 text-sm mb-4">It is an AI-native human opportunity operating system.</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button onClick={() => navigate('/investor')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    Open Investor Dashboard <ArrowRight size={16} />
                  </button>
                  <button onClick={() => navigate('/signup')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:bg-white/5">
                    Start building on Pi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
