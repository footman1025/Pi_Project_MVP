import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MapPin, Globe2, Star, Code2, ChevronDown, ChevronUp, ExternalLink, LayoutGrid, UserCog, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const profiles: Record<string, {
  name: string; role: string; bio: string; location: string; avatar: string;
  color: string; tags: string[]; website: string; stats: { label: string; value: string }[];
}> = {
  'cristian-hotova': {
    name: 'Cristian Hotova',
    role: 'Founder & CEO · Pi (π)',
    bio: 'Building Pi — an AI-native platform for human connection, collaboration, and opportunity. Passionate about the intersection of AI, communities, and the future of work.',
    location: 'London, UK',
    avatar: 'C',
    color: 'from-pi-500 to-teal-600',
    tags: ['AI', 'Entrepreneurship', 'Product', 'Communities', 'Startups'],
    website: 'pinetwork.ai',
    stats: [
      { label: 'Connections', value: '1.4k' },
      { label: 'Followers', value: '2.8k' },
      { label: 'Pi Score', value: '94' },
    ],
  },
  'gabriel': {
    name: 'Gabriel',
    role: 'Technical Co-Founder · Pi (π)',
    bio: 'Engineering leader and AI architect. Building scalable, AI-native products. Team lead of 4 engineers specializing in Web & Mobile Architecture, Automation, and AI.',
    location: 'United States',
    avatar: 'G',
    color: 'from-emerald-500 to-teal-600',
    tags: ['Full-Stack', 'AI Engineering', 'Startups', 'Architecture', 'Python'],
    website: 'gabrieldev.io',
    stats: [
      { label: 'Connections', value: '980' },
      { label: 'Followers', value: '1.2k' },
      { label: 'Pi Score', value: '98' },
    ],
  },
}

const seoMeta = (profile: typeof profiles['cristian-hotova'], username: string) => ({
  title: `${profile.name} — ${profile.role} | Pi`,
  description: profile.bio,
  canonical: `https://pi.network/p/${username}`,
  jsonLd: JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.name,
    "jobTitle": profile.role,
    "description": profile.bio,
    "url": `https://pi.network/p/${username}`,
    "sameAs": [`https://pi.network/p/${username}`],
    "knowsAbout": profile.tags,
    "address": { "@type": "PostalAddress", "addressLocality": profile.location }
  }, null, 2),
  metaTags: [
    { name: 'description', content: profile.bio },
    { property: 'og:title', content: `${profile.name} on Pi` },
    { property: 'og:description', content: profile.bio },
    { property: 'og:url', content: `https://pi.network/p/${username}` },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: `${profile.name} on Pi` },
    { name: 'robots', content: 'index, follow' },
  ]
})

