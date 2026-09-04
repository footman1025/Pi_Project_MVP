import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Notification } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck, Sparkles,
  Briefcase, Mail, Smartphone, ArrowRight, RotateCcw, WifiOff,
} from 'lucide-react'
import { friendlyNetworkError, isOnline, withRetry } from '../lib/messagingReliability'
import LoadingSpinner from '../components/LoadingSpinner'
import StateMessage from '../components/StateMessage'
import ProfileName from '../components/ProfileName'
import InstallPiBanner from '../components/InstallPiBanner'
import {
  ensureSystemAlertPermission,
  systemAlertPermission,
  systemAlertsSupported,
} from '../lib/systemAlerts'
import { enablePushNotifications, pushSupported } from '../lib/pushNotifications'
import { profilePath } from '../lib/urls'
import {
  fetchNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from '../lib/emailNotifications'
import { track } from '../lib/analytics'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const typeConfig: Record<string, {
  icon: React.ElementType
  color: string
  bg: string
  glow: string
  label: string
}> = {
  like: { icon: Heart, color: 'text-rose-300', bg: 'bg-rose-500/15', glow: 'rgba(244,63,94,0.35)', label: 'Like' },
  comment: { icon: MessageCircle, color: 'text-sky-300', bg: 'bg-sky-500/15', glow: 'rgba(56,189,248,0.35)', label: 'Comment' },
  follow: { icon: UserPlus, color: 'text-emerald-300', bg: 'bg-emerald-500/15', glow: 'rgba(52,211,153,0.35)', label: 'Follow' },
  message: { icon: MessageCircle, color: 'text-amber-300', bg: 'bg-amber-500/15', glow: 'rgba(251,191,36,0.35)', label: 'Message' },
  ai_match: { icon: Sparkles, color: 'text-teal-300', bg: 'bg-teal-500/15', glow: 'rgba(45,212,191,0.4)', label: 'Match' },
  ai_opportunity: { icon: Briefcase, color: 'text-amber-200', bg: 'bg-amber-500/15', glow: 'rgba(251,191,36,0.4)', label: 'Opportunity' },
}

type NotifRow = Notification & {
  profiles?: { full_name?: string | null; role?: string | null; username?: string | null } | null
}

const ACTION_SUFFIXES = [
  'started following you',
  'liked your post',
  'commented on your post',
  'sent you a message',
] as const

/**
 * Message rows already include the actor name; the UI also renders ProfileName.
 * Strip the leading name (and known action templates) so we don't double-print —
 * which also stops browser translate from mangling surnames like Hotova → Hoova.
 */
function notificationActionText(n: NotifRow): string {
  const raw = (n.message || '').trim()
  const name = (n.profiles?.full_name || '').trim()

  if (name && raw) {
    if (raw.toLowerCase().startsWith(name.toLowerCase())) {
      const rest = raw.slice(name.length).replace(/^[\s,:-]+/, '').trim()
      if (rest) return rest
    }
  }

  for (const suffix of ACTION_SUFFIXES) {
    const idx = raw.toLowerCase().lastIndexOf(suffix)
    if (idx >= 0) return raw.slice(idx)
  }

  switch (n.type) {
    case 'follow':
      return 'started following you'
    case 'like':
      return 'liked your post'
    case 'comment':
      return 'commented on your post'
    case 'message':
      return 'sent you a message'
    default:
      return raw || `${n.type} update`
  }
}

/** Collapse trigger+client doubles (and message spam) for the recipient. */
function collapseNotificationList(rows: NotifRow[]): { keep: NotifRow[]; dropIds: string[] } {
  const keep: NotifRow[] = []
  const dropIds: string[] = []
  const seen = new Set<string>()

  for (const n of rows) {
    // One unread/read message row per actor; one like/comment per post+actor; one follow per actor
    let key: string
    if (n.type === 'message') {
      key = `message|${n.actor_id || ''}`
    } else if (n.type === 'like' || n.type === 'comment') {
      key = `${n.type}|${n.actor_id || ''}|${n.post_id || ''}`
    } else if (n.type === 'follow') {
      key = `follow|${n.actor_id || ''}`
    } else {
      key = `${n.type}|${n.actor_id || ''}|${(n.message || '').slice(0, 120)}`
    }

    if (seen.has(key)) {
      dropIds.push(n.id)
      continue
    }
    seen.add(key)
    keep.push(n)
  }

  return { keep, dropIds }
}

async function purgeDuplicateNotifications(dropIds: string[]) {
  if (!dropIds.length) return
  // Best-effort — needs delete policy; ignore failures
  const { error } = await supabase.from('notifications').delete().in('id', dropIds)
  if (error) {
    // Fall back: mark extras read so badge isn't inflated
    await supabase.from('notifications').update({ is_read: true }).in('id', dropIds)
  }
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-40 ${
        checked ? 'bg-teal-500' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [alertPerm, setAlertPerm] = useState(() => systemAlertPermission())
  const [pushHint, setPushHint] = useState('')
  const pushTried = useRef(false)
  const [emailPrefs, setEmailPrefs] = useState<NotificationPrefs>({
    email_enabled: false,
    email: null,
    push_enabled: true,
  })
  const [emailDraft, setEmailDraft] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailHint, setEmailHint] = useState('')
  const [listError, setListError] = useState('')
  const [online, setOnline] = useState(() => isOnline())

  useEffect(() => {
    const sync = () => setOnline(isOnline())
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  const fetchNotifications = async () => {
    if (!user) return
    setLoading(true)
    setListError('')
    try {
      const data = await withRetry(async () => {
        const query = supabase
          .from('notifications')
          .select('*, profiles!notifications_actor_id_fkey(full_name, role, username)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        // Hard timeout so a stuck auth lock cannot spin forever
        const result = await Promise.race([
          query,
          new Promise<{ data: null; error: { message: string } }>(resolve =>
            setTimeout(() => resolve({ data: null, error: { message: 'Notifications request timed out' } }), 12000),
          ),
        ])
        if (result.error) throw new Error(result.error.message)
        return result.data
      }, { attempts: 2, baseMs: 400, label: 'Could not load notifications' })
      const rows = (data as NotifRow[]) || []
      const { keep, dropIds } = collapseNotificationList(rows)
      setNotifications(keep)
      if (dropIds.length) {
        void purgeDuplicateNotifications(dropIds).then(() => {
          window.dispatchEvent(new CustomEvent('pi:notifications-read'))
        })
      }
    } catch (err) {
      setListError(friendlyNetworkError(err, 'Could not load notifications'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    void fetchNotifications()
    void fetchNotificationPrefs(user.id).then(({ prefs, error }) => {
      setEmailPrefs(prefs)
      setEmailDraft(prefs.email || user.email || '')
      if (error) setEmailHint(error)
    })
  }, [user])

  useEffect(() => {
    if (!online || !user) return
    if (listError) void fetchNotifications()
  }, [online])

  const saveEmailPrefs = async (next: Partial<NotificationPrefs> & { email?: string | null }) => {
    if (!user) return
    if (!isOnline()) {
      setEmailHint('You’re offline. Reconnect, then try again.')
      return
    }
    setEmailSaving(true)
    setEmailHint('')
    const merged = {
      email_enabled: next.email_enabled ?? emailPrefs.email_enabled,
      email: next.email !== undefined ? next.email : (emailDraft || null),
      push_enabled: next.push_enabled ?? emailPrefs.push_enabled,
    }
    const res = await saveNotificationPrefs(user.id, merged)
    if (res.error) {
      setEmailHint(res.error)
    } else {
      setEmailPrefs(merged)
      if (next.push_enabled !== undefined && next.email_enabled === undefined) {
        setEmailHint(merged.push_enabled ? 'Push alerts allowed' : 'Push alerts opted out')
        track('push_pref_saved', { enabled: merged.push_enabled })
      } else {
        setEmailHint(merged.email_enabled ? 'Email alerts on' : 'Email alerts off')
      }
    }
    setEmailSaving(false)
  }

  useEffect(() => {
    if (!user?.id || pushTried.current) return
    pushTried.current = true
    if (!pushSupported()) return
    if (systemAlertPermission() === 'denied') return
    void enablePushNotifications(user.id).then(r => {
      if (r.ok) setPushHint(r.reason === 'local-only' ? 'Local alerts on' : 'Push connected')
      else if (r.reason === 'denied') setPushHint('Alerts blocked in browser settings')
      else if (r.reason === 'offline') setPushHint('You’re offline — push will retry when connected')
      else if (r.reason === 'sw-failed') setPushHint('Could not register alerts — refresh and try again')
      else if (r.reason) setPushHint(`Push setup: ${r.reason}`)
    })
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const row = payload.new as NotifRow
        setNotifications(n => {
          if (n.some(x => x.id === row.id)) return n
          const { keep, dropIds } = collapseNotificationList([row, ...n])
          if (dropIds.length) void purgeDuplicateNotifications(dropIds)
          return keep
        })
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void fetchNotifications()
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const markAllRead = async () => {
    if (!user) return
    if (!isOnline()) {
      setListError('You’re offline. Reconnect, then try again.')
      return
    }
    setMarkingAll(true)
    try {
      await withRetry(async () => {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        if (error) throw new Error(error.message)
      }, { attempts: 2, baseMs: 350 })
      setNotifications(list => list.map(n => ({ ...n, is_read: true })))
      window.dispatchEvent(new CustomEvent('pi:notifications-read'))
    } catch (err) {
      setListError(friendlyNetworkError(err, 'Could not mark all as read'))
    } finally {
      setMarkingAll(false)
    }
  }

  const openNotification = async (n: NotifRow) => {
    track('notif_open', { type: n.type, id: n.id, was_unread: !n.is_read })
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setNotifications(list => list.map(x => x.id === n.id ? { ...x, is_read: true } : x))
      window.dispatchEvent(new CustomEvent('pi:notifications-read'))
    }

    if (n.type === 'message' && n.actor_id) {
      navigate(`/messages?u=${n.actor_id}`)
      return
    }
    if (n.type === 'follow' || n.type === 'ai_match' || n.type === 'like' || n.type === 'comment') {
      const path = profilePath(n.profiles?.username)
      if (path) {
        navigate(path, { state: { from: '/notifications' } })
        return
      }
      if (n.type === 'ai_match') {
        navigate('/match')
        return
      }
      if (n.type === 'like' || n.type === 'comment') {
        navigate('/feed')
        return
      }
      navigate('/search')
      return
    }
    if (n.type === 'ai_opportunity') {
      navigate('/opportunities')
      return
    }
    navigate('/feed')
  }

  const enableAlerts = async () => {
    const ok = await ensureSystemAlertPermission()
    setAlertPerm(systemAlertPermission())
    if (!user?.id) return
    const push = await enablePushNotifications(user.id)
    track('push_enable_result', { ok: push.ok, reason: push.reason || '' })
    if (push.ok || ok) {
      setPushHint(push.reason === 'local-only'
        ? 'System alerts on. Deploy VAPID for closed-app push.'
        : 'Push connected — OS alerts work when this tab is closed')
      const { showPiSystemAlert } = await import('../lib/systemAlerts')
      showPiSystemAlert({
        title: 'Pi alerts enabled',
        body: push.reason === 'local-only'
          ? 'System alerts on. Add VAPID keys on the server for closed-app push.'
          : 'You’ll get pop-up alerts even when Pi is closed. On iPhone, Install Pi to the Home Screen first.',
        path: '/notifications',
        tag: 'pi-alerts-enabled',
        force: true,
      })
    } else {
      setPushHint(
        push.reason === 'denied' ? 'Permission denied — enable in browser site settings'
          : push.reason === 'offline' ? 'You’re offline — reconnect, then try again'
            : push.reason === 'sw-failed' ? 'Could not register service worker — refresh and retry'
              : (push.reason || 'Could not enable'),
      )
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const ctaLabel =
    alertPerm === 'denied'
      ? 'Alerts blocked — open browser settings'
      : alertPerm === 'granted'
        ? 'Refresh push / system alerts'
        : 'Enable push notifications'

  if (!user) {
    return (
      <div className="min-h-full relative flex flex-col items-center justify-center py-20 px-6 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-50"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 0%, rgba(20,184,166,0.22), transparent)' }}
        />
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          <Bell size={24} className="text-white" />
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white mb-2">Sign in for notifications</h2>
        <p className="text-slate-400 text-sm mb-6 text-center max-w-sm">
          Stay updated on likes, comments, matches, and messages.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-8 py-3 rounded-xl font-bold text-white hover:brightness-110 transition-all"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 18% 0%, rgba(20,184,166,0.2), transparent)' }}
      />
      <div
        className="pointer-events-none absolute top-24 right-0 w-40 h-40 opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.35), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0">
        <InstallPiBanner />

        <header className="mb-6 sm:mb-7">
          <div className="flex items-start gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Bell size={18} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-amber-400 text-[9px] font-bold text-slate-900 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Stay in the loop
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-100 bg-teal-500/20 border border-teal-500/25">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={markingAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-teal-500/30 hover:text-teal-200 transition-all disabled:opacity-50"
              >
                {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                Mark all read
              </button>
            )}
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px] max-w-xl">
            Likes, comments, messages — plus AI matches and opportunities. Tap to open the person or chat.
          </p>
          {pushHint && (
            <p className="text-[11px] text-teal-400/80 mt-2 pl-[52px]">{pushHint}</p>
          )}
          {(systemAlertsSupported() || pushSupported()) && (
            <button
              type="button"
              onClick={() => void enableAlerts()}
              className="mt-2.5 ml-[52px] inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors"
            >
              {ctaLabel}
              <ArrowRight size={12} />
            </button>
          )}
        </header>

        {/* Delivery prefs */}
        <section className="mb-5 space-y-2.5">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div
              className="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
              style={{ background: '#14b8a6' }}
            />
            <div className="relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                <Smartphone size={16} className="text-teal-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold">Push on devices</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                      Web Push for phone, tablet, and desktop — no SMS.
                    </p>
                  </div>
                  <ToggleSwitch
                    label="Allow push"
                    checked={emailPrefs.push_enabled}
                    disabled={emailSaving}
                    onChange={v => void saveEmailPrefs({ push_enabled: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div
              className="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full opacity-15 blur-2xl"
              style={{ background: '#f59e0b' }}
            />
            <div className="relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold">Email alerts</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">
                      Optional. Same events as push — only if you opt in.
                    </p>
                  </div>
                  <ToggleSwitch
                    label="Opt in to email"
                    checked={emailPrefs.email_enabled}
                    disabled={emailSaving}
                    onChange={v => void saveEmailPrefs({ email_enabled: v, email: emailDraft || null })}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={e => setEmailDraft(e.target.value)}
                    placeholder={user.email || 'you@email.com'}
                    className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40 transition-colors"
                  />
                  <button
                    type="button"
                    disabled={emailSaving}
                    onClick={() => void saveEmailPrefs({
                      email_enabled: emailPrefs.email_enabled,
                      email: emailDraft || null,
                    })}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    {emailSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                  </button>
                </div>
                {emailHint && (
                  <p className="text-[11px] text-teal-400/80 mt-2">{emailHint}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {!online && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-100 text-xs">
            <WifiOff size={14} className="shrink-0" />
            You’re offline. Prefs and mark-as-read will work again when you reconnect.
          </div>
        )}

        {listError && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/25 bg-red-500/10">
            <p className="flex-1 text-red-300 text-xs leading-snug">{listError}</p>
            <button
              type="button"
              disabled={!online}
              onClick={() => void fetchNotifications()}
              className="inline-flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-rose-500/90 hover:bg-rose-400 disabled:opacity-40"
            >
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner className="py-16" label="Loading notifications…" />
        ) : !listError && notifications.length === 0 ? (
          <div
            className="rounded-2xl border border-white/[0.06] overflow-hidden"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.7), rgba(10,14,22,0.9))' }}
          >
            <StateMessage
              variant="empty"
              title="You're all caught up"
              description="No notifications yet. When someone messages or interacts, it shows here — and as a push if enabled."
              icon={Bell}
            />
          </div>
        ) : listError ? null : (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 px-0.5 mb-1">
              Recent activity
            </p>
            {notifications.map(n => {
              const cfg = typeConfig[n.type] || typeConfig.like
              const Icon = cfg.icon
              const unread = !n.is_read
              const actionHint =
                n.type === 'message' ? 'Open chat'
                  : n.type === 'ai_opportunity' ? 'View opportunities'
                    : n.type === 'ai_match' ? 'View match'
                      : (n.type === 'follow' || n.type === 'like' || n.type === 'comment') && n.profiles?.username
                        ? 'Open profile'
                        : null

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void openNotification(n)}
                  className={`group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border w-full text-left transition-all duration-200 hover:border-white/12 ${
                    unread
                      ? 'border-teal-500/25'
                      : 'border-white/[0.05] hover:bg-white/[0.02]'
                  }`}
                  style={{
                    background: unread
                      ? 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(14,20,25,0.85))'
                      : 'linear-gradient(160deg, rgba(18,28,40,0.75), rgba(10,14,22,0.9))',
                  }}
                >
                  <div
                    className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 rounded-xl opacity-40 blur-md"
                      style={{ background: cfg.glow }}
                    />
                    <Icon size={16} className={`relative ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color} opacity-80`}>
                        {cfg.label}
                      </span>
                      {unread && (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-teal-300/90 bg-teal-500/15 px-1.5 py-0.5 rounded">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {(n.profiles?.full_name || n.profiles?.username) && (
                        <>
                          <ProfileName
                            name={n.profiles.full_name}
                            username={n.profiles.username}
                            from="/notifications"
                            className="text-white font-semibold inline"
                          />
                          {' '}
                        </>
                      )}
                      <span>{notificationActionText(n)}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span>{timeAgo(n.created_at)}</span>
                      {actionHint && (
                        <>
                          <span className="text-slate-600">·</span>
                          <span className="text-teal-400/90 font-medium group-hover:text-teal-300 transition-colors inline-flex items-center gap-0.5">
                            {actionHint}
                            <ArrowRight size={11} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  {unread && (
                    <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-2 shadow-[0_0_8px_rgba(45,212,191,0.7)]" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
