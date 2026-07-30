import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ArrowRight, Sparkles, Briefcase } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { buildDigitalTwin } from '../lib/digitalTwin'
import DigitalTwinCard from '../components/DigitalTwinCard'
import StateMessage from '../components/StateMessage'
import StatusBadge from '../components/StatusBadge'
import { track } from '../lib/analytics'
import { isProfileActivated } from '../lib/traction'

export default function DigitalTwinPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const twin = buildDigitalTwin(profile)

  useEffect(() => {
    if (twin) {
      track('twin_view', { activated: isProfileActivated(profile) })
      void import('../lib/engagement').then(m => m.recordEngagementAction('twin_view'))
    }
  }, [twin, profile])

  if (!twin) {
    return (
      <div className="min-h-full relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 20% 0%, rgba(20,184,166,0.2), transparent)' }}
        />
        <div className="relative p-4 sm:p-6 max-w-3xl mx-auto">
          <StatusBadge kind="partial" label="Twin incomplete" className="mb-4" />
          <StateMessage
            variant="empty"
            title="Build your Digital Twin"
            description="Add your role, interests, goals, and skills so Pi can generate your intelligence layer."
            action={{
              label: 'Edit profile',
              onClick: () => {
                track('core_loop_cta', { step: 'profile_edit' })
                navigate('/profile/edit')
              },
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.22), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-3xl mx-auto">
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Bot size={18} className="text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-normal">
              Digital Twin
            </h1>
            <StatusBadge kind="live" label="Live from profile" />
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
            Your AI representation of skills, goals, and experience — Pi’s identity layer that ranks
            people and opportunities with reasons you can audit.
          </p>
          <p className="text-slate-500 text-xs mt-2 flex items-center gap-1.5">
            <Sparkles size={11} className="text-teal-400 shrink-0" />
            Next: open Matching and start one intro — that’s how twin value becomes traction.
          </p>
        </header>

        <DigitalTwinCard twin={twin} name={profile?.full_name || undefined} />

        <div className="mt-5 grid sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              track('core_loop_cta', { step: 'match_from_twin' })
              navigate('/match')
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            See matches <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              track('core_loop_cta', { step: 'opps_from_twin' })
              navigate('/opportunities')
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
          >
            <Briefcase size={14} /> Opportunities
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile/edit')}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-teal-200 text-sm border border-teal-500/25 hover:bg-teal-500/10"
          >
            Strengthen signals
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('/demo')}
          className="mt-3 w-full text-center text-xs text-slate-500 hover:text-teal-300 transition-colors py-2"
        >
          See Twin storytelling in Investor Demo →
        </button>
      </div>
    </div>
  )
}
