import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles, UsersRound, Globe2, BadgeCheck, ShieldCheck, TrendingUp, UserCog, LogOut, ChevronDown, Bell, LayoutGrid, UserCircle2, Bot, SearchCheck, Link2, Rocket } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import UserAvatar from '../components/UserAvatar'
import { supabase } from '../lib/supabase'

const features = [
  { icon: Sparkles, title: 'AI-Powered Matching', desc: 'Our intelligent engine connects you with the right people, communities and opportunities — automatically.', color: 'text-indigo-400' },
  { icon: UsersRound, title: 'Creator Economy', desc: 'Monetize your expertise through courses, communities, live streams, and digital products in one place.', color: 'text-pink-400' },
  { icon: Globe2, title: 'Professional Growth', desc: 'Connect with professionals, investors, and collaborators across borders through AI-enhanced discovery.', color: 'text-emerald-400' },
  { icon: BadgeCheck, title: 'SEO Discoverability', desc: 'Public profiles and communities are search-engine indexed — grow organically without paid ads.', color: 'text-amber-400' },
  { icon: ShieldCheck, title: 'Communities', desc: 'Join or build niche communities across technology, business, arts and more with AI-curated content.', color: 'text-violet-400' },
  { icon: TrendingUp, title: 'Opportunity Hub', desc: 'Discover startup competitions, funding rounds, co-founders, mentors and freelance projects in one feed.', color: 'text-cyan-400' },
]

