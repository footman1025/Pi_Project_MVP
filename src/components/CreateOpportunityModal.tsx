import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, Loader2, X } from 'lucide-react'
import StatusBadge from './StatusBadge'
import {
  CREATE_CATEGORIES,
  createOpportunity,
  type CreateCategory,
  type OpportunityItem,
} from '../lib/opportunities'

type Props = {
  open: boolean
  ownerId: string
  onClose: () => void
  onCreated: (item: OpportunityItem, source: 'supabase' | 'local') => void
}

export default function CreateOpportunityModal({ open, ownerId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<CreateCategory>('Job')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [prize, setPrize] = useState('')
  const [deadline, setDeadline] = useState('')
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open || typeof document === 'undefined') return null

  const submit = async () => {
    setBusy(true)
    setError('')
    const res = await createOpportunity({
      ownerId,
      title,
      category,
      subtitle,
      description,
      prize,
      deadline,
      location,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onCreated(res.item, res.source)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))' }}
      role="dialog"
      aria-modal
      aria-label="Create opportunity"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #141a28 0%, #0a0e18 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.07]">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Briefcase size={17} className="text-white" />
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-[15px]">Create opportunity</h3>
                <StatusBadge kind="partial" label="Hub 0→1" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Jobs, services, partnerships, co-founders — first validation layer. Featured listing = Soon.
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Looking for a React co-founder"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CREATE_CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                    category === c
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
              Short summary
            </label>
            <input
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="One line people see in the catalog"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="What you’re offering or looking for…"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
                Comp / prize
              </label>
              <input
                value={prize}
                onChange={e => setPrize(e.target.value)}
                placeholder="Equity · $ · Open"
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
                Deadline
              </label>
              <input
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                placeholder="Open · date"
                className="w-full bg-black/35 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5 block">
              Location
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Remote · City · Hybrid"
              className="w-full bg-black/35 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="px-4 sm:px-5 py-3.5 border-t border-white/[0.07] flex gap-2 bg-black/20">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 border border-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || title.trim().length < 4}
            onClick={() => void submit()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Briefcase size={13} />}
            Publish opportunity
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
