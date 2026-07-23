import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Smile, Sticker } from 'lucide-react'
import { emojiCategories, stickerPacks } from '../data/stickers'

type Tab = 'emoji' | 'stickers'

interface Props {
  open: boolean
  onClose: () => void
  onEmoji: (emoji: string) => void
  onSticker: (emoji: string) => void
}

export default function MessagePicker({ open, onClose, onEmoji, onSticker }: Props) {
  const [tab, setTab] = useState<Tab>('emoji')
  const [query, setQuery] = useState('')
  const [emojiCat, setEmojiCat] = useState(emojiCategories[0].id)
  const [packId, setPackId] = useState(stickerPacks[0].id)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Defer so the click that opened the picker doesn't immediately close it
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc)
      document.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const activeEmojiCat = emojiCategories.find(c => c.id === emojiCat) || emojiCategories[0]
  const activePack = stickerPacks.find(p => p.id === packId) || stickerPacks[0]

  const filteredEmojis = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return emojiCategories
      .flatMap(c => c.emojis)
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .filter(e => e.includes(q) || e.codePointAt(0)?.toString(16).includes(q))
      .slice(0, 80)
  }, [query])

  const filteredStickers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return stickerPacks
      .flatMap(p => p.stickers.map(s => ({ pack: p.name, emoji: s })))
      .filter(s => s.pack.toLowerCase().includes(q) || s.emoji.includes(q))
      .slice(0, 48)
  }, [query])

  if (!open) return null

  return (
    <div
      ref={rootRef}
      className="absolute bottom-full left-0 mb-2 w-[min(100%-0.5rem,340px)] max-w-[calc(100vw-1rem)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 flex flex-col"
      style={{ height: 380, background: 'linear-gradient(180deg, #121a28 0%, #0c121c 100%)' }}
    >
      {/* Tabs */}
      <div className="flex border-b border-white/10 px-2 pt-2">
        {([
          { id: 'emoji' as const, label: 'Emoji', Icon: Smile },
          { id: 'stickers' as const, label: 'Stickers', Icon: Sticker },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTab(id); setQuery('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === id
                ? 'text-pi-300 border-pi-400'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'emoji' ? 'Search emoji…' : 'Search stickers…'}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-pi-500/40"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {tab === 'emoji' && (
          <>
            {filteredEmojis ? (
              <div className="grid grid-cols-8 gap-0.5">
                {filteredEmojis.map((e, i) => (
                  <button
                    key={`${e}-${i}`}
                    type="button"
                    onClick={() => onEmoji(e)}
                    className="aspect-square text-xl rounded-lg hover:bg-white/10 transition-colors"
                    title={e}
                  >
                    {e}
                  </button>
                ))}
                {filteredEmojis.length === 0 && (
                  <p className="col-span-8 text-center text-slate-500 text-xs py-8">No emoji found</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1">
                  {activeEmojiCat.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {activeEmojiCat.emojis.map((e, i) => (
                    <button
                      key={`${e}-${i}`}
                      type="button"
                      onClick={() => onEmoji(e)}
                      className="aspect-square text-xl rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'stickers' && (
          <>
            {filteredStickers ? (
              <div className="grid grid-cols-4 gap-2">
                {filteredStickers.map((s, i) => (
                  <button
                    key={`${s.emoji}-${i}`}
                    type="button"
                    onClick={() => onSticker(s.emoji)}
                    className="aspect-square text-4xl rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center"
                    title={s.pack}
                  >
                    {s.emoji}
                  </button>
                ))}
                {filteredStickers.length === 0 && (
                  <p className="col-span-4 text-center text-slate-500 text-xs py-8">No stickers found</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">
                  {activePack.name}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {activePack.stickers.map((s, i) => (
                    <button
                      key={`${s}-${i}`}
                      type="button"
                      onClick={() => onSticker(s)}
                      className="aspect-square text-4xl rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom category / pack bar */}
      <div className="border-t border-white/10 px-2 py-1.5 flex gap-1 overflow-x-auto">
        {tab === 'emoji'
          ? emojiCategories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setEmojiCat(c.id); setQuery('') }}
                title={c.label}
                className={`w-8 h-8 rounded-lg flex-shrink-0 text-base flex items-center justify-center transition-colors ${
                  emojiCat === c.id && !query ? 'bg-pi-500/20 ring-1 ring-pi-500/40' : 'hover:bg-white/10'
                }`}
              >
                {c.icon}
              </button>
            ))
          : stickerPacks.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPackId(p.id); setQuery('') }}
                title={p.name}
                className={`w-8 h-8 rounded-lg flex-shrink-0 text-sm font-bold flex items-center justify-center transition-colors ${
                  packId === p.id && !query ? 'bg-pi-500/20 ring-1 ring-pi-500/40' : 'hover:bg-white/10 text-slate-300'
                }`}
              >
                {p.icon}
              </button>
            ))}
      </div>
    </div>
  )
}
