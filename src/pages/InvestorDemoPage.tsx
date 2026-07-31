import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Bot, Briefcase, ChevronRight, MapPin, Sparkles,
  Target, TrendingUp, Users, LayoutDashboard, Cpu, Globe2, Layers, Zap, Pause, Play,
} from 'lucide-react'
import {
  giuliaDemo, giuliaMatches, giuliaOpportunities
} from '../data/investorDemo'
import { track } from '../lib/analytics'
import StatusBadge from '../components/StatusBadge'

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

function StageCta({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm hover:brightness-110 transition-all"
      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
    >
      {children}
    </button>
  )
}

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
  const progress = ((stageIndex + 1) / stages.length) * 100

  const go = (id: StageId) => {
    setStage(id)
    setAuto(false)
    track('investor_demo_stage', { stage: id })
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: '#06090f' }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 20% 0%, rgba(20,184,166,0.22), transparent)' }}
      />
      <div
        className="pointer-events-none absolute top-40 right-0 w-64 h-64 opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.28), transparent)' }}
      />

      <nav
        className="sticky top-0 z-40 border-b border-white/[0.06] px-4 sm:px-6 py-3 flex items-center gap-2.5 sm:gap-3"
        style={{ background: 'rgba(6,9,15,0.88)', backdropFilter: 'blur(18px)' }}
      >
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            π
          </div>
          <span className="text-white font-bold hidden xs:inline sm:inline">Pi</span>
        </button>
        <StatusBadge kind="demo" label="Scripted tour" />
        <button
          type="button"
          onClick={() => navigate('/transparency')}
          className="text-xs text-slate-400 hover:text-teal-300 transition-colors hidden md:inline"
        >
          What’s live
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => { setAuto(a => !a); track('investor_demo_auto', { on: !auto }) }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
        >
          {auto ? <Pause size={12} /> : <Play size={12} />}
          <span className="hidden sm:inline">{auto ? 'Pause' : 'Resume'}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/investor')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          <LayoutDashboard size={14} />
          <span className="hidden sm:inline">Investor Dashboard</span>
          <span className="sm:hidden">Dashboard</span>
        </button>
      </nav>

      {/* Progress */}
      <div className="relative h-0.5 bg-white/[0.04]">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #14b8a6, #f59e0b)',
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Sparkles size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Investor walkthrough · ~5 minutes
              </p>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {stage === 'thesis' ? 'Why Pi exists' : `Meet ${s.name}`}
              </h1>
            </div>
          </div>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl leading-relaxed pl-[56px]">
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
            <p className="text-[11px] text-slate-600 mt-2 pl-[56px]">
              Auto-advancing · step {stageIndex + 1}/{stages.length}
            </p>
          )}
        </header>

        {/* Stage rail */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {stages.map((st, i) => {
            const active = stage === st.id
            const done = i < stageIndex
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => go(st.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  active
                    ? 'border-teal-500/40 bg-teal-500/15 text-teal-100 shadow-[0_0_20px_rgba(20,184,166,0.15)]'
                    : done
                      ? 'border-white/10 text-slate-300 bg-white/[0.03]'
                      : 'border-white/[0.05] text-slate-500 hover:text-slate-300 hover:border-white/10'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    active || done ? 'text-white' : 'bg-white/5 text-slate-500'
                  }`}
                  style={active || done ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : undefined}
                >
                  {i + 1}
                </span>
                {st.label}
              </button>
            )
          })}
        </div>

        <div className="animate-fade-in" key={stage}>
          {stage === 'thesis' && (
            <div className="space-y-3.5">
              <div
                className="relative overflow-hidden rounded-3xl border border-teal-500/30 p-6 sm:p-8"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.18), rgba(8,13,26,0.96))' }}
              >
                <div
                  className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl"
                  style={{ background: '#14b8a6' }}
                />
                <p className="relative text-white text-lg sm:text-xl font-extrabold leading-snug mb-2">
                  Not another social platform.
                </p>
                <p className="relative text-teal-100/90 text-sm sm:text-base leading-relaxed max-w-2xl">
                  Pi is building an AI-native ecosystem where identity, matching, communities, and opportunities
                  compound — with the discipline to ship what is live and label what is still Demo.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {thesisPoints.map(({ Icon, label, text }) => (
                  <div
                    key={label}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5"
                    style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        <Icon size={15} className="text-white" />
                      </div>
                      <p className="text-white font-bold text-sm">{label}</p>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <div
                className="rounded-2xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-teal-400" />
                </div>
                <p className="text-slate-300 text-xs sm:text-sm flex-1 leading-relaxed">
                  Next: one founder journey — <span className="text-white font-semibold">{s.name}</span> —
                  so the product speaks for itself.
                </p>
                <StageCta onClick={() => go('profile')}>
                  Meet {s.name.split(' ')[0]} <ChevronRight size={16} />
                </StageCta>
              </div>
            </div>
          )}

          {stage === 'profile' && (
            <div
              className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(8,13,26,0.98))' }}
            >
              <div
                className="pointer-events-none absolute -top-16 right-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
                style={{ background: '#14b8a6' }}
              />
              <p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-5">
                Step 2 · The user — who Pi serves
              </p>
              <div className="relative flex flex-col sm:flex-row gap-6 items-start">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl font-black flex-shrink-0 shadow-[0_0_28px_rgba(20,184,166,0.35)]"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  {s.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-2xl font-extrabold text-white">{s.name}</h2>
                  <p className="text-teal-300 font-semibold mb-1">{s.title}</p>
                  <p className="text-slate-400 text-sm flex items-center gap-1.5 mb-4">
                    <MapPin size={14} /> {s.location}
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{s.tagline}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {s.skills.map(sk => (
                      <span
                        key={sk}
                        className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-200"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Goals</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {s.goals.map(g => <li key={g}>· {g}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-black/25 border border-white/[0.06] p-3.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Experience</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {s.experience.map(e => (
                          <li key={e.company}>· {e.title} @ {e.company}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative mt-6">
                <StageCta onClick={() => go('twin')}>
                  Reveal AI Digital Twin <ChevronRight size={16} />
                </StageCta>
              </div>
            </div>
          )}

          {stage === 'twin' && (
            <div className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90">
                Step 3 · Why AI is at the center
              </p>
              <div
                className="relative overflow-hidden rounded-3xl border border-teal-500/25 p-6"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.14), rgba(8,13,26,0.96))' }}
              >
                <div
                  className="pointer-events-none absolute -top-10 -right-8 w-36 h-36 rounded-full opacity-25 blur-3xl"
                  style={{ background: '#14b8a6' }}
                />
                <div className="relative flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <Bot size={18} className="text-white" />
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-white">AI Digital Twin</h2>
                </div>
                <p className="relative text-slate-300 text-sm leading-relaxed mb-5">{s.twin.summary}</p>
                <div className="relative flex flex-wrap gap-1.5 mb-5">
                  {s.twin.personality.map(p => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                      {p}
                    </span>
                  ))}
                </div>
                <div className="relative grid sm:grid-cols-2 gap-2 mb-5">
                  {s.twin.traits.map(t => (
                    <div key={t.label} className="rounded-xl bg-black/30 border border-white/[0.06] px-3.5 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.label}</p>
                      <p className="text-white text-sm font-semibold">{t.value}</p>
                    </div>
                  ))}
                </div>
                <p className="relative text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2">
                  Twin actions (practical value)
                </p>
                <div className="relative space-y-2">
                  {s.twin.actions.map(a => (
                    <div key={a.title} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
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
                <StageCta onClick={() => go('matches')}>
                  See ranked matches <ChevronRight size={16} />
                </StageCta>
              </div>
            </div>
          )}

          {stage === 'matches' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-2">
                Step 4 · Why Pi is different from “people you may like”
              </p>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  <Users size={16} className="text-white" />
                </div>
                <h2 className="font-display text-xl font-extrabold text-white">Pi Intelligence Engine</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5 pl-[46px]">
                The people who can accelerate Giulia’s goal — scored live from twin signals, with explicit why.
              </p>
              <div className="space-y-2.5">
                {giuliaMatches.map(m => (
                  <div
                    key={m.name}
                    className="rounded-2xl border border-white/[0.07] p-4 sm:p-5"
                    style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.96))' }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-white font-bold">{m.name}</p>
                          <span className="text-[11px] font-extrabold text-teal-200 bg-teal-500/15 border border-teal-500/25 px-2 py-0.5 rounded-lg">
                            {m.match}%
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mb-2.5">{m.role} · {m.location}</p>
                        <ul className="space-y-1 mb-2.5">
                          {m.why.map(w => (
                            <li key={w} className="text-xs text-slate-300 flex gap-1.5">
                              <Sparkles size={11} className="text-teal-400 mt-0.5 flex-shrink-0" /> {w}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-teal-100/90 bg-teal-500/10 border border-teal-500/20 rounded-xl px-3 py-2">
                          <span className="font-semibold">Accelerates goal:</span> {m.accelerate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-5">
                <StageCta onClick={() => go('opportunities')}>
                  Opportunity graph <ChevronRight size={16} />
                </StageCta>
              </div>
            </div>
          )}

          {stage === 'opportunities' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-2">
                Step 5 · Opportunity at network scale
              </p>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Briefcase size={16} className="text-white" />
                </div>
                <h2 className="font-display text-xl font-extrabold text-white">Opportunity Intelligence</h2>
              </div>
              <p className="text-slate-400 text-sm mb-5 pl-[46px]">
                Funding, grants, accelerators, partnerships — ranked to Giulia’s twin, with a clear path to act.
              </p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {giuliaOpportunities.map(o => (
                  <div
                    key={o.title}
                    className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4"
                    style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.96))' }}
                  >
                    <div
                      className="pointer-events-none absolute -top-8 -right-6 w-20 h-20 rounded-full opacity-15 blur-2xl"
                      style={{ background: '#f59e0b' }}
                    />
                    <div className="relative flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400/90">{o.type}</span>
                      <span className="text-emerald-300 text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                        {o.match}% fit
                      </span>
                    </div>
                    <h3 className="relative text-white font-bold text-sm mb-1">{o.title}</h3>
                    <p className="relative text-teal-300 text-xs font-semibold mb-2">{o.prize}</p>
                    <p className="relative text-slate-400 text-xs mb-2">
                      <span className="text-slate-300 font-semibold">Why:</span> {o.why}
                    </p>
                    <p className="relative text-[11px] text-slate-500">Path: {o.path}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-5">
                <StageCta onClick={() => go('path')}>
                  Close the story <ChevronRight size={16} />
                </StageCta>
              </div>
            </div>
          )}

          {stage === 'path' && (
            <div className="space-y-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90">
                Close · Vision + discipline
              </p>
              <div
                className="rounded-3xl border border-white/[0.08] p-6"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <Target size={16} className="text-white" />
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-white">Career path · Pi Graph</h2>
                </div>
                <ol className="space-y-3">
                  {s.careerPath.map((step, i) => (
                    <li key={step} className="flex gap-3 items-start">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-slate-200 text-sm pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div
                className="relative overflow-hidden rounded-3xl border border-amber-500/25 p-6"
                style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.12), rgba(8,13,26,0.95))' }}
              >
                <div
                  className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full opacity-20 blur-3xl"
                  style={{ background: '#f59e0b' }}
                />
                <div className="relative flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                  >
                    <TrendingUp size={16} className="text-white" />
                  </div>
                  <h2 className="font-display text-lg font-extrabold text-white">Earning potential (simulation)</h2>
                </div>
                <p className="relative text-sm text-slate-300 mb-1">
                  <span className="text-white font-semibold">Year 1:</span> {s.earningPotential.year1}
                </p>
                <p className="relative text-sm text-slate-300 mb-3">
                  <span className="text-white font-semibold">Year 3:</span> {s.earningPotential.year3}
                </p>
                <p className="relative text-xs text-slate-500">{s.earningPotential.note}</p>
              </div>
              <div
                className="relative overflow-hidden rounded-2xl border border-teal-500/25 p-5 sm:p-6 text-center"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.14), rgba(8,13,26,0.95))' }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40"
                  style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(20,184,166,0.25), transparent)' }}
                />
                <p className="relative text-white font-bold mb-1">
                  Not another social platform — an AI-native ecosystem with a clear long-term vision.
                </p>
                <p className="relative text-slate-400 text-sm mb-5">
                  The vision inspires. The product proves. Traction will defend the next chapter.
                </p>
                <div className="relative flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/investor')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    Open Investor Dashboard <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/connect')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20 transition-colors"
                  >
                    Meet Pi AI · Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/transparency')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-teal-200 text-sm border border-teal-500/30 hover:bg-teal-500/10 transition-colors"
                  >
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
