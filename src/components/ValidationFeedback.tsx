import { useEffect, useState } from 'react'
import { MessageSquareHeart, X, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { track } from '../lib/analytics'

const DISMISS_KEY = 'pi_feedback_dismissed_until'

type Choice = 'yes' | 'maybe' | 'no'

export default function ValidationFeedback() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [blockers, setBlockers] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    try {
      const until = localStorage.getItem(DISMISS_KEY)
      if (until && Date.now() < Number(until)) return
      const t = setTimeout(() => setOpen(true), 45000)
      return () => clearTimeout(t)
    } catch {
      /* ignore */
    }
  }, [user])

  if (!user) return null

  const dismiss = (days = 3) => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86400000))
    } catch { /* ignore */ }
    setOpen(false)
  }

  const submit = async () => {
    if (!choice) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('product_feedback').insert({
      user_id: user.id,
      would_use_again: choice,
      blockers: blockers.trim() || null,
      surface: 'in_app',
      path: location.pathname,
    })
    setSending(false)
    if (err) {
      setError(err.message.includes('does not exist')
        ? 'Run supabase_product_metrics.sql first.'
        : err.message)
      return
    }
    track('feedback_submitted', { would_use_again: choice, has_blockers: !!blockers.trim() })
    setDone(true)
    setTimeout(() => dismiss(7), 1600)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setDone(false); setError('') }}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-900/40 border border-white/10 hover:scale-105 transition-transform"
        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        title="Quick validation feedback"
        aria-label="Give feedback"
      >
        <MessageSquareHeart size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 p-5 shadow-2xl animate-fade-in"
            style={{ background: 'linear-gradient(160deg, #0e1419, #0a1018)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-white font-bold text-base">Quick validation</p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Would you use Pi again this week? Your answer strengthens our traction story.
                </p>
              </div>
              <button type="button" onClick={() => dismiss(2)} className="text-slate-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="flex items-center gap-2 text-emerald-300 text-sm py-6 justify-center">
                <Check size={18} /> Thanks — recorded for the team metrics.
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

                <label className="block text-xs text-slate-500 mb-1.5">What blocks you from getting value? (optional)</label>
                <textarea
                  value={blockers}
                  onChange={e => setBlockers(e.target.value)}
                  rows={3}
                  placeholder="e.g. empty matches, unclear next step, slow onboarding…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40 resize-none mb-3"
                />

                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => dismiss(3)}
                    className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-white/10 hover:border-white/20"
                  >
                    Later
                  </button>
                  <button
                    type="button"
                    disabled={!choice || sending}
                    onClick={submit}
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
      )}
    </>
  )
}
