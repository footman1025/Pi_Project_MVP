import { useEffect, useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { track } from '../lib/analytics'

/** Permanent after submit or dismiss — one-time popup only (no floating button). */
const DONE_KEY = 'pi_feedback_once_done'
const DELAY_MS = 28000

type Choice = 'yes' | 'maybe' | 'no'

function alreadyDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return true
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch { /* ignore */ }
}

/** One-time Quick validation popup — closes after use and does not return. */
export default function ValidationFeedback() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [blockers, setBlockers] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [gone, setGone] = useState(() => alreadyDone())

  useEffect(() => {
    if (!user || alreadyDone()) {
      setGone(true)
      return
    }
    // Prefer Dashboard / after a short session — not every page instantly
    const onHome = location.pathname === '/dashboard' || location.pathname === '/feed'
    const delay = onHome ? DELAY_MS : DELAY_MS + 20000
    const t = setTimeout(() => {
      if (!alreadyDone()) setOpen(true)
    }, delay)
    return () => clearTimeout(t)
  }, [user])

  if (!user || gone) return null

  const leaveScreen = () => {
    markDone()
    setOpen(false)
    setGone(true)
  }

  const submit = async () => {
    if (!choice) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('product_feedback').insert({
      user_id: user.id,
      would_use_again: choice,
      blockers: blockers.trim() || null,
      surface: 'one_time_popup',
      path: location.pathname,
    })
    setSending(false)
    if (err) {
      setError(err.message.includes('does not exist')
        ? 'Run supabase_product_metrics.sql first.'
        : err.message)
      return
    }
    track('feedback_submitted', { would_use_again: choice, has_blockers: !!blockers.trim(), once: true })
    setDone(true)
    setTimeout(leaveScreen, 1200)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl animate-fade-in"
        style={{ background: 'linear-gradient(160deg, #0e1419, #0a1018)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-validation-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p id="quick-validation-title" className="text-white font-bold text-base">Quick validation</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              One quick question — then this closes. Would you use Pi again this week?
            </p>
          </div>
          <button type="button" onClick={leaveScreen} className="text-slate-500 hover:text-white p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-emerald-300 text-sm py-6 justify-center">
            <Check size={18} /> Thanks — closing now.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([
                ['yes', 'Yes'],
                ['maybe', 'Maybe'],
                ['no', 'No'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChoice(id)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    choice === id
                      ? 'border-pi-500/50 text-white bg-pi-500/20'
                      : 'border-white/10 text-slate-300 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-xs text-slate-500 mb-1.5">What blocks you? (optional)</label>
            <textarea
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              rows={3}
              placeholder="e.g. empty matches, unclear next step…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40 resize-none mb-3"
            />

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={leaveScreen}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:border-white/20"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={!choice || sending}
                onClick={() => void submit()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
