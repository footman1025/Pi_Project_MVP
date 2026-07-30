import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Notification } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck, Sparkles, Briefcase, Mail, Smartphone } from 'lucide-react'
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

const typeConfig: Record<string, { icon: React.ElementType, color: string, bg: string }> = {
  like: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  comment: { icon: MessageCircle, color: 'text-pi-400', bg: 'bg-pi-500/15' },
  follow: { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  message: { icon: MessageCircle, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  ai_match: { icon: Sparkles, color: 'text-teal-300', bg: 'bg-teal-500/15' },
  ai_opportunity: { icon: Briefcase, color: 'text-amber-300', bg: 'bg-amber-500/15' },
}

type NotifRow = Notification & {
  profiles?: { full_name?: string | null; role?: string | null; username?: string | null } | null
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

  useEffect(() => {
    if (user) {
      fetchNotifications()
      void fetchNotificationPrefs(user.id).then(p => {
        setEmailPrefs(p)
        setEmailDraft(p.email || user.email || '')
      })
    }
  }, [user])

  const saveEmailPrefs = async (next: Partial<NotificationPrefs> & { email?: string | null }) => {
    if (!user) return
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

  // Soft re-enable push once per visit (helps when permission was granted but subscription missing)
  useEffect(() => {
    if (!user?.id || pushTried.current) return
    pushTried.current = true
    if (!pushSupported()) return
    if (systemAlertPermission() === 'denied') return
    void enablePushNotifications(user.id).then(r => {
      if (r.ok) setPushHint(r.reason === 'local-only' ? 'Local alerts on' : 'Push connected')
      else if (r.reason === 'denied') setPushHint('Alerts blocked in browser settings')
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
        setNotifications(n => [payload.new as NotifRow, ...n])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchNotifications = async () => {
    // Keep recent history (read + unread) so opening the page doesn’t wipe the list
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_actor_id_fkey(full_name, role, username)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as NotifRow[]) || [])
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!user) return
    setMarkingAll(true)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(list => list.map(n => ({ ...n, is_read: true })))
    window.dispatchEvent(new CustomEvent('pi:notifications-read'))
    setMarkingAll(false)
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

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6">
        <Bell size={48} className="text-pi-400 mb-4" />
        <h2 className="font-display text-2xl font-extrabold text-white mb-2">Sign in for notifications</h2>
        <p className="text-slate-400 text-sm mb-6">Stay updated on likes, comments, and messages.</p>
        <button onClick={() => navigate('/login')}
          className="px-8 py-3 rounded-xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>Sign In</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <InstallPiBanner />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={22} className="text-pi-400" />
            <h1 className="font-display text-3xl font-extrabold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-pi-500">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">Likes, comments, messages — plus AI suggestions. Tap to open the person or chat.</p>
          {pushHint && <p className="text-[11px] text-teal-400/80 mt-1">{pushHint}</p>}
          {(systemAlertsSupported() || pushSupported()) && (
            <button
              type="button"
              onClick={async () => {
                const ok = await ensureSystemAlertPermission()
                setAlertPerm(systemAlertPermission())
                if (user?.id) {
                  const push = await enablePushNotifications(user.id)
                  track('push_enable_result', { ok: push.ok, reason: push.reason || '' })
                  if (push.ok || ok) {
                    setPushHint(push.reason === 'local-only'
                      ? 'System alerts on. Deploy VAPID for closed-app push.'
                      : 'Push enabled — keep Pi installed / allowed in browser.')
                    const { showPiSystemAlert } = await import('../lib/systemAlerts')
                    showPiSystemAlert({
                      title: 'Pi alerts enabled',
                      body: push.reason === 'local-only'
                        ? 'System alerts on. Add VAPID keys on the server for closed-app push.'
                        : 'Push enabled for likes, comments, messages, and AI suggestions.',
                      path: '/notifications',
                      tag: 'pi-alerts-enabled',
                      force: true,
                    })
                  } else {
                    setPushHint(push.reason === 'denied' ? 'Permission denied — enable in browser site settings' : (push.reason || 'Could not enable'))
                  }
                }
              }}
              className="mt-2 text-xs font-semibold text-teal-300 hover:text-teal-200 underline underline-offset-2"
            >
              {alertPerm === 'denied'
                ? 'Alerts blocked — enable Pi in browser site settings'
                : alertPerm === 'granted'
                  ? 'Refresh push / system alerts'
                  : 'Enable push notifications (phone · tablet · desktop)'}
            </button>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-50">
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      <div
        className="mb-6 rounded-2xl border border-white/8 p-4 space-y-3"
        style={{ background: 'rgba(14,20,25,0.55)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
            <Smartphone size={16} className="text-teal-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-white text-sm font-semibold">Phone / tablet / desktop</p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={emailPrefs.push_enabled}
                  disabled={emailSaving}
                  onChange={e => void saveEmailPrefs({ push_enabled: e.target.checked })}
                  className="rounded border-white/20 bg-black/40 text-teal-500 focus:ring-teal-500/40"
                />
                Allow push
              </label>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
              Cellphone alerts use <span className="text-slate-300">Web Push</span> (enable above + Install Pi).
              No SMS — browser/PWA is the phone channel. Opt out anytime.
            </p>
          </div>
        </div>
        <div className="border-t border-white/5 pt-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Mail size={16} className="text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-white text-sm font-semibold">Email alerts</p>
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={emailPrefs.email_enabled}
                  disabled={emailSaving}
                  onChange={e => void saveEmailPrefs({ email_enabled: e.target.checked, email: emailDraft || null })}
                  className="rounded border-white/20 bg-black/40 text-teal-500 focus:ring-teal-500/40"
                />
                Opt in
              </label>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed mb-2">
              Optional. Same events as push (likes, comments, messages, AI suggestions) — only if you enable this.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailDraft}
                onChange={e => setEmailDraft(e.target.value)}
                placeholder={user.email || 'you@email.com'}
                className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
              />
              <button
                type="button"
                disabled={emailSaving}
                onClick={() => void saveEmailPrefs({ email_enabled: emailPrefs.email_enabled, email: emailDraft || null })}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 border border-white/10 hover:border-white/20 disabled:opacity-50"
              >
                {emailSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
            </div>
            {emailHint && <p className="text-[11px] text-teal-400/80 mt-1.5">{emailHint}</p>}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-16" label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <StateMessage
          variant="empty"
          title="You're all caught up"
          description="No notifications yet. When someone messages or interacts, it shows here — and as a push if enabled."
          icon={Bell}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.like
            const Icon = cfg.icon
            const unread = !n.is_read
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:border-white/10 w-full text-left ${
                  unread ? 'border-pi-500/20' : 'border-white/5'
                }`}
                style={{ background: unread ? 'rgba(20,184,166,0.08)' : 'rgba(14,20,25,0.4)' }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {n.profiles?.full_name && (
                      <ProfileName
                        name={n.profiles.full_name}
                        username={n.profiles.username}
                        from="/notifications"
                        className="text-white font-semibold inline"
                      />
                    )}
                    {' '}
                    {n.message || `${n.type}d your post`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {timeAgo(n.created_at)}
                    {n.type === 'message' && <span className="text-teal-400/80"> · Open chat</span>}
                    {(n.type === 'follow' || n.type === 'like' || n.type === 'comment') && n.profiles?.username && (
                      <span className="text-teal-400/80"> · Open profile</span>
                    )}
                  </p>
                </div>
                {unread && <div className="w-2 h-2 rounded-full bg-pi-500 flex-shrink-0 mt-1.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
