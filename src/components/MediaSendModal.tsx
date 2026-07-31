import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Loader2, Image as ImageIcon, Film } from 'lucide-react'
import { formatFileSize, isImageFile, isVideoFile } from '../lib/messageFiles'

type Props = {
  file: File
  previewUrl: string
  caption: string
  sending: boolean
  onCaptionChange: (v: string) => void
  onCancel: () => void
  onSend: () => void
}

/** Preview + confirm before sending an image or video (Telegram-style). */
export default function MediaSendModal({
  file,
  previewUrl,
  caption,
  sending,
  onCaptionChange,
  onCancel,
  onSend,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isImage = isImageFile(file.type)
  const isVideo = isVideoFile(file.type)
  const title = isVideo ? 'Send a video' : isImage ? 'Send an image' : 'Send media'

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    document.body.dataset.piModal = 'open'
    return () => { delete document.body.dataset.piModal }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, sending])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
      }}
      onClick={() => { if (!sending) onCancel() }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[min(92vh,720px)] flex flex-col"
        style={{ background: 'linear-gradient(165deg, #121a2b 0%, #0a101c 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isVideo ? <Film size={18} className="text-teal-300 shrink-0" /> : <ImageIcon size={18} className="text-teal-300 shrink-0" />}
            <h2 className="text-white font-semibold text-sm sm:text-base truncate">{title}</h2>
          </div>
          <button
            type="button"
            disabled={sending}
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto min-h-0">
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 max-h-[min(42vh,360px)] flex items-center justify-center">
            {isImage ? (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-[min(42vh,360px)] object-contain" />
            ) : isVideo ? (
              <video src={previewUrl} controls playsInline className="max-w-full max-h-[min(42vh,360px)]" />
            ) : (
              <p className="text-slate-400 text-sm p-8">{file.name}</p>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 truncate">
            {file.name} · {formatFileSize(file.size)}
          </p>

          <label className="block mt-3">
            <span className="text-xs font-semibold text-teal-300/90">Caption</span>
            <input
              ref={inputRef}
              value={caption}
              onChange={e => onCaptionChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !sending) {
                  e.preventDefault()
                  onSend()
                }
              }}
              disabled={sending}
              placeholder="Add a caption (optional)…"
              className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40 disabled:opacity-50"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10 shrink-0">
          <button
            type="button"
            disabled={sending}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={onSend}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 shadow-lg shadow-teal-500/20"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
