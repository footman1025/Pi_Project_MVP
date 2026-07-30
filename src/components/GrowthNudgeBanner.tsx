import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, Flame, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  enablePushNotifications,
  pushSupported,
  showLocalPush,
} from '../lib/pushNotifications'
import {
  getActivityStreak,
  markReengageNudgeShown,
  markWeeklyDigestShown,
  shouldReengageNudge,
  shouldShowWeeklyDigest,
  bumpActivityStreak,
} from '../lib/engagement'
import { track } from '../lib/analytics'
import { systemAlertPermission } from '../lib/systemAlerts'

type BannerKind = 'push' | 'digest' | 'reengage' | null

/** Phase 2 growth nudges: push opt-in, weekly digest, re-engagement. */
export default function GrowthNudgeBanner({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [kind, setKind] = useState<BannerKind>(null)
  const [streak, setStreak] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    bumpActivityStreak()
    setStreak(getActivityStreak())

    const perm = systemAlertPermission()
    if (pushSupported() && perm !== 'granted') {
      setKind('push')
      return
    }
    if (shouldReengageNudge()) {
      setKind('reengage')
      markReengageNudgeShown()
      void showLocalPush({
        title: 'Welcome back to Pi',
        body: 'Your Twin, matches, and opportunities are waiting — pick up where you left off.',
        path: '/dashboard',
        tag: 'pi-reengage',
      })
      return
    }
    if (shouldShowWeeklyDigest() && unreadCount > 0) {
      setKind('digest')
    }
  }, [unreadCount])

  if (!kind || !user) return null

  const dismiss = () => {
    if (kind === 'digest') markWeeklyDigestShown()
    track('growth_nudge_dismiss', { kind })
    setKind(null)
  }

  if (kind === 'push') {
    return (
      <div className="mb-6 rounded-2xl border border-cyan-500/25 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ background: 'rgba(6,182,212,0.08)' }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Bell size={18} className="text-cyan-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-bold">Enable phone alerts</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Get likes, messages, and AI suggestions on your phone (Web Push / Install Pi).
              {streak > 1 ? ` · ${streak}-day streak` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              const r = await enablePushNotifications(user.id)
              track('push_enable_result', { ok: r.ok, reason: r.reason || '' })
              setBusy(false)
              if (r.ok) setKind(null)
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {busy ? '…' : 'Enable'}
          </button>
          <button type="button" onClick={dismiss} className="text-slate-500 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  if (kind === 'digest') {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/25 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{ background: 'rgba(245,158,11,0.08)' }}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <CalendarDays size={18} className="text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-sm font-bold">Weekly digest</p>
            <p className="text-slate-400 text-xs mt-0.5">
              You have {unreadCount} unread alert{unreadCount === 1 ? '' : 's'} — catch up on intros and AI suggestions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              markWeeklyDigestShown()
              track('weekly_digest_open')
              navigate('/notifications')
              setKind(null)
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-amber-500/80"
          >
            Open inbox
          </button>
          <button type="button" onClick={dismiss} className="text-slate-500 hover:text-white p-1">
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-2xl border border-violet-500/25 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{ background: 'rgba(139,92,246,0.08)' }}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Flame size={18} className="text-violet-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-sm font-bold">Welcome back</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Pick up your Twin, matches, or opportunities — keep the streak going
            {streak > 0 ? ` (${streak} day${streak === 1 ? '' : 's'})` : ''}.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            track('reengage_nudge_open')
            navigate('/match')
            setKind(null)
          }}
          className="px-3 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
        >
          Resume
        </button>
        <button type="button" onClick={dismiss} className="text-slate-500 hover:text-white p-1">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
