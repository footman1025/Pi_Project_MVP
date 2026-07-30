import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Handshake, Link2, Building2, UsersRound, Briefcase } from 'lucide-react'
import { PARTNERSHIP_TYPES } from '../lib/acquisition'
import { track } from '../lib/analytics'

const icons = [Link2, UsersRound, Briefcase, Building2]

/** Public partnerships page — denser path into Meet Pi AI / handoffs. */
export default function PartnersPage() {
  const navigate = useNavigate()

  const startPartner = (typeId: string) => {
    track('partner_interest_click', { type: typeId })
    navigate(`/connect?team=partnerships&intent=${encodeURIComponent(typeId)}`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(16px)' }}>
        <button type="button" onClick={() => navigate('/grow')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Handshake size={18} className="text-teal-400" />
          <p className="text-white font-bold text-sm">Partnerships</p>
        </div>
        <button type="button" onClick={() => navigate('/connect')}
          className="ml-auto text-xs font-semibold text-teal-300">Meet Pi AI</button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Phase 3 · Market expansion</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
          Partner with Pi — accelerate the mission
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-2xl">
          We look for partners who strengthen the ecosystem — not vanity logos.
          Start with Pi AI; Speak with a Human routes to Partnerships with full context.
        </p>

        <div className="space-y-3 mb-10">
          {PARTNERSHIP_TYPES.map((p, i) => {
            const Icon = icons[i] || Handshake
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => startPartner(p.id)}
                className="w-full text-left rounded-2xl border border-white/8 p-5 hover:border-teal-500/30 transition-colors"
                style={{ background: 'rgba(14,20,25,0.65)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-teal-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold mb-1">{p.title}</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">{p.detail}</p>
                  </div>
                  <ArrowRight size={16} className="text-teal-400 shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/8 p-5 mb-6" style={{ background: 'rgba(20,184,166,0.08)' }}>
          <p className="text-white text-sm font-bold mb-1">How it works</p>
          <ol className="text-slate-400 text-xs space-y-1.5 list-decimal list-inside">
            <li>Pick a partnership type (or chat freely with Pi AI).</li>
            <li>Explore /demo and /transparency so expectations stay honest.</li>
            <li>Speak with a Human — handoff lands in the team inbox with context.</li>
          </ol>
        </div>

        <button
          type="button"
          onClick={() => startPartner('general')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Start partnership conversation <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
