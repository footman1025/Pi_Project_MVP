import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Sparkles, Briefcase, Rocket,
  UsersRound, Building2, SearchCheck, Telescope,
  LogOut, Bell, Menu, X, BotMessageSquare, ScanFace,
  Newspaper, MessageCircle, UserCog, ShieldCheck, Activity, Inbox, TrendingUp,
  Accessibility, Shield, Flag,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import UserAvatar from './UserAvatar'
import ValidationFeedback from './ValidationFeedback'
import { track } from '../lib/analytics'
import { applyUgePreferences, hydrateUgeFromProfile, loadUgePreferences } from '../lib/ugePreferences'
import { playConnectSound, unlockConnectSound } from '../lib/connectSound'
import { withRetry } from '../lib/messagingReliability'
import {
  ensureSystemAlertPermission,
  showSystemAlertForRow,
} from '../lib/systemAlerts'
import { registerPiServiceWorker, enablePushNotifications } from '../lib/pushNotifications'
import { maybeSendAiSuggestions } from '../lib/aiSuggestions'
import PiLogo from './PiLogo'

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard', core: true },
  { to: '/twin', icon: BotMessageSquare, label: 'AI Twin', core: true },
  { to: '/feed', icon: Newspaper, label: 'Feed', core: true },
  { to: '/match', icon: Sparkles, label: 'Matching', core: true },
  { to: '/opportunities', icon: Briefcase, label: 'Opportunities', core: true },
  { to: '/creators', icon: Rocket, label: 'Creators', core: false },
  { to: '/professionals', icon: Building2, label: 'Professionals', core: false },
  { to: '/communities', icon: UsersRound, label: 'Communities', core: true },
  { to: '/messages', icon: MessageCircle, label: 'Messages', core: true },
  { to: '/search', icon: SearchCheck, label: 'Search', core: true },
  { to: '/experience', icon: Accessibility, label: 'Experience', core: true },
  { to: '/trust', icon: Shield, label: 'Trust & Safety', core: true },
  { to: '/moderation', icon: Flag, label: 'Moderation', core: false },
  { to: '/vision', icon: Telescope, label: 'Vision', core: false },
  { to: '/transparency', icon: ShieldCheck, label: 'What’s live', core: false },
  { to: '/traction', icon: Activity, label: 'Traction', core: false },
  { to: '/grow', icon: TrendingUp, label: 'Grow', core: false },
  { to: '/handoffs', icon: Inbox, label: 'Handoffs', core: false },
  { to: '/connect', icon: BotMessageSquare, label: 'Meet Pi AI', core: false },
]

const mobileTabs = [
  { to: '/feed', icon: Newspaper, label: 'Feed' },
  { to: '/match', icon: Sparkles, label: 'Match' },
  { to: '/messages', icon: MessageCircle, label: 'Chat' },
  { to: '/search', icon: SearchCheck, label: 'Search' },
  { to: '/dashboard', icon: LayoutGrid, label: 'Home' },
]

interface Props {
  children: React.ReactNode
  onAssistantToggle: () => void
}

