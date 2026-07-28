import { Loader2, Trash2 } from 'lucide-react'

type Props = {
  title: string
  description: string
  preview?: string | null
  deleting?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** In-app confirm dialog for deleting posts/comments (no browser confirm). */
export default function ConfirmDeleteDialog({
  title,
  description,
  preview,
  deleting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 p-4"
      onClick={() => !deleting && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #12182b, #0a0f1c)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <h3 id="confirm-delete-title" className="text-white font-bold text-lg mb-1">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-3">{description}</p>
          {preview?.trim() && (
            <p className="text-slate-500 text-xs line-clamp-3 mb-5 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
              “{preview.trim()}”
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:bg-white/5 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500/90 hover:bg-red-500 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
