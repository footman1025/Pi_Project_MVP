import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, Ban, Bot, CheckCircle2, Flag, Loader2, MessageSquareWarning,
  ShieldAlert, X,
} from 'lucide-react'
import StatusBadge from './StatusBadge'
import { REPORT_REASONS, type ReportReason } from '../lib/contentReports'

const REASON_META: Record<
  ReportReason,
  { icon: typeof Flag; hint: string; accent: string }
> = {
  spam: {
    icon: Bot,
    hint: 'Bots, fake likes, or engagement farming',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  scam: {
    icon: ShieldAlert,
    hint: 'Fraud, phishing, or money schemes',
    accent: 'from-rose-500/20 to-red-500/10',
  },
  harassment: {
    icon: MessageSquareWarning,
    hint: 'Abuse, threats, or targeted attacks',
    accent: 'from-orange-500/20 to-amber-500/10',
  },
  illegal: {
    icon: Ban,
    hint: 'Dangerous or illegal activity',
    accent: 'from-red-500/25 to-rose-500/10',
  },
  misinformation: {
    icon: AlertTriangle,
    hint: 'Coordinated false or misleading claims',
    accent: 'from-yellow-500/20 to-amber-500/10',
  },
  other: {
    icon: Flag,
    hint: 'Something else that needs review',
    accent: 'from-teal-500/20 to-cyan-500/10',
  },
}

type Props = {
  open: boolean
  title: string
  subtitle?: string
  reason: ReportReason
  details: string
  busy?: boolean
  done?: boolean
  error?: string
  riskLabel?: string | null
  onReasonChange: (r: ReportReason) => void
  onDetailsChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}

export default function ReportContentModal({
  open,
  title,
  subtitle = 'Trust & Safety — reports help protect the community. High-risk cases get human review.',
  reason,
  details,
  busy = false,
  done = false,
  error = '',
  riskLabel,
  onReasonChange,
  onDetailsChange,
  onClose,
  onSubmit,
}: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.getAttribute('data-pi-modal')
    document.body.setAttribute('data-pi-modal', 'open')
    return () => {
      if (prev) document.body.setAttribute('data-pi-modal', prev)
      else document.body.removeAttribute('data-pi-modal')
    }
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
      role="dialog"
      aria-modal
      aria-label={title}
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-md max-h-[92dvh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #141a28 0%, #0a0e18 55%, #070b12 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.07]">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ring-1 ring-amber-400/25"
              style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.35), rgba(13,148,136,0.25))' }}
            >
              <Flag size={17} className="text-amber-100" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-[15px] leading-tight">{title}</h3>
                <StatusBadge kind="partial" label="Human review" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {done ? (
            <div className="py-10 text-center space-y-3">
              <div
                className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ring-1 ring-teal-400/30"
                style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.3), rgba(13,148,136,0.15))' }}
              >
                <CheckCircle2 size={28} className="text-teal-300" />
              </div>
              <p className="text-teal-200 font-semibold text-sm">Thanks — report received</p>
              <p className="text-slate-500 text-xs leading-relaxed max-w-[280px] mx-auto">
                {riskLabel
                  ? `Queued for triage (${riskLabel}). You can appeal from Moderation → My reports.`
                  : 'Our team uses risk triage for high-priority cases. You can track this under Moderation → My reports.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2 px-0.5">
                  Why are you reporting?
                </p>
                <div className="grid gap-1.5" role="radiogroup" aria-label="Report reason">
                  {REPORT_REASONS.map(r => {
                    const meta = REASON_META[r.id]
                    const Icon = meta.icon
                    const selected = reason === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onReasonChange(r.id)}
                        className={`group flex items-start gap-3 w-full text-left rounded-2xl border px-3 py-2.5 transition-all duration-200 ${
                          selected
                            ? 'border-teal-400/40 bg-teal-500/[0.12] shadow-[0_0_0_1px_rgba(45,212,191,0.12)]'
                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                        }`}
                      >
                        <span
                          className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.accent} ring-1 ${
                            selected ? 'ring-teal-400/35' : 'ring-white/5'
                          }`}
                        >
                          <Icon size={14} className={selected ? 'text-teal-100' : 'text-slate-300'} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[13px] font-semibold ${selected ? 'text-white' : 'text-slate-200'}`}>
                            {r.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                            {meta.hint}
                          </span>
                        </span>
                        <span
                          className={`mt-1.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                            selected ? 'border-teal-400 bg-teal-400/20' : 'border-white/20'
                          }`}
                        >
                          {selected && <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2 block px-0.5">
                  Details <span className="normal-case tracking-normal font-medium text-slate-600">(optional)</span>
                </label>
                <textarea
                  value={details}
                  onChange={e => onDetailsChange(e.target.value)}
                  rows={3}
                  placeholder="Add context that helps reviewers…"
                  className="w-full bg-black/35 border border-white/10 rounded-2xl px-3.5 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/45 focus:ring-1 focus:ring-teal-500/20 resize-none transition-colors"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs px-1 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-white/[0.07] flex gap-2 bg-black/20">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSubmit}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Flag size={13} />}
              {busy ? 'Sending…' : 'Submit report'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
