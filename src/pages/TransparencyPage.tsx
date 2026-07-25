import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import type { StatusKind } from '../components/StatusBadge'

type Row = {
  area: string
  kind: StatusKind
  detail: string
}

const rows: Row[] = [
  { area: 'Auth & profiles', kind: 'live', detail: 'Supabase auth, onboarding save, public profiles, follow graph' },
  { area: 'Feed & communities', kind: 'live', detail: 'Posts, likes, comments, images; join communities and post' },
  { area: 'Messages & alerts', kind: 'live', detail: 'Realtime DMs, media, voice notes; in-app + browser notifications' },
  { area: 'Digital Twin', kind: 'live', detail: 'Rules-based twin from profile signals (not a full LLM twin yet)' },
  { area: 'Matching', kind: 'partial', detail: 'Live ranked graph when members exist; demo samples if the graph is empty' },
  { area: 'Opportunities catalog', kind: 'partial', detail: 'Seeded Supabase catalog + twin fit scores; apply/marketplace is Phase 2' },
  { area: 'Creators / Professionals', kind: 'partial', detail: 'Live member discovery + Message/Profile; tips, courses, booking = Soon' },
  { area: 'AI Assistant', kind: 'partial', detail: 'Groq when enabled server-side; otherwise guided keyword answers' },
  { area: 'Investor Demo / Investor search', kind: 'demo', detail: 'Scripted walkthrough for storytelling — intentionally not live deal flow' },
  { area: 'Stripe / tips / courses', kind: 'soon', detail: 'Monetization and payments planned after Investor Readiness' },
  { area: 'Enterprise workspace', kind: 'soon', detail: 'B2B investor intelligence and org tools are later-phase' },
  { area: 'Pi Earth / Autopilot', kind: 'soon', detail: 'Product concepts on the landing page — not shipped' },
]

export default function TransparencyPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto min-h-screen">
      {!session && (
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </button>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <ShieldCheck size={22} className="text-teal-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">Engineering Transparency</h1>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
          What is live in this Pi MVP versus what is demo, partial, or coming later.
          Built for investor honesty — no inflated claims, no private infrastructure details.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge kind="live" size="md" />
          <StatusBadge kind="partial" size="md" />
          <StatusBadge kind="demo" size="md" />
          <StatusBadge kind="soon" size="md" />
        </div>
      </div>

      <div className="space-y-3 mb-10">
        {rows.map(r => (
          <div
            key={r.area}
            className="p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-start gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
          >
            <div className="sm:w-48 shrink-0">
              <p className="text-white font-semibold text-sm mb-1.5">{r.area}</p>
              <StatusBadge kind={r.kind} />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed flex-1">{r.detail}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {session ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Open Dashboard <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20"
            >
              Investor Demo <StatusBadge kind="demo" className="ml-1" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Investor Demo <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20"
            >
              Create account
            </button>
          </>
        )}
      </div>
    </div>
  )
}
