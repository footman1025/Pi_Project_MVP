import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, ShieldCheck, Scale, Eye, Lock, BadgeCheck, HeartHandshake,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import type { StatusKind } from '../components/StatusBadge'

const pillars = [
  {
    icon: ShieldCheck,
    title: 'Trust & Safety by design',
    body: 'AI risk signals, human review for high-risk cases, appeals, and audit-friendly decisions — privacy-first, not bolted on later.',
  },
  {
    icon: HeartHandshake,
    title: 'Truth Guarantee',
    body: 'Success is when people choose Pi because it protects their interests. Growth follows trust — not the other way around.',
  },
  {
    icon: Scale,
    title: 'Trust-based monetization',
    body: 'Fees only when Pi adds safety, transparency, or better outcomes. Users pay for trust — never for empty friction.',
  },
  {
    icon: Lock,
    title: 'Private communications',
    body: 'Roadmap: E2E encryption for private messages, minimized metadata, no backdoors — public content still governed by platform rules.',
  },
]

type Row = { area: string; kind: StatusKind; detail: string }

const maturity: Row[] = [
  { area: 'Engineering Transparency', kind: 'live', detail: 'Honest Live / Partial / Demo / Soon labeling across the product' },
  { area: 'Content reporting (v0)', kind: 'partial', detail: 'Report posts, comments, and profiles; local audit + content_reports when SQL is applied' },
  { area: 'Moderation inbox + risk triage (v0)', kind: 'partial', detail: '/moderation — rules-based risk score (low→critical), sorted inbox, team status updates; run supabase_content_reports_v2.sql' },
  { area: 'Appeals (v0)', kind: 'partial', detail: 'Reporter can request human re-review; moderators uphold or overturn — not full independent appeal board yet' },
  { area: 'Reputation signals (v0)', kind: 'partial', detail: 'Transparent activity/twin-readiness proxy on posts — not vanity follower counts' },
  { area: 'AI moderation engine', kind: 'soon', detail: 'Realtime ML risk scoring for posts, chats, communities, files (beyond rules-based triage)' },
  { area: 'Multi-layer moderation + independent appeals', kind: 'soon', detail: 'Trusted reviewer tiers + independent appeal board beyond reporter re-review' },
  { area: 'E2E encrypted DMs', kind: 'soon', detail: 'Private messages encrypted end-to-end; users control backups' },
  { area: 'Verification tiers', kind: 'soon', detail: 'Optional identity, business, org verification → higher trust score' },
  { area: 'Law-enforcement portal', kind: 'soon', detail: 'Valid legal process only; transparency logs; no informal disclosure' },
  { area: 'Transparency reports', kind: 'soon', detail: 'Regular public stats on removals, appeals, government requests' },
  { area: 'Regulatory alignment', kind: 'soon', detail: 'Architecture targeting GDPR, DSA, AI Act, child-safety, and applicable AML/KYC' },
]

export default function TrustSafetyPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto min-h-screen">
      {!session && (
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to home
        </button>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <ShieldCheck size={22} className="text-teal-400" />
          <h1 className="font-display text-3xl font-extrabold text-white">Trust, Safety & Truth</h1>
          <StatusBadge kind="partial" label="Core principle" />
        </div>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
          Pi maximizes freedom of expression while preventing abuse — and earns the right to monetize only by making interactions safer and more trustworthy.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-8">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-white/[0.07] p-4"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center mb-3">
              <Icon size={16} />
            </div>
            <h2 className="text-white font-bold text-sm mb-1.5">{title}</h2>
            <p className="text-slate-400 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl border border-teal-500/25 p-5 mb-8"
        style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(10,14,22,0.9))' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <BadgeCheck size={18} className="text-teal-300" />
          <h2 className="text-white font-bold">The Truth Guarantee</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          Every major product decision should answer: <em className="text-teal-200 not-italic">Does this increase the trust users place in Pi?</em>
          If yes, it strengthens the platform. If not, we reconsider.
        </p>
        <p className="text-slate-500 text-xs">
          Founding principle: Trust first. Opportunity second. Revenue follows naturally.
        </p>
      </div>

      <h2 className="font-display text-lg font-bold text-white mb-3 flex items-center gap-2">
        <Eye size={16} className="text-teal-400" /> Maturity map
      </h2>
      <div className="space-y-2.5 mb-8">
        {maturity.map(r => (
          <div
            key={r.area}
            className="p-3.5 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-start gap-2"
            style={{ background: 'rgba(14,20,25,0.55)' }}
          >
            <div className="sm:w-44 shrink-0">
              <p className="text-white font-semibold text-xs mb-1">{r.area}</p>
              <StatusBadge kind={r.kind} />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed flex-1">{r.detail}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {session ? (
          <>
            <button
              type="button"
              onClick={() => navigate('/moderation')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Moderation inbox <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/feed')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10"
            >
              Open Social Feed
            </button>
            <button
              type="button"
              onClick={() => navigate('/experience')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10"
            >
              Experience (UGE)
            </button>
            <button
              type="button"
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10"
            >
              What’s live
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
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 text-sm border border-white/10"
            >
              Transparency
            </button>
          </>
        )}
      </div>
    </div>
  )
}