const stats = [
  { value: '2.3M+', label: 'Monthly searches for Pi profiles', demo: true },
  { value: '98%', label: 'Average match accuracy', demo: true },
  { value: '150+', label: 'Countries supported', demo: true },
  { value: '$1B+', label: 'Opportunities listed', demo: true },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { session, profile, user, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const isLoggedIn = !!session
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'You'
  const resolvedAvatar = avatarUrl || profile?.avatar_url || null

  // Keep local avatar in sync when AuthContext profile updates
  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [profile?.avatar_url])

  // Ensure latest avatar is loaded on the public landing header
  useEffect(() => {
    if (!user?.id) {
      setAvatarUrl(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.avatar_url) setAvatarUrl(data.avatar_url)
      })
    return () => { cancelled = true }
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    setAvatarUrl(null)
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 border-b border-white/5"
        style={{ background: 'rgba(8,13,26,0.9)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            π
          </div>
          <span className="text-white font-bold text-xl">Pi</span>
        </div>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400 mr-8">
          <a href="#why" className="hover:text-white transition-colors">Why Pi</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <button onClick={() => navigate('/demo')} className="hover:text-teal-300 transition-colors text-teal-400/90 font-medium">Investor Demo</button>
        </div>

        {isLoggedIn ? (
          /* ── Logged-in state — avatar dropdown only ── */
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
              >
                <UserAvatar
                  key={resolvedAvatar || user?.id || 'nav'}
                  url={resolvedAvatar}
                  name={displayName}
                  id={user?.id}
                  size={28}
                  rounded="rounded-lg"
                />
                <span className="text-white text-sm font-medium hidden sm:inline max-w-[120px] truncate">{displayName}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />

                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 shadow-2xl z-20 overflow-hidden animate-slide-up"
                    style={{ background: 'linear-gradient(135deg, #0d1224, #080d1a)' }}>

                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          key={`dd-${resolvedAvatar || user?.id || 'x'}`}
                          url={resolvedAvatar}
                          name={displayName}
                          id={user?.id}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                          <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <button
                        onClick={() => { navigate('/dashboard'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <LayoutGrid size={16} className="text-pi-400" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { navigate('/feed'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <Sparkles size={16} className="text-violet-400" />
                        My Feed
                      </button>
                      <button
                        onClick={() => { navigate('/notifications'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <Bell size={16} className="text-amber-400" />
                        Notifications
                      </button>
                      <button
                        onClick={() => { navigate('/profile/edit'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all text-left"
                      >
                        <UserCog size={16} className="text-emerald-400" />
                        Edit Profile
                      </button>

                      <div className="my-1 border-t border-white/5" />

                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Logged-out state */
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Get Started
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0d9488 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0f766e 0%, transparent 70%)' }} />
          {/* Grid */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(rgba(20,184,166,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pi-500/30 bg-pi-500/10 text-pi-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles size={14} />
            AI-Native Platform · Now in Private Beta
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 animate-slide-up">
            One Platform.{' '}
            <span className="block" style={{ background: 'linear-gradient(135deg, #5eead4, #2dd4bf, #99f6e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Infinite Opportunities.
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
            Pi is an AI-native human opportunity operating system — identity, matching, and opportunity intelligence in one layer.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}
            >
              Get Started Free
              <ArrowRight size={20} />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-teal-200 text-lg border border-teal-500/30 hover:bg-teal-500/10 transition-all"
            >
              <Sparkles size={18} /> Investor Demo Mode
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((s, i) => (
              <div key={i} className="text-center p-4 rounded-2xl border border-white/5 relative"
                style={{ background: 'rgba(20,184,166,0.05)' }}>
                {s.demo && (
                  <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-semibold">
                    Demo
                  </span>
                )}
                <p className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #5eead4, #99f6e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Pi */}
      <section id="why" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Why <span style={{ background: 'linear-gradient(135deg, #5eead4, #99f6e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pi</span>?
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            The internet fragmented our digital lives. We use different apps for every part of who we are. Pi unifies them with intelligence at the core.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { emoji: '📱', title: 'Before Pi', items: ['Instagram for social', 'LinkedIn for work', 'Discord for communities', 'ChatGPT for AI', 'Zoom for calls', 'Upwork for freelance'], bad: true },
            { emoji: '⚡', title: 'The Problem', items: ['Fragmented identity', 'Missed opportunities', 'No intelligent matching', 'Multiple subscriptions', 'Context switching fatigue', 'No unified discovery'], bad: true },
            { emoji: 'π', title: 'With Pi', items: ['One intelligent profile', 'AI-powered matching', 'Unified communities', 'Creator monetization', 'Professional growth', 'Organic SEO discovery'], bad: false },
          ].map((col, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${col.bad ? 'border-white/5' : 'border-pi-500/30'}`}
              style={{ background: col.bad ? 'rgba(255,255,255,0.02)' : 'rgba(20,184,166,0.08)' }}>
              <div className="text-3xl mb-4">{col.emoji}</div>
              <h3 className={`font-bold text-lg mb-4 ${col.bad ? 'text-slate-400' : 'text-white'}`}>{col.title}</h3>
              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j} className={`text-sm flex items-center gap-2 ${col.bad ? 'text-slate-500' : 'text-slate-300'}`}>
                    <span>{col.bad ? '✗' : '✓'}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6" style={{ background: 'rgba(20,184,166,0.03)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Everything in One Ecosystem</h2>
            <p className="text-lg text-slate-400">Built from the ground up with AI as the intelligence layer — not an add-on feature.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="p-6 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300 group cursor-pointer"
                style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.6))' }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                  <Icon size={20} />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Section */}
      <section id="seo" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 md:p-12 rounded-3xl border border-pi-500/20"
            style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(13,148,136,0.05))' }}>
            <div className="text-center mb-10">
              {/* Modern icon instead of emoji */}
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
                <TrendingUp size={30} className="text-white" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4">Grow Organically with SEO</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Every public creator, professional, and community on Pi is search-engine indexed. Pi becomes your long-term organic growth engine — no ad spend required.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Indexed Profiles',
                  desc: 'Your professional profile appears in Google search results for your name, skills, and expertise.',
                  icon: UserCircle2,
                  color: 'from-indigo-500 to-violet-600',
                },
                {
                  title: 'Discoverable Communities',
                  desc: 'Communities rank for topic-based searches, attracting members naturally.',
                  icon: Globe2,
                  color: 'from-emerald-500 to-teal-600',
                },
                {
                  title: 'Creator SEO Pages',
                  desc: 'Each creator gets a public SEO-optimized page with structured data and meta tags.',
                  icon: Sparkles,
                  color: 'from-pink-500 to-rose-600',
                },
                {
                  title: 'Opportunity Listings',
                  desc: 'Jobs, events, and opportunities surface in search for organic applicant discovery.',
                  icon: BadgeCheck,
                  color: 'from-amber-500 to-orange-600',
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-pi-500/20 transition-all">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <item.icon size={18} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Foundation Pillars */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pi-500/30 bg-pi-500/10 text-pi-300 text-sm font-medium mb-6">
              <Bot size={14} />
              The Foundation of Pi
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Intelligence That Creates{' '}
              <span style={{ background: 'linear-gradient(135deg, #5eead4, #99f6e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Real Value
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Pi is built on six core principles that make every interaction meaningful — not just productive.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: Bot, color: 'from-indigo-500 to-violet-600', title: 'AI Personal Intelligence', desc: 'Every user has an intelligent AI companion that discovers opportunities, organizes information, and personalizes the experience continuously.' },
              { Icon: UsersRound, color: 'from-pink-500 to-rose-600', title: 'Social Connection', desc: 'Meaningful connections based on goals, skills, and interests — not just engagement algorithms designed to maximize time spent.' },
              { Icon: TrendingUp, color: 'from-emerald-500 to-teal-600', title: 'Collaboration Economy', desc: 'Transform skills and ideas into opportunities through services, courses, digital products, and professional collaboration inside one ecosystem.' },
              { Icon: SearchCheck, color: 'from-amber-500 to-orange-600', title: 'SEO Growth Engine', desc: 'Organic discovery built in from day one. Public profiles, communities, and opportunities indexed for search engines — zero ad spend required.' },
              { Icon: Globe2, color: 'from-cyan-500 to-blue-600', title: 'Global Discovery', desc: 'AI-powered translation and matching breaks language barriers, connecting talent and opportunity across borders and time zones.' },
              { Icon: ShieldCheck, color: 'from-violet-500 to-purple-600', title: 'Trust & Safety', desc: 'Layered moderation, compliance, and fraud prevention built into the core architecture of Pi from day one.' },
            ].map(({ Icon, color, title, desc }, i) => (
              <div key={i}
                className="p-6 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300 group"
                style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.6))' }}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Long-Term Roadmap */}
      <section className="py-24 px-6" style={{ background: 'rgba(20,184,166,0.03)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pi-500/30 bg-pi-500/10 text-pi-300 text-sm font-medium mb-6">
              <Rocket size={14} />
              The Journey
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Long-Term Roadmap</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Pi earns the right to expand by making its first small network genuinely useful, understandable, and safe.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                Icon: Link2,
                phase: 'Phase 1',
                title: 'Foundation',
                color: 'from-indigo-500 to-violet-600',
                border: 'border-pi-500/30',
                bg: 'rgba(20,184,166,0.08)',
                active: true,
                items: ['AI-native social experience', 'User experience & personalization', 'Community building', 'Early adoption & feedback'],
              },
              {
                Icon: Rocket,
                phase: 'Phase 2',
                title: 'Expansion',
                color: 'from-emerald-500 to-teal-600',
                border: 'border-white/5',
                bg: 'rgba(30,27,75,0.3)',
                active: false,
                items: ['Professional networking', 'Creator economy tools', 'Digital services marketplace', 'Collaboration engine'],
              },
              {
                Icon: Globe2,
                phase: 'Phase 3',
                title: 'Pi Ecosystem',
                color: 'from-amber-500 to-orange-600',
                border: 'border-white/5',
                bg: 'rgba(30,27,75,0.3)',
                active: false,
                items: ['Advanced AI agents', 'Pi Earth integration', 'Smart City infrastructure', 'Global marketplace & economy'],
              },
            ].map(({ Icon, phase, title, color, border, bg, active, items }, i) => (
              <div key={i}
                className={`p-6 rounded-2xl border ${border} transition-all`}
                style={{ background: bg }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{phase}</p>
                    <p className="text-white font-black text-lg">{title}</p>
                  </div>
                  {active && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-semibold">
                      Now
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-400">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-pi-400' : 'bg-slate-600'}`}></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Pi Earth & Autopilot teaser */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                Icon: Globe2,
                color: 'from-emerald-500 to-teal-600',
                title: 'Pi Earth',
                badge: 'Coming Soon',
                desc: 'Satellite and Earth observation data transformed into AI-powered insights — supporting location-based services, environmental awareness, and Smart City initiatives.',
              },
              {
                Icon: Bot,
                color: 'from-violet-500 to-purple-600',
                title: 'Pi Autopilot',
                badge: 'Coming Soon',
                desc: 'An autonomous AI orchestration engine that continuously acquires, activates, engages, and retains users — turning Pi into a self-reinforcing growth ecosystem.',
              },
            ].map(({ Icon, color, title, badge, desc }, i) => (
              <div key={i}
                className="p-6 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all group"
                style={{ background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.6))' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{title}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-pi-500/15 border border-pi-500/20 text-pi-300 font-semibold">{badge}</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            The Future of Human Connection Starts Here.
          </h2>
          <p className="text-lg text-slate-400 mb-10">Connect. Grow. Create Opportunities.</p>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-white text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 60px rgba(20,184,166,0.5)' }}
          >
            Join Pi Now
            <ArrowRight size={22} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-white font-bold">π</span>
          <span>Pi — One Platform. Infinite Opportunities.</span>
        </div>
        <p>© 2026 Pi. All rights reserved. · Private Pilot</p>
      </footer>
    </div>
  )
}
