import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { track } from '../lib/analytics'

type Choice = 'yes' | 'maybe' | 'no'

const doneKey = (opportunityId: string, role: 'applicant' | 'owner') =>
  `pi_outcome_fb_${role}_${opportunityId}`

function alreadyDone(opportunityId: string, role: 'applicant' | 'owner') {
  try {
    return localStorage.getItem(doneKey(opportunityId, role)) === '1'
  } catch {
    return true
  }
}

function markDone(opportunityId: string, role: 'applicant' | 'owner') {
  try {
    localStorage.setItem(doneKey(opportunityId, role), '1')
  } catch {
    /* ignore */
  }
}

/**
 * P1 lightweight signal after a Hub outcome — owner or applicant.
 * Stores in product_feedback with surface=opportunity_outcome.
 */
export default function OpportunityOutcomeFeedback({
  opportunityId,
  opportunityTitle,
  role,
  outcomeLabel: outcomeText,
}: {
  opportunityId: string
  opportunityTitle?: string | null
  role: 'applicant' | 'owner'
  outcomeLabel: string
}) {
  const { user } = useAuth()
  const [gone, setGone] = useState(() => alreadyDone(opportunityId, role))
  const [choice, setChoice] = useState<Choice | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!user || gone) return null

  const submit = async () => {
    if (!choice) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('product_feedback').insert({
      user_id: user.id,
      would_use_again: choice,
      blockers: note.trim() || null,
      surface: 'opportunity_outcome',
      path: `/opportunities?outcome_fb=${opportunityId}`,
    })
    setSending(false)
    if (err) {
      setError(
        err.message.includes('does not exist')
          ? 'Run supabase_product_metrics.sql first.'
          : err.message,
      )
      return
    }
    track('feedback_submitted', {
      would_use_again: choice,
      has_blockers: !!note.trim(),
      surface: 'opportunity_outcome',
      role,
      opportunity_id: opportunityId,
      outcome: outcomeText,
    })
    markDone(opportunityId, role)
    setDone(true)
    setTimeout(() => setGone(true), 900)
  }

  return (
    <div className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      {done ? (
        <p className="text-[11px] text-teal-300 font-semibold inline-flex items-center gap-1">
          <Check size={12} /> Thanks — recorded for Traction
        </p>
      ) : (
        <>
          <p className="text-[11px] text-slate-300 font-medium leading-snug">
            {role === 'owner'
              ? `Was this outcome useful for “${opportunityTitle || 'this listing'}”?`
              : `Did this ${outcomeText || 'outcome'} feel fair / useful?`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([
              ['yes', 'Yes'],
              ['maybe', 'Maybe'],
              ['no', 'No'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setChoice(id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                  choice === id
                    ? 'border-teal-400/50 bg-teal-500/15 text-teal-100'
                    : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {choice && (
            <div className="mt-2 flex flex-col gap-1.5">
              <input
                value={note}
                onChange={e => setNote(e.target.value.slice(0, 280))}
                placeholder="Optional: what worked or broke?"
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
              />
              <button
                type="button"
                disabled={sending}
                onClick={() => void submit()}
                className="self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : null}
                Send
              </button>
            </div>
          )}
          {error && <p className="mt-1.5 text-[10px] text-rose-300">{error}</p>}
        </>
      )}
    </div>
  )
}
