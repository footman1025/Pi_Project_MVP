import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Notification } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Bell, Heart, MessageCircle, UserPlus, Loader2, CheckCheck } from 'lucide-react'

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

export default function NotificationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    if (user) fetchNotifications()
  }, [user])

  // Realtime
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(n => [payload.new as Notification, ...n])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_actor_id_fkey(full_name, role)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  const markAllRead = async () => {
    if (!user) return
    setMarkingAll(true)
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    setMarkingAll(false)
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
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
          <p className="text-slate-400 text-sm">Stay updated on your activity.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 hover:text-white transition-all disabled:opacity-50">
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-pi-400" /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={48} className="text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">No notifications yet</h3>
          <p className="text-slate-400 text-sm">When people like your posts, comment, or follow you, you'll see it here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = typeConfig[n.type] || typeConfig.like
            const Icon = cfg.icon
            return (
              <div key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:border-white/10
                  ${n.is_read ? 'border-white/5' : 'border-pi-500/20'}`}
                style={{ background: n.is_read ? 'rgba(14,20,25,0.3)' : 'rgba(20,184,166,0.08)' }}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {n.profiles && <span className="text-white font-semibold">{(n.profiles as any).full_name} </span>}
                    {n.message || `${n.type}d your post`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-pi-500 flex-shrink-0 mt-1.5" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
