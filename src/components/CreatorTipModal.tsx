import { useState } from 'react'
import { createPortal } from 'react-dom'
import { HeartHandshake, Loader2, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import {
  TIP_PRESETS_EUR,
  formatTipAmount,
  recordTipIntent,
} from '../lib/creatorTips'

type Props = {
  open: boolean
  fromUserId: string
  toUserId: string
  toName: string
  onClose: () => void
  onDone?: (source: 'supabase' | 'local') => void
}

export default function CreatorTipModal({
  open,
  fromUserId,
  toUserId,
  toName,
  onClose,
  onDone,
}: Props) {
  const [cents, setCents] = useState(314)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [source, setSource] = useState<'supabase' | 'local'>('local')

  if (!open || typeof document === 'undefined') return null

  const submit = async () => {
    setBusy(true)
    setError('')
    const res = await recordTipIntent({
      fromUserId,
      toUserId,
      toName,
      amountCents: cents,
      note,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSource(res.source)
    setDone(true)
    onDone?.(res.source)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      role="dialog"
      aria-modal
      aria-label="Send a tip"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #1a1220 0%, #0a101c 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}
            >
              <HeartHandshake size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white font-bold text-sm">Tip {toName}</p>
                <StatusBadge kind="demo" label="Intent only" />
              </div>
              <p className="text-[11px] text-slate-500">No card charged · Stripe = Soon</p>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {done ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-pink-300 font-semibold text-sm">
                Tip intent recorded · {formatTipAmount(cents)}
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                {source === 'supabase'
                  ? 'Saved to your account. Real payouts arrive when payments ship.'
                  : 'Saved on this device. Run supabase_creator_tips.sql for account sync.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-xs leading-relaxed">
                Show support for <span className="text-white font-semibold">{toName}</span>.
                This is a product demo of tip intent — not a payment.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TIP_PRESETS_EUR.map(p => (
                  <button
                    key={p.cents}
                    type="button"
                    onClick={() => setCents(p.cents)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      cents === p.cents
                        ? 'border-pink-500/40 bg-pink-500/20 text-pink-100'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Optional message…"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pink-500/40 resize-none"
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <HeartHandshake size={13} />}
                  Record {formatTipAmount(cents)} intent
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
