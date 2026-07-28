import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bot, Briefcase, ChevronRight, MapPin, Sparkles,
  Target, TrendingUp, Users, LayoutDashboard, Cpu, Globe2, Layers, Zap
} from 'lucide-react'
import {
  giuliaDemo, giuliaMatches, giuliaOpportunities
} from '../data/investorDemo'
import { track } from '../lib/analytics'

const stages = [
  { id: 'thesis', label: 'Why Pi' },
  { id: 'profile', label: 'User' },
  { id: 'twin', label: 'AI Twin' },
  { id: 'matches', label: 'Matches' },
  { id: 'opportunities', label: 'Opps' },
  { id: 'path', label: 'Close' },
] as const

type StageId = typeof stages[number]['id']

const STAGE_MS: Record<StageId, number> = {
  thesis: 7000,
  profile: 4500,
  twin: 5500,
  matches: 5500,
  opportunities: 5000,
  path: 0,
}

const thesisPoints = [
  {
    Icon: Layers,
    label: 'What Pi is',
    text: 'An AI-native human opportunity operating system — not another social feed.',
  },
  {
    Icon: Users,
    label: 'Who it is for',
    text: 'Founders, creators, professionals, and investors who need strategic connections — not vanity metrics.',
  },
  {
    Icon: Zap,
    label: 'Why it’s different',
    text: 'Pi ranks who accelerates your goals and why — LinkedIn owns profiles; Pi owns the intelligence layer.',
  },
  {
    Icon: Cpu,
    label: 'Why AI is central',
    text: 'Every member gets a Digital Twin that turns skills, goals, and experience into actionable intros and opportunities.',
  },
  {
    Icon: Globe2,
    label: 'Why the opportunity is large',
    text: 'A global market of people seeking co-founders, capital, talent, and careers — Pi compounds network value with AI.',
  },
]

export default function InvestorDemoPage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<StageId>('thesis')
  const [auto, setAuto] = useState(true)

  useEffect(() => {
    track('investor_demo_open')
  }, [])

  useEffect(() => {
    if (!auto) return
    const order: StageId[] = ['thesis', 'profile', 'twin', 'matches', 'opportunities', 'path']
    const idx = order.indexOf(stage)
    if (idx >= order.length - 1) return
    const delay = STAGE_MS[stage] || 4500
    if (!delay) return
    const t = setTimeout(() => setStage(order[idx + 1]), delay)
    return () => clearTimeout(t)
  }, [stage, auto])

  const s = giuliaDemo
  const stageIndex = stages.findIndex(st => st.id === stage)

  const go = (id: StageId) => {
    setStage(id)
    setAuto(false)
    track('investor_demo_stage', { stage: id })
  }

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Opening story frame — first minutes */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Investor walkthrough · ~5 minutes</p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-3">
            {stage === 'thesis' ? 'Why Pi exists' : `Meet ${s.name}`}
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {stage === 'thesis'
              ? 'In the first minutes, understand what Pi is, who it serves, why AI is the product — then watch it work through one real founder journey.'
              : (
                <>
                  Live product narrative via demo user{' '}
                  <span className="text-white font-semibold">{s.title}</span>
                  {' '}(Milan). AI Twin → ranked matches → opportunities → path.
                </>
              )}
          </p>
          {auto && stage !== 'path' && (
            <p className="text-[11px] text-slate-600 mt-2">Auto-advancing · pause anytime · step {stageIndex + 1}/{stages.length}</p>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
          {stages.map((st, i) => (
            <button
              key={st.id}
              onClick={() => go(st.id)}
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

        <div className="animate-fade-in" key={stage}>
          {stage === 'thesis' && (
            <div className="space-y-4">
              <div
                className="rounded-3xl border border-teal-500/30 p-6 sm:p-8"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.16), rgba(8,13,26,0.96))' }}
              >
                <p className="text-white text-lg sm:text-xl font-extrabold leading-snug mb-2">
                  Not another social platform.
                </p>
                <p className="text-teal-100/90 text-sm sm:text-base leading-relaxed max-w-2xl">
                  Pi is building an AI-native ecosystem where identity, matching, communities, and opportunities
                  compound — with the discipline to ship what is live and label what is still Demo.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {thesisPoints.map(({ Icon, label, text }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/8 p-4 sm:p-5"
                    style={{ background: 'rgba(14,20,30,0.85)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                        <Icon size={15} className="text-white" />
                      </div>
                      <p className="text-white font-bold text-sm">{label}</p>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <Sparkles size={16} className="text-teal-400 shrink-0" />
                <p className="text-slate-300 text-xs sm:text-sm flex-1 leading-relaxed">
                  Next: one founder journey — <span className="text-white font-semibold">{s.name}</span> —
                  so the product speaks for itself.
                </p>
                <button
                  type="button"
                  onClick={() => go('profile')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white text-sm shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  Meet {s.name.split(' ')[0]} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {stage === 'profile' && (
            <div className="rounded-3xl border border-white/10 p-6 sm:p-8"
              style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.9), rgba(8,13,26,0.95))' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90 mb-4">
                Step 2 · The user — who Pi serves
              </p>
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
              <button onClick={() => go('twin')}
                className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                Reveal AI Digital Twin <ChevronRight size={16} />
              </button>
            </div>
          )}

          {stage === 'twin' && (
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90">
                Step 3 · Why AI is at the center
              </p>
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Twin actions (practical value)</p>
                <div className="space-y-2">
                  {s.twin.actions.map(a => (
                    <div key={a.title} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                      <p className="text-white text-sm font-semibold">{a.title}</p>
                      <p className="text-slate-500 text-xs">{a.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-slate-500 text-xs max-w-xl mx-auto leading-relaxed">
                Traditional platforms store a profile. Pi turns that profile into an intelligence layer that
                recommends people and opportunities that accelerate goals — with reasons you can audit.
              </p>
              <div className="flex justify-center">
                <button type="button" onClick={() => go('matches')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  See ranked matches <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {stage === 'matches' && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90 mb-2">
                Step 4 · Why Pi is different from “people you may like”
              </p>
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-teal-400" />
                <h2 className="text-xl font-extrabold text-white">Pi Intelligence Engine</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                The people who can accelerate Giulia’s goal — scored live from twin signals, with explicit why.
              </p>
              <div className="space-y-3">
                {giuliaMatches.map(m => (
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
              <div className="flex justify-center mt-5">
                <button type="button" onClick={() => go('opportunities')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  Opportunity graph <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {stage === 'opportunities' && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90 mb-2">
                Step 5 · Opportunity at network scale
              </p>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={18} className="text-amber-400" />
                <h2 className="text-xl font-extrabold text-white">Opportunity Intelligence</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5">
                Funding, grants, accelerators, partnerships — ranked to Giulia’s twin, with a clear path to act.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {giuliaOpportunities.map(o => (
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
              <div className="flex justify-center mt-5">
                <button type="button" onClick={() => go('path')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  Close the story <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {stage === 'path' && (
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400/90">
                Close · Vision + discipline
              </p>
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
                <p className="text-white font-bold mb-1">
                  Not another social platform — an AI-native ecosystem with a clear long-term vision.
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  The vision inspires. The product proves. Traction will defend the next chapter.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button onClick={() => navigate('/investor')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    Open Investor Dashboard <ArrowRight size={16} />
                  </button>
                  <button onClick={() => navigate('/connect')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:bg-white/5">
                    Meet Pi AI · Contact
                  </button>
                  <button onClick={() => navigate('/transparency')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-teal-200 text-sm border border-teal-500/30 hover:bg-teal-500/10">
                    What’s live
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