export default function ProfilePage() {
  const { username = 'cristian-hotova' } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { session, profile: authProfile, user, signOut } = useAuth()
  const [showSEO, setShowSEO] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const profile = profiles[username] ?? profiles['cristian-hotova']
  const seo = seoMeta(profile, username)

  const isLoggedIn = !!session
  const avatarLetter = authProfile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'
  const displayName = authProfile?.full_name || user?.email?.split('@')[0] || 'You'

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#06090c' }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4 border-b border-white/5"
        style={{ background: 'rgba(8,13,26,0.9)', backdropFilter: 'blur(16px)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold text-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
          <span className="text-white font-bold text-xl">Pi</span>
        </div>

        <div className="flex-1" />

        {isLoggedIn ? (
          /* ── Logged-in state ── */
          <div className="flex items-center gap-2">
            {/* Dashboard button */}
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              <LayoutGrid size={15} />
              Dashboard
            </button>

            {/* Avatar + dropdown */}
            <div className="relative">
              <button onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {avatarLetter}
                </div>
                <span className="text-white text-sm font-medium hidden sm:inline max-w-[100px] truncate">{displayName}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl z-20 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0e1419, #06090c)' }}>

                    {/* User header */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                      <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                    </div>

                    {/* Menu items */}
                    <div className="p-2">
                      <button onClick={() => { navigate('/dashboard'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        <LayoutGrid size={15} className="text-pi-400" /> Dashboard
                      </button>
                      <button onClick={() => { navigate('/notifications'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        <Bell size={15} className="text-amber-400" /> Notifications
                      </button>
                      <button onClick={() => { navigate('/profile/edit'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        <UserCog size={15} className="text-emerald-400" /> Edit Profile
                      </button>
                      <div className="my-1 border-t border-white/5" />
                      <button onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Logged-out state ── */
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              Join Pi
            </button>
          </div>
        )}
      </nav>

      {/* ── Page content ── */}
      <div className="px-6 pt-24 pb-12 max-w-3xl mx-auto">

        {/* Profile card */}
        <div className="p-6 rounded-3xl border border-white/5 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.8))' }}>
          <div className="flex items-start gap-5">
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white font-extrabold text-4xl flex-shrink-0`}
              style={{ boxShadow: '0 0 30px rgba(20,184,166,0.4)' }}>
              {profile.avatar}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-extrabold text-white mb-1">{profile.name}</h1>
              <p className="text-pi-300 font-semibold mb-2">{profile.role}</p>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
                <MapPin size={14} />
                {profile.location}
                <span className="mx-1">·</span>
                <Globe2 size={14} />
                {profile.website}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{profile.bio}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {profile.tags.map(t => (
              <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-pi-500/10 border border-pi-500/20 text-pi-300 font-medium">
                {t}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
            {profile.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="font-display text-xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => isLoggedIn ? navigate('/dashboard') : navigate('/signup')}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              {isLoggedIn ? 'Go to Dashboard' : 'Connect on Pi'}
            </button>
            <button className="px-4 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:border-white/20 transition-all flex items-center gap-2">
              <ExternalLink size={15} />
              Share
            </button>
          </div>
        </div>

        {/* SEO Preview Toggle */}
        <div className="rounded-2xl border border-pi-500/20 overflow-hidden"
          style={{ background: 'rgba(20,184,166,0.05)' }}>
          <button
            onClick={() => setShowSEO(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-pi-500/5 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pi-500 to-teal-600 flex items-center justify-center">
                <Code2 size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">SEO Structure Preview</p>
                <p className="text-slate-400 text-xs">See how search engines discover this Pi profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-pi-300 bg-pi-500/10 border border-pi-500/20 px-2 py-0.5 rounded-full font-semibold">Indexed ✓</span>
              {showSEO ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </div>
          </button>

          {showSEO && (
            <div className="px-5 pb-5 animate-fade-in space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Page Title</p>
                <p className="text-sm text-emerald-400 font-mono">{seo.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Canonical URL</p>
                <p className="text-sm text-blue-400 font-mono">{seo.canonical}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Meta Tags</p>
                <div className="bg-black/30 rounded-xl p-3 font-mono text-xs space-y-1">
                  {seo.metaTags.map((m, i) => (
                    <div key={i} className="text-slate-300">
                      <span className="text-pink-400">{'<meta '}</span>
                      {'name' in m ? (
                        <><span className="text-yellow-400">name</span><span className="text-slate-400">=</span><span className="text-green-400">"{m.name}"</span></>
                      ) : (
                        <><span className="text-yellow-400">property</span><span className="text-slate-400">=</span><span className="text-green-400">"{m.property}"</span></>
                      )}
                      <span className="text-slate-400"> </span>
                      <span className="text-yellow-400">content</span><span className="text-slate-400">=</span><span className="text-green-400">"{m.content}"</span>
                      <span className="text-pink-400">{' />'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Structured Data (JSON-LD)</p>
                <pre className="bg-black/30 rounded-xl p-3 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {seo.jsonLd}
                </pre>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Star size={14} className="text-emerald-400" />
                <p className="text-emerald-300 text-xs font-medium">
                  This profile is fully indexed by Google, Bing, and other search engines — driving organic discovery for Pi.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Powered by <span className="text-pi-400 font-semibold">Pi (π)</span> · One Platform. Infinite Opportunities.
        </p>
      </div>
    </div>
  )
}
