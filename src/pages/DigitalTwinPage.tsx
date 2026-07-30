import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, ArrowRight } from 'lucide-react'
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
      <div className="p-6 max-w-3xl mx-auto">
        <StatusBadge kind="partial" label="Twin incomplete — fill profile signals" className="mb-4" />
        <StateMessage
          variant="empty"
          title="Build your AI Digital Twin"
          description="Complete your role, interests, goals, and skills so Pi can generate your intelligence layer."
          action={{
            label: 'Edit profile',
            onClick: () => {
              track('core_loop_cta', { step: 'profile_edit' })
              navigate('/profile/edit')
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Bot size={22} className="text-teal-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">AI Digital Twin</h1>
          <StatusBadge kind="live" label="Live from your profile" size="md" />
          <StatusBadge kind="soon" label="Full LLM twin later" size="md" />
        </div>
        <p className="text-slate-400 text-sm leading-relaxed">
          Your AI representation of skills, goals, experience, and ambitions — Pi’s identity intelligence layer.
          It recommends people, opportunities, and introductions that accelerate what you’re building.
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Next loop: open Matching and start one message — that’s how twin value becomes traction.
        </p>
      </div>

      <DigitalTwinCard twin={twin} name={profile?.full_name || undefined} />

      <div className="mt-6 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => {
            track('core_loop_cta', { step: 'match_from_twin' })
            navigate('/match')
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          See who accelerates your goals <ArrowRight size={16} />
        </button>
        <button
          onClick={() => {
            track('core_loop_cta', { step: 'opps_from_twin' })
            navigate('/opportunities')
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:bg-white/5"
        >
          Opportunity Intelligence
        </button>
        <button
          onClick={() => navigate('/demo')}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-teal-200 text-sm border border-teal-500/30 hover:bg-teal-500/10"
        >
          Investor Demo <StatusBadge kind="demo" className="ml-1" />
        </button>
      </div>
    </div>
  )
}
