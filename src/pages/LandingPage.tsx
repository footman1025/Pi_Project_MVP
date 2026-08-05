import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Sparkles, UsersRound, Globe2, BadgeCheck, ShieldCheck, TrendingUp,
  UserCog, LogOut, ChevronDown, Bell, LayoutGrid, Bot, SearchCheck, Menu, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import UserAvatar from '../components/UserAvatar'
import HeroOpportunityGraph from '../components/HeroOpportunityGraph'
import PiLogo from '../components/PiLogo'
import { supabase } from '../lib/supabase'

const pillars = [
  {
    icon: Bot,
    title: 'Digital Twin',
    desc: 'Skills and goals become an AI representation that ranks people and opportunities — with reasons you can audit.',
  },
  {
    icon: Sparkles,
    title: 'Intelligent matching',
    desc: 'Ranked intros based on what accelerates your goals — not a noisy feed optimized for time-on-app.',
  },
  {
    icon: TrendingUp,
    title: 'Opportunity layer',
    desc: 'Funding, roles, grants, and collaborations scored against your Twin in one catalog.',
  },
]

const featureRows = [
  { icon: UsersRound, title: 'Communities', desc: 'Twin-ranked hubs. Join, post, and grow density around real interests.' },
  { icon: SearchCheck, title: 'Discoverability', desc: 'Public profiles and feature pages built for organic search from day one.' },
  { icon: Globe2, title: 'Global graph', desc: 'Connect across borders with one identity layer and honest Live vs Demo labeling.' },
  { icon: ShieldCheck, title: 'Trust & clarity', desc: 'Engineering Transparency so investors and members see what’s real.' },
  { icon: BadgeCheck, title: 'Creator & pro paths', desc: 'Discover members now; monetization tools mature with the product.' },
  { icon: Bot, title: 'Meet Pi AI', desc: 'First contact that understands intent, then hands off to humans with context.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { session, profile, user, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = !!session
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'You'
  const resolvedAvatar = avatarUrl || profile?.avatar_url || null

  useEffect(() => {
    if (!dropdownOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = dropdownRef.current
      if (el && !el.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [dropdownOpen])

  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [profile?.avatar_url])

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

  const navLink = (label: string, action: () => void) => (
    <button
      type="button"
      onClick={() => { action(); setMobileOpen(false) }}
      className="text-sm text-slate-400 hover:text-white transition-colors"
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#06090f' }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3.5 border-b border-white/[0.06]"
        style={{ background: 'rgba(6,9,15,0.82)', backdropFilter: 'blur(18px)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <PiLogo size={36} className="transition-transform group-hover:scale-105 shadow-lg ring-1 ring-white/10" />
            <span className="font-display text-white font-bold text-lg tracking-tight">Pi</span>
          </button>

          <div className="flex-1" />

          <div className="hidden lg:flex items-center gap-6 mr-4">
            {navLink('Why', () => document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' }))}
            {navLink('Product', () => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' }))}
            {navLink('Demo', () => navigate('/demo'))}
            {navLink('Grow', () => navigate('/grow'))}
            {navLink('Connect', () => navigate('/connect'))}
          </div>

          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all"
              >
                <UserAvatar
                  key={resolvedAvatar || user?.id || 'nav'}
                  url={resolvedAvatar}
                  name={displayName}
                  id={user?.id}
                  size={28}
                  rounded="rounded-lg"
                />
                <span className="text-white text-sm font-medium hidden sm:inline max-w-[100px] truncate">{displayName}</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/10 shadow-2xl z-20 overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, #0d1220, #06090f)' }}
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                    <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                  </div>
                  <div className="p-1.5">
                    {[
                      { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard', color: 'text-teal-400' },
                      { to: '/feed', icon: Sparkles, label: 'Feed', color: 'text-cyan-400' },
                      { to: '/notifications', icon: Bell, label: 'Notifications', color: 'text-amber-400' },
                      { to: '/profile/edit', icon: UserCog, label: 'Edit profile', color: 'text-emerald-400' },
                    ].map(item => (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => { navigate(item.to); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 text-left"
                      >
                        <item.icon size={15} className={item.color} />
                        {item.label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-white/5" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 text-left"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-white/10"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="px-3.5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Get started
              </button>
            </div>
          )}

          <button
            type="button"
            className="lg:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden mt-3 pb-2 flex flex-col gap-3 border-t border-white/5 pt-3">
            {navLink('Why', () => document.getElementById('why')?.scrollIntoView({ behavior: 'smooth' }))}
            {navLink('Product', () => document.getElementById('product')?.scrollIntoView({ behavior: 'smooth' }))}
            {navLink('Demo', () => navigate('/demo'))}
            {navLink('Grow', () => navigate('/grow'))}
            {navLink('Connect', () => navigate('/connect'))}
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => { navigate('/signup'); setMobileOpen(false) }}
                className="mt-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white text-center"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                Get started
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Hero — brand first, one composition + animated graph */}
      <section className="relative min-h-[100svh] flex flex-col justify-center px-4 sm:px-6 pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              background:
                'radial-gradient(ellipse 90% 60% at 35% 25%, rgba(20,184,166,0.32), transparent 55%), radial-gradient(ellipse 55% 45% at 85% 55%, rgba(13,148,136,0.28), transparent)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(94,234,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.5) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent)',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto w-full grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-6 items-center">
          <div className="min-w-0">
            <p
              className="font-display text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white mb-6"
              style={{ animation: 'piRise 0.9s ease-out both' }}
            >
              Pi
            </p>
            <h1
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white/95 max-w-2xl leading-[1.15] mb-5"
              style={{ animation: 'piRise 0.9s ease-out 0.08s both' }}
            >
              Discover and create opportunities — then grow with AI.
            </h1>
            <p
              className="text-base sm:text-lg text-slate-400 max-w-xl leading-relaxed mb-9"
              style={{ animation: 'piRise 0.9s ease-out 0.16s both' }}
            >
              Opportunity Hub is Pi’s first layer: jobs, clients, co-founders, and partnerships —
              with Twin fit, apply intent, and messaging. The full AI ecosystem expands from here.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-3"
              style={{ animation: 'piRise 0.9s ease-out 0.24s both' }}
            >
              <button
                type="button"
                onClick={() => navigate(isLoggedIn ? '/opportunities' : '/signup')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-white text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 12px 40px rgba(20,184,166,0.28)' }}
              >
                {isLoggedIn ? 'Open Opportunity Hub' : 'Get started'}
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/demo')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-semibold text-teal-100 text-base border border-teal-500/25 hover:bg-teal-500/10 transition-colors"
              >
                Investor Demo
              </button>
            </div>
          </div>

          <div
            className="relative flex justify-center lg:justify-end mt-4 lg:mt-0"
            style={{ animation: 'piRise 1.1s ease-out 0.2s both' }}
          >
            <HeroOpportunityGraph />
          </div>
        </div>

        <style>{`
          @keyframes piRise {
            from { opacity: 0; transform: translateY(18px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes heroGraphBreathe {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.08); opacity: 1; }
          }
          @keyframes heroGraphSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes heroGraphSpinRev {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes heroGraphNode {
            0%, 100% { transform: translateY(0); opacity: 0.9; }
            50% { transform: translateY(-5px); opacity: 1; }
          }
          @keyframes heroGraphEdge {
            0%, 100% { stroke-opacity: 0.35; }
            50% { stroke-opacity: 0.9; }
          }
          @keyframes heroGraphCoreRing {
            0%, 100% { transform: scale(1); opacity: 0.55; }
            50% { transform: scale(1.18); opacity: 0.2; }
          }
          .hero-graph-breathe {
            animation: heroGraphBreathe 6s ease-in-out infinite;
            transform-origin: center;
          }
          .hero-graph-spin-slow {
            animation: heroGraphSpin 48s linear infinite;
          }
          .hero-graph-spin-rev {
            animation: heroGraphSpinRev 36s linear infinite;
          }
          .hero-graph-node {
            animation: heroGraphNode 4.5s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
          }
          .hero-graph-edge {
            animation: heroGraphEdge 3.2s ease-in-out infinite;
          }
          .hero-graph-core-ring {
            transform-box: fill-box;
            transform-origin: center;
            animation: heroGraphCoreRing 3.8s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-graph-breathe,
            .hero-graph-spin-slow,
            .hero-graph-spin-rev,
            .hero-graph-node,
            .hero-graph-edge,
            .hero-graph-core-ring {
              animation: none !important;
            }
          }
        `}</style>
      </section>

      {/* Why — one job */}
      <section id="why" className="relative px-4 sm:px-6 py-20 sm:py-28 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.16em] mb-3">Why Pi</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3 max-w-xl leading-tight">
            Fragmented tools. One intelligent layer.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mb-12 leading-relaxed">
            Social, work, communities, and AI live in separate apps. Pi unifies identity and opportunity with Twin intelligence at the center.
          </p>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[0.07] p-5 sm:p-6"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(8,12,20,0.95))' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-teal-200"
                  style={{ background: 'rgba(20,184,166,0.15)' }}
                >
                  <Icon size={18} />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section
        id="product"
        className="relative px-4 sm:px-6 py-20 sm:py-28"
        style={{ background: 'linear-gradient(180deg, rgba(20,184,166,0.04), transparent)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.16em] mb-3">Product</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white max-w-md leading-tight">
                Everything in one ecosystem
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/features')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200 self-start sm:self-auto"
            >
              Feature SEO hub <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {featureRows.map(({ icon: Icon, title, desc }) => (
              <button
                key={title}
                type="button"
                onClick={() => navigate('/features')}
                className="text-left rounded-2xl border border-white/[0.07] p-5 hover:border-teal-500/30 transition-colors group"
                style={{ background: 'rgba(10,14,22,0.75)' }}
              >
                <Icon size={18} className="text-teal-400 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-bold text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Discoverability */}
      <section id="seo" className="px-4 sm:px-6 py-20 sm:py-28 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-teal-400 text-xs font-bold uppercase tracking-[0.16em] mb-3">Visibility</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Built to be found
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6 max-w-md">
              Profiles, features, and investor surfaces ship with SEO foundations — so every improvement compounds discoverability.
            </p>
            <button
              type="button"
              onClick={() => navigate('/features')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Explore features <ArrowRight size={15} />
            </button>
          </div>
          <ul className="space-y-3">
            {[
              { t: 'Indexed public profiles', d: 'Name, skills, and expertise that can surface in search.' },
              { t: 'Feature identity pages', d: 'Twin, matching, communities, opportunities — each discoverable.' },
              { t: 'Honest transparency', d: 'Live / Partial / Demo labels so trust scales with growth.' },
            ].map(item => (
              <li
                key={item.t}
                className="flex gap-3 rounded-2xl border border-white/[0.07] px-4 py-4"
                style={{ background: 'rgba(14,20,28,0.7)' }}
              >
                <SearchCheck size={16} className="text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-semibold mb-0.5">{item.t}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{item.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative px-4 sm:px-6 py-24 sm:py-32 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 80%, rgba(20,184,166,0.35), transparent)' }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
            Start with Pi
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mb-8">
            Connect. Match. Grow opportunities — with AI that serves the user.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(isLoggedIn ? '/dashboard' : '/signup')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {isLoggedIn ? 'Go to dashboard' : 'Create account'}
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/transparency')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-slate-300 border border-white/10 hover:border-white/20"
            >
              What’s live
            </button>
          </div>
        </div>
      </section>

      <footer className="px-4 sm:px-6 py-10 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-white font-bold inline-flex items-center gap-2">
              <PiLogo size={22} rounded="rounded-lg" /> Pi
            </span>
            <span className="text-slate-600 text-sm">One platform. Infinite opportunities.</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {[
              { l: 'Features', to: '/features' },
              { l: 'Grow', to: '/grow' },
              { l: 'Demo', to: '/demo' },
              { l: 'Transparency', to: '/transparency' },
              { l: 'Connect', to: '/connect' },
            ].map(x => (
              <button
                key={x.to}
                type="button"
                onClick={() => navigate(x.to)}
                className="text-slate-500 hover:text-teal-300 transition-colors"
              >
                {x.l}
              </button>
            ))}
          </div>
        </div>
        <p className="max-w-6xl mx-auto mt-6 text-slate-600 text-xs">© 2026 Pi · Private Pilot</p>
      </footer>
    </div>
  )
}
