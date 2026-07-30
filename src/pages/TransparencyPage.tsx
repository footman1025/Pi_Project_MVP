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
  { area: 'Platform SEO (Phase 1)', kind: 'live', detail: 'Per-route titles/meta/OG/Twitter/canonical via SeoHead; /features hub + feature pages; robots.txt + sitemap.xml; public profiles keep Person JSON-LD; auth app routes noindex' },
  { area: 'Growth infrastructure (Phase 2)', kind: 'live', detail: 'Push opt-in/out honored; Dashboard For-you AI recommendations; Core-loop completion + streak; weekly digest + re-engage nudge; Traction growth metrics (ai_suggest_sent, notif_open, push_enable)' },
  { area: 'Market expansion (Phase 3)', kind: 'live', detail: '/grow hub; invite links (/invite/:code) with signup attribution; /partners types → Meet Pi AI; /discuss strategic prep + Investors handoff; events invite_share, signup_attributed, partner_interest_click, discuss_request' },
  { area: 'Production readiness (Phase 1)', kind: 'live', detail: 'SPA rewrite excludes robots/sitemap/static assets; security headers (nosniff, referrer, frame); PWA manifest + SW; investor surfaces public' },
  { area: 'Contact & Partnership (Meet Pi AI)', kind: 'live', detail: '/connect — AI greets first, guides intent, Speak with a Human saves to /handoffs + emails visitor confirmation and HANDOFF_NOTIFY_EMAIL (Resend); team inbox at /handoffs' },
  { area: 'Traction metrics & validation', kind: 'live', detail: 'product_events + product_feedback; Traction page (activation, retention, intros, opp interest, would-use-again); in-app feedback widget' },
  { area: 'Auth & profiles', kind: 'live', detail: 'Supabase auth, onboarding save, public profiles, follow graph' },
  { area: 'Feed & communities', kind: 'live', detail: 'Posts, likes, comments, images; join communities and post' },
  { area: 'Messages & alerts', kind: 'live', detail: 'Realtime DMs + in-app; Web Push / Install Pi for cellphone; AI suggestions with 12h cooldown (no duplicate spam); optional email alerts (opt-in on Notifications — needs RESEND_API_KEY + supabase_notification_preferences.sql)' },
  { area: 'Digital Twin', kind: 'live', detail: 'Rules-based twin from profile signals (not a full LLM twin yet); investor storytelling on /investor + /demo' },
  { area: 'Matching', kind: 'partial', detail: 'Live ranked graph when members exist; honest empty state (no fake cards) until seed/invite' },
  { area: 'Opportunities catalog', kind: 'partial', detail: 'Seeded Supabase catalog + twin fit scores; run supabase_opportunities.sql; apply = Phase 2' },
  { area: 'Demo member seed', kind: 'partial', detail: 'Run supabase_seed_demo_members.sql or npm run seed:demo for an 8-person live graph' },
  { area: 'Creators / Professionals', kind: 'partial', detail: 'Live member discovery + Message/Profile; tips, courses, booking = Soon' },
  { area: 'Communities ranking', kind: 'live', detail: 'Twin-scored reasons from your interests/goals — not hardcoded mock blurbs' },
  { area: 'AI Assistant', kind: 'partial', detail: 'Groq when enabled server-side; otherwise guided keyword answers' },
  { area: 'Investor Dashboard (/investor)', kind: 'partial', detail: 'Company narrative: vision, Twin story, metrics maturity, roadmap, architecture, AI, market + Demo opportunity-graph search' },
  { area: 'Investor Demo walkthrough', kind: 'demo', detail: '/demo scripted story (Why Pi → Twin → matches → opps) — intentionally not live deal flow' },
  { area: 'Investor opportunity graph search', kind: 'demo', detail: 'Deal-flow search on /investor — storytelling only, labeled Demo' },
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
              onClick={() => navigate('/traction')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20"
            >
              Traction metrics
            </button>
            <button
              type="button"
              onClick={() => navigate('/features')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20"
            >
              Feature SEO hub
            </button>
            <button
              type="button"
              onClick={() => navigate('/investor')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10 hover:border-white/20"
            >
              Investor Dashboard
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
