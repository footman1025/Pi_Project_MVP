import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Shield, MessageSquare } from 'lucide-react'
import { DISCUSS_CHECKLIST } from '../lib/acquisition'
import { track } from '../lib/analytics'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/StatusBadge'

/**
 * Strategic investor discussions — prep room before human talks.
 * Aligns with Cristian: don’t rush undervalued opportunities.
 */
export default function DiscussPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <button type="button" onClick={() => navigate('/grow')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Shield size={18} className="text-amber-400 shrink-0" />
          <p className="text-white font-bold text-sm truncate">Strategic discussions</p>
        </div>
        <StatusBadge kind="live" label="Value-first" className="ml-auto" />
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-amber-400/90 text-xs font-bold uppercase tracking-widest mb-2">Phase 3 · Market expansion</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
          Talk when the story is strong — not when interest is merely early
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-2xl">
          Investor interest is welcome. Timing matters. Pi prioritizes partners who accelerate the mission
          over capital that undervalues the product. Use this checklist before a strategic conversation.
        </p>

        <section className="mb-10">
          <h2 className="text-white font-bold text-sm mb-3">Preparation checklist</h2>
          <ul className="space-y-2">
            {DISCUSS_CHECKLIST.map(item => (
              <li key={item.path}>
                <button
                  type="button"
                  onClick={() => {
                    track('discuss_checklist_open', { path: item.path })
                    if (item.path === '/traction' && !session) {
                      navigate('/login')
                      return
                    }
                    navigate(item.path)
                  }}
                  className="w-full flex items-start gap-3 p-4 rounded-2xl border border-white/8 text-left hover:border-amber-500/30"
                  style={{ background: 'rgba(14,20,25,0.7)' }}
                >
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-semibold">{item.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{item.why}</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600 shrink-0 mt-1 ml-auto" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-2xl border border-amber-500/25 p-5 mb-8"
          style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.1), rgba(8,13,26,0.95))' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-amber-300" />
            <h2 className="text-white font-bold text-sm">Request a strategic conversation</h2>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Meet Pi AI first — then Speak with a Human routed to Investors with full context.
            We evaluate fit carefully; early interest ≠ automatic yes.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                track('discuss_request', { via: 'connect' })
                navigate('/connect?team=investors&intent=strategic-discussion')
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Meet Pi AI · Investors <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                track('discuss_request', { via: 'demo' })
                navigate('/demo')
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 border border-white/10"
            >
              Open Demo first
            </button>
          </div>
        </section>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Guiding principle: do not optimize for short-term opportunities. Optimize for long-term company value.
        </p>
      </div>
    </div>
  )
}
