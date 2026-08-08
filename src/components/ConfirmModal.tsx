import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2, X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Destructive (rose) vs neutral (teal) confirm button */
  tone?: 'danger' | 'default'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open || typeof document === 'undefined') return null

  const confirmStyle =
    tone === 'danger'
      ? { background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }
      : { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
      role="alertdialog"
      aria-modal
      aria-labelledby="pi-confirm-title"
      aria-describedby="pi-confirm-message"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #141a28 0%, #0a0e18 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex items-start gap-3 px-4 sm:px-5 pt-3 sm:pt-5 pb-2">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              tone === 'danger' ? 'bg-rose-500/15' : 'bg-teal-500/15'
            }`}
          >
            <AlertTriangle
              size={18}
              className={tone === 'danger' ? 'text-rose-300' : 'text-teal-300'}
            />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 id="pi-confirm-title" className="text-white font-bold text-[15px] leading-snug">
              {title}
            </h3>
            <p id="pi-confirm-message" className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-4 flex gap-2 border-t border-white/[0.06] mt-2 bg-black/20">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:bg-white/5 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
            style={confirmStyle}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
