import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Briefcase, ArrowRight, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { track } from '../lib/analytics'
import StatusBadge from './StatusBadge'

type AiNotif = {
  id: string
  type: string
  message: string | null
  is_read: boolean
  created_at: string
}

/** Phase 2: surface AI match/opportunity recommendations on Dashboard (not only in Notifications). */
export default function ForYouRecommendations() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<AiNotif[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, message, is_read, created_at')
        .eq('user_id', user.id)
        .in('type', ['ai_match', 'ai_opportunity'])
        .order('created_at', { ascending: false })
        .limit(4)
      if (!cancelled) setItems((data as AiNotif[]) || [])
    })()
    return () => { cancelled = true }
  }, [user?.id])

  if (dismissed || !items.length) return null

  return (
    <div
      className="rounded-2xl border border-teal-500/25 p-4 sm:p-5 mb-6 relative"
      style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(8,13,26,0.9))' }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true)
          track('ai_for_you_dismiss')
        }}
        className="absolute top-3 right-3 text-slate-500 hover:text-white p-1"
      >
        <X size={14} />
      </button>
      <div className="flex items-center gap-2 mb-1 pr-8">
        <Sparkles size={16} className="text-teal-300" />
        <h2 className="text-white font-bold text-base">For you · Pi Intelligence</h2>
        <StatusBadge kind="live" label="AI recommendations" />
      </div>
      <p className="text-slate-500 text-xs mb-3">
        Ranked match & opportunity suggestions (same pipeline as your alerts — cooldown prevents spam).
      </p>
      <ul className="space-y-2">
        {items.map(n => {
          const isOpp = n.type === 'ai_opportunity'
          const Icon = isOpp ? Briefcase : Sparkles
          const path = isOpp ? '/opportunities' : '/match'
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={async () => {
                  track('ai_for_you_open', { type: n.type, id: n.id })
                  if (!n.is_read) {
                    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
                    window.dispatchEvent(new CustomEvent('pi:notifications-read'))
                  }
                  navigate(path)
                }}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-white/8 bg-black/20 hover:border-teal-500/30 text-left transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isOpp ? 'bg-amber-500/15 text-amber-300' : 'bg-teal-500/15 text-teal-300'
                }`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">{n.message || (isOpp ? 'Opportunity suggestion' : 'Match suggestion')}</p>
                  <p className="text-[11px] text-teal-400/80 mt-1 inline-flex items-center gap-1">
                    Open {isOpp ? 'opportunities' : 'matching'} <ArrowRight size={11} />
                  </p>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-2" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
