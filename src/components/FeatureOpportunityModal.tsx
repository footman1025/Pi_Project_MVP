import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Sparkles, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import {
  FEATURED_DAYS,
  FEATURED_PRICE_CENTS,
  formatFeaturedPrice,
  startFeaturedCheckout,
} from '../lib/opportunityFeatured'
import type { OpportunityItem } from '../lib/opportunities'

type Props = {
  open: boolean
  item: OpportunityItem
  onClose: () => void
  onIntentRecorded: (message: string) => void
}

export default function FeatureOpportunityModal({ open, item, onClose, onIntentRecorded }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const price = formatFeaturedPrice(FEATURED_PRICE_CENTS)

  if (!open || typeof document === 'undefined') return null

  const submit = async () => {
    setBusy(true)
    setError('')
    const res = await startFeaturedCheckout({
      opportunityId: item.id,
      opportunityTitle: item.title,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    if (res.mode === 'stripe') {
      window.location.href = res.url
      return
    }
    onIntentRecorded(res.message)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal
      aria-label="Feature opportunity"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-md max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #141a28 0%, #0a0e18 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Sparkles size={17} className="text-white" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-[15px]">Feature this listing</h3>
                <StatusBadge kind="live" label="Pay experiment" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Priority placement for {FEATURED_DAYS} days. Clear price — No Surprise Standard.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-white font-semibold text-sm leading-snug">{item.title}</p>
          <div
            className="rounded-2xl border border-amber-500/25 p-4"
            style={{ background: 'rgba(245,158,11,0.08)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/90 mb-1">
              Featured · {FEATURED_DAYS} days
            </p>
            <p className="text-3xl font-black text-white tabular-nums">{price}</p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-400 leading-relaxed">
              <li>• Pins your opportunity at the top of Opportunity Hub</li>
              <li>• Featured badge on catalog + public page</li>
              <li>• Optional — never required to post or apply</li>
              <li>• If Stripe isn’t configured yet, we record willingness to pay only</li>
            </ul>
          </div>
          {error && <p className="text-rose-400 text-xs">{error}</p>}
        </div>

        <div className="px-5 py-3.5 border-t border-white/[0.07] flex gap-2 bg-black/20">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="flex-[1.4] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={13} />}
            Continue · {price}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