export default function AppShell({ children, onAssistantToggle }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [simplifiedNav, setSimplifiedNav] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, user, signOut } = useAuth()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  useEffect(() => {
    const sync = () => {
      const next = loadUgePreferences()
      applyUgePreferences(next)
      setSimplifiedNav(next.simplifiedNav)
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('pi:uge-prefs', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('pi:uge-prefs', sync)
    }
  }, [])

  useEffect(() => {
    if (profile?.uge_preferences) {
      const merged = hydrateUgeFromProfile(profile.uge_preferences)
      setSimplifiedNav(merged.simplifiedNav)
    }
  }, [profile?.uge_preferences])

  const handleSignOut = async () => {
    track('sign_out')
    await signOut()
    navigate('/')
  }

  useEffect(() => {
    if (!user) return
    const fetchCount = async () => {
      try {
        const count = await withRetry(async () => {
          const { count: n, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
          if (error) throw new Error(error.message)
          return n ?? 0
        }, { attempts: 2, baseMs: 350 })
        setUnreadNotifs(count)
      } catch {
        // Keep last known badge count — don't flash to 0 on a glitch
      }
    }
    void fetchCount()

    const onRead = () => { void fetchCount() }
    const onOnline = () => { void fetchCount() }
    window.addEventListener('pi:notifications-read', onRead)
    window.addEventListener('online', onOnline)

    // Unlock Web Audio + request OS notification permission after first tap
    const unlock = () => {
      void unlockConnectSound()
      void ensureSystemAlertPermission().then((ok) => {
        if (ok && user?.id) void enablePushNotifications(user.id)
      })
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    void registerPiServiceWorker()
    if (profile) {
      void maybeSendAiSuggestions(profile)
    }

    const onAlertClick = (e: Event) => {
      const path = (e as CustomEvent<{ path?: string }>).detail?.path
      if (path) navigate(path)
    }
    const onPlayAlertSound = () => {
      void unlockConnectSound().then(() => playConnectSound())
    }
    window.addEventListener('pi:system-alert-click', onAlertClick)
    window.addEventListener('pi:play-alert-sound', onPlayAlertSound)

    const channel = supabase
      .channel(`notif-count:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setUnreadNotifs(c => c + 1)
          const row = payload.new as {
            id?: string
            type?: string
            message?: string | null
            actor_id?: string | null
          }
          // Alien ring on follow + message (incl. video) — same sound, not replaced
          if (row?.type === 'follow' || row?.type === 'message') {
            void unlockConnectSound().then(() => playConnectSound())
          }
          // Always show OS toast while this tab/PWA is alive (hidden OK).
          // Same tag as Web Push so closed-app push + open-tab toast replace, not stack.
          // When the website is fully closed, only Web Push (/api/push) can alert.
          if (row?.type === 'ai_match' || row?.type === 'ai_opportunity') return
          showSystemAlertForRow(row)
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void fetchCount() })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') void fetchCount()
      })
    return () => {
      window.removeEventListener('pi:notifications-read', onRead)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('pi:system-alert-click', onAlertClick)
      window.removeEventListener('pi:play-alert-sound', onPlayAlertSound)
      supabase.removeChannel(channel)
    }
  }, [user, profile, navigate])

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const isMessages = location.pathname.startsWith('/messages')

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          border-r border-white/5
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #0d1224 0%, #080d1a 100%)' }}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => { navigate('/'); setSidebarOpen(false) }}>
          <PiLogo size={36} className="shadow-lg ring-1 ring-white/10" />
          <span className="text-white font-bold text-xl tracking-tight">Pi</span>
          <span className="ml-auto text-xs text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">Beta</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems
            .filter(item => !simplifiedNav || item.core)
            .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-teal-500/15 text-teal-200 border border-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
          <button onClick={onAssistantToggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
            <BotMessageSquare size={18} className="text-teal-400" />
            AI Assistant
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
          <button onClick={() => { navigate('/demo'); setSidebarOpen(false) }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-teal-300/90 hover:text-teal-200 hover:bg-teal-500/10 transition-all duration-200">
            <Sparkles size={18} />
            Investor Demo
          </button>
          <NavLink to="/profile/edit" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-teal-500/15 text-teal-200' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <UserCog size={18} />
            Edit Profile
          </NavLink>
          <button onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200">
            <LogOut size={18} />
            Sign Out
          </button>

          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-white/3">
            <UserAvatar url={profile?.avatar_url} name={displayName} id={user?.id} username={profile?.username} from="/dashboard" size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-slate-500 text-xs truncate">{profile?.role || 'Pi Member'}</p>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center gap-3 px-4 lg:px-6 h-14 sm:h-16 border-b border-white/5 flex-shrink-0"
          style={{ background: 'rgba(8,13,26,0.95)', backdropFilter: 'blur(12px)' }}>
          <button className="lg:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex-1 min-w-0">
            <p className="lg:hidden text-white text-sm font-semibold truncate">
              {navItems.find(n => location.pathname.startsWith(n.to))?.label || 'Pi'}
            </p>
          </div>

          <button onClick={onAssistantToggle}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-200 text-sm font-medium hover:bg-teal-500/20 transition-all">
            <ScanFace size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>

          <NavLink to="/notifications" className="relative text-slate-400 hover:text-white transition-colors p-2">
            <Bell size={20} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </NavLink>

          <NavLink to="/profile/edit" className="hover:opacity-80 transition-opacity hidden sm:block">
            <UserAvatar url={profile?.avatar_url} name={displayName} id={user?.id} username={profile?.username} from="/dashboard" size={36} />
          </NavLink>
        </header>

        <main
          className={`flex-1 min-w-0 ${
            isMessages
              ? 'overflow-hidden min-h-0 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] lg:pb-0'
              : 'overflow-y-auto overflow-x-hidden pb-20 lg:pb-0'
          }`}
        >
          <div className={`animate-fade-in min-w-0 ${isMessages ? 'h-full' : ''}`}>{children}</div>
        </main>

        <nav
          className="pi-bottom-tabs lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 flex items-stretch justify-around px-1 pt-1"
          style={{
            background: 'rgba(8,13,26,0.96)',
            backdropFilter: 'blur(16px)',
            paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))',
          }}
        >
          {mobileTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-semibold transition-colors ${
                  isActive ? 'text-teal-300' : 'text-slate-500'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <ValidationFeedback />
    </div>
  )
}
