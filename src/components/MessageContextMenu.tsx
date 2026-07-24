import { useEffect, useRef, useState } from 'react'
import {
  Reply, Copy, Check, Link2, Pin, Forward, Trash2, CheckCircle2, ChevronDown,
} from 'lucide-react'

export type MessageMenuAction =
  | 'reply'
  | 'copy'
  | 'copyLink'
  | 'pin'
  | 'forward'
  | 'delete'
  | 'select'
  | 'dismiss'
  | { type: 'react'; emoji: string }

const QUICK_REACTIONS = ['❤️', '👍', '👎', '🔥', '🥰', '😂', '😮', '😢']
const MORE_REACTIONS = ['👏', '🎉', '💯', '🙏', '👀', '✨', '🚀', '💪', '🤔', '😎', '🤝', '⭐']

type Props = {
  x: number
  y: number
  isMe?: boolean
  canCopyLink?: boolean
  canDelete?: boolean
  onAction: (action: MessageMenuAction) => void
  onClose: () => void
}

export default function MessageContextMenu({
  x, y, isMe, canCopyLink, canDelete, onAction, onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)

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

  const menuW = 220
  const menuH = moreOpen ? 420 : 340
  const left = Math.min(Math.max(8, x - menuW / 2), window.innerWidth - menuW - 8)
  const top = Math.min(Math.max(8, y - 12), window.innerHeight - menuH - 8)

  const item = (
    action: Exclude<MessageMenuAction, { type: 'react' }>,
    label: string,
    Icon: typeof Reply,
    danger = false,
  ) => (
    <button
      type="button"
      onClick={() => onAction(action)}
      className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left ${
        danger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : 'text-slate-100 hover:bg-white/10'
      }`}
    >
      <Icon size={16} className={`flex-shrink-0 ${danger ? 'text-rose-400' : 'text-teal-400'}`} />
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      className="fixed z-[80] w-[220px] flex flex-col gap-2"
      style={{ left, top }}
      role="menu"
    >
      {/* Reaction bar — Telegram style */}
      <div
        className="rounded-full border border-white/10 shadow-2xl px-2 py-1.5 flex items-center gap-0.5 overflow-x-auto"
        style={{ background: 'linear-gradient(160deg, #1a2238, #0e1424)' }}
      >
        {QUICK_REACTIONS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onAction({ type: 'react', emoji })}
            className="w-9 h-9 rounded-full text-lg hover:bg-white/10 hover:scale-110 transition-all flex items-center justify-center shrink-0"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(o => !o)}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
            moreOpen ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
          aria-label="More reactions"
        >
          <ChevronDown size={14} className={moreOpen ? 'rotate-180' : ''} />
        </button>
      </div>

      {moreOpen && (
        <div
          className="rounded-2xl border border-white/10 shadow-2xl p-2 grid grid-cols-6 gap-1"
          style={{ background: 'linear-gradient(160deg, #1a2238, #0e1424)' }}
        >
          {MORE_REACTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => onAction({ type: 'react', emoji })}
              className="aspect-square rounded-xl text-lg hover:bg-white/10 hover:scale-110 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        className="rounded-2xl border border-white/10 shadow-2xl p-1.5 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #12182b, #0a0f1c)' }}
      >
        {item('reply', 'Reply', Reply)}
        {item('pin', 'Pin', Pin)}
        {item('copy', 'Copy Text', Copy)}
        {canCopyLink && item('copyLink', 'Copy link', Link2)}
        {item('forward', 'Forward', Forward)}
        {item('select', 'Select', CheckCircle2)}
        {(canDelete ?? isMe) && item('delete', 'Delete', Trash2, true)}
      </div>
    </div>
  )
}

export function CopiedToast({ show, label = 'Copied' }: { show: boolean; label?: string }) {
  if (!show) return null
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/90 text-white text-xs font-semibold shadow-lg">
      <Check size={14} /> {label}
    </div>
  )
}
