import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, Briefcase, CheckCircle2, Circle, Sparkles, UsersRound } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isProfileActivated } from '../lib/traction'
import { getCoreLoopState, markCoreLoopDone, type CoreLoopId } from '../lib/engagement'
import { track } from '../lib/analytics'

type Step = {
  id: CoreLoopId
  label: string
  detail: string
  to: string
  done: boolean
  Icon: typeof Bot
}

/** Guides users through the 4 core product loops — profile/twin → match → communities → opportunities */
export default function CoreLoopGuide() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const activated = isProfileActivated(profile)
  const [loop, setLoop] = useState(() => getCoreLoopState())

  useEffect(() => {
    if (activated) markCoreLoopDone('twin')
    setLoop(getCoreLoopState())
  }, [activated])

  useEffect(() => {
    const sync = () => setLoop(getCoreLoopState())
    window.addEventListener('storage', sync)
    window.addEventListener('pi:core-loop', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('pi:core-loop', sync)
    }
  }, [])

  const steps: Step[] = useMemo(() => [
    {
      id: 'twin',
      label: 'Strengthen your Digital Twin',
      detail: 'Role, skills, interests, goals — this powers matching.',
      to: '/twin',
      done: activated || !!loop.twin,
      Icon: Bot,
    },
    {
      id: 'match',
      label: 'Review ranked matches',
      detail: 'Open Matching and start one intro or message.',
      to: '/match',
      done: !!loop.match,
      Icon: Sparkles,
    },
    {
      id: 'communities',
      label: 'Join a community & post',
      detail: 'Topic spaces build network density and retention.',
      to: '/communities',
      done: !!loop.communities,
      Icon: UsersRound,
    },
    {
      id: 'opportunities',
      label: 'Scan opportunities',
      detail: 'Mark interest on the best fit for your twin.',
      to: '/opportunities',
      done: !!loop.opportunities,
      Icon: Briefcase,
    },
  ], [activated, loop])

  const doneCount = steps.filter(s => s.done).length
  const next = steps.find(s => !s.done) || steps[0]

  return (
    <div
      className="rounded-2xl border border-pi-500/25 p-4 sm:p-5 mb-6"
      style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(13,148,136,0.04))' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-pi-300 text-xs font-bold uppercase tracking-wider mb-1">
            Core loops · {doneCount}/{steps.length}
          </p>
          <h2 className="text-white font-bold text-base sm:text-lg">Your next value step</h2>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Tighten these four loops before fundraising theatre — product → usage → data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            track('core_loop_cta', { step: next.id })
            navigate(next.to)
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Go <ArrowRight size={13} />
        </button>
      </div>

      <ul className="space-y-2">
        {steps.map(s => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                track('core_loop_step', { step: s.id, done: s.done })
                navigate(s.to)
              }}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className={`mt-0.5 ${s.done ? 'text-emerald-400' : 'text-slate-500'}`}>
                {s.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <s.Icon size={13} className="text-pi-400 shrink-0" />
                  <p className={`text-sm font-semibold ${s.done ? 'text-slate-400 line-through' : 'text-white'}`}>{s.label}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
