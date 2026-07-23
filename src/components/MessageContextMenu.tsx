import { useEffect, useRef } from 'react'
import { Reply, Copy, Check, Link2, X } from 'lucide-react'

export type MessageMenuAction = 'reply' | 'copy' | 'copyLink' | 'dismiss'

type Props = {
  x: number
  y: number
  canCopyLink?: boolean
  onAction: (action: MessageMenuAction) => void
  onClose: () => void
}

export default function MessageContextMenu({ x, y, canCopyLink, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Keep menu inside viewport
  const menuW = 180
  const menuH = canCopyLink ? 140 : 108
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const item = (action: MessageMenuAction, label: string, Icon: typeof Reply) => (
    <button
      type="button"
      onClick={() => onAction(action)}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-left"
    >
      <Icon size={15} className="text-teal-400 flex-shrink-0" />
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="fixed z-[80] w-[180px] p-1.5 rounded-2xl border border-white/10 shadow-2xl"
      style={{
        left,
        top,
        background: 'linear-gradient(160deg, #12182b, #0a0f1c)',
      }}
      role="menu"
    >
      {item('reply', 'Reply', Reply)}
      {item('copy', 'Copy', Copy)}
      {canCopyLink && item('copyLink', 'Copy link', Link2)}
      <button
        type="button"
        onClick={() => onAction('dismiss')}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors text-left mt-0.5"
      >
        <X size={13} className="flex-shrink-0" />
        Cancel
      </button>
    </div>
  )
}

export function CopiedToast({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/90 text-white text-xs font-semibold shadow-lg">
      <Check size={14} /> Copied
    </div>
  )
}
