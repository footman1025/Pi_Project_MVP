import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Sparkles, Briefcase, Rocket,
  UsersRound, Building2, SearchCheck, Telescope,
  LogOut, Bell, Menu, X, BotMessageSquare, ScanFace,
  Newspaper, MessageCircle, UserCog
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const navItems = [
  { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { to: '/feed', icon: Newspaper, label: 'Feed' },
  { to: '/match', icon: Sparkles, label: 'AI Matching' },
  { to: '/opportunities', icon: Briefcase, label: 'Opportunities' },
  { to: '/creators', icon: Rocket, label: 'Creator Hub' },
  { to: '/professionals', icon: Building2, label: 'Professionals' },
  { to: '/communities', icon: UsersRound, label: 'Communities' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/search', icon: SearchCheck, label: 'Search' },
  { to: '/vision', icon: Telescope, label: 'Pi Vision' },
]

interface Props {
  children: React.ReactNode
  onAssistantToggle: () => void
}

export default function AppShell({ children, onAssistantToggle }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // Fetch unread notification count
  useEffect(() => {
    if (!user) return
    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifs(count || 0)
    }
    fetchCount()

    const channel = supabase
      .channel(`notif-count:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadNotifs(c => c + 1))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const avatarLetter = profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          border-r border-white/5
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0`}
        style={{ background: 'linear-gradient(180deg, #0d1224 0%, #080d1a 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => { navigate('/'); setSidebarOpen(false) }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            π
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Pi</span>
          <span className="ml-auto text-xs text-pi-400 bg-pi-500/10 px-2 py-0.5 rounded-full border border-pi-500/20">Beta</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-pi-500/15 text-pi-300 border border-pi-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/5 space-y-0.5">
          <button onClick={onAssistantToggle}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
            <BotMessageSquare size={18} className="text-pi-400" />
            AI Assistant
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
          <NavLink to="/profile/edit" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-pi-500/15 text-pi-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <UserCog size={18} />
            Edit Profile
          </NavLink>
          <button onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200">
            <LogOut size={18} />
            Sign Out
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl bg-white/3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-slate-500 text-xs truncate">{profile?.role || 'Pi Member'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 h-16 border-b border-white/5 flex-shrink-0"
          style={{ background: 'rgba(8,13,26,0.95)', backdropFilter: 'blur(12px)' }}>
          <button className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex-1" />

          <button onClick={onAssistantToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pi-500/10 border border-pi-500/20 text-pi-300 text-sm font-medium hover:bg-pi-500/20 transition-all">
            <ScanFace size={16} />
            <span className="hidden sm:inline">Ask AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <NavLink to="/notifications" className="relative text-slate-400 hover:text-white transition-colors p-2">
            <Bell size={20} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pi-500 text-white text-xs flex items-center justify-center font-bold">
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </span>
            )}
          </NavLink>

          <NavLink to="/profile/edit"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm hover:opacity-80 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {avatarLetter}
          </NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
