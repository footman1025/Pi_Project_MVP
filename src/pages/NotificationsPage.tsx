import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Notification } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import StateMessage from '../components/StateMessage'

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
  const badgeCleared = useRef(false)

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user])

  // Opening the bell clears the unread badge; items stay visible so you can tap into chat
  useEffect(() => {
    if (!user || loading || badgeCleared.current) return
    if (notifications.length === 0) return
    badgeCleared.current = true
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(() => {
        window.dispatchEvent(new CustomEvent('pi:notifications-read'))
      })
  }, [user, loading, notifications.length])

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
    // Only show unread — once you've seen/cleared them they stay hidden
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_actor_id_fkey(full_name, role, username)')
      .eq('user_id', user!.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as NotifRow[]) || [])
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!user) return
    setMarkingAll(true)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications([])
    window.dispatchEvent(new CustomEvent('pi:notifications-read'))
    setMarkingAll(false)
  }

  const openNotification = async (n: NotifRow) => {
    // Hide immediately after tap
    setNotifications(list => list.filter(x => x.id !== n.id))
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    window.dispatchEvent(new CustomEvent('pi:notifications-read'))

    if (n.type === 'message' && n.actor_id) {
      navigate(`/messages?u=${n.actor_id}`)
      return
    }
    if (n.type === 'follow') {
      const username = n.profiles?.username
      if (username) navigate(`/p/${username}`)
      else navigate('/search')
      return
    }
    navigate('/feed')
  }

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={22} className="text-pi-400" />
            <h1 className="font-display text-3xl font-extrabold text-white">Notifications</h1>
            {notifications.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-pi-500">
                {notifications.length}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">Tap a message to open the chat directly.</p>
        </div>
        {notifications.length > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-50">
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner className="py-16" label="Loading notifications…" />
      ) : notifications.length === 0 ? (
        <StateMessage
          variant="empty"
          title="You're all caught up"
          description="No new notifications. When someone messages you, tap it here to open the chat."
          icon={Bell}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.like
            const Icon = cfg.icon
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className="flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:border-white/10 w-full text-left border-pi-500/20"
                style={{ background: 'rgba(20,184,166,0.08)' }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {n.profiles?.full_name && (
                      <span className="text-white font-semibold">{n.profiles.full_name} </span>
                    )}
                    {n.message || `${n.type}d your post`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {timeAgo(n.created_at)}
                    {n.type === 'message' && <span className="text-teal-400/80"> · Open chat</span>}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-pi-500 flex-shrink-0 mt-1.5" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
