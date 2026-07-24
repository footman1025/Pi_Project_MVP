import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  MapPin, Globe2, Star, Code2, ChevronDown, ChevronUp, ExternalLink,
  LayoutGrid, UserCog, LogOut, Bell, UserPlus, UserCheck, Loader2, MessageCircle, Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Profile } from '../lib/supabase'
import { notifyUserOfFollow } from '../lib/notifications'
import { playConnectSound } from '../lib/connectSound'
import UserAvatar from '../components/UserAvatar'

function applySeo(profile: Profile, username: string) {
  const title = `${profile.full_name || username} — ${profile.role || 'Pi Member'} | Pi`
  const description = profile.bio || profile.ai_summary || `${profile.full_name || username} on Pi`
  const url = `${window.location.origin}/p/${username}`
  const tags = [...(profile.skills || []), ...(profile.interests || [])].slice(0, 8)

  document.title = title

  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute(attr, key)
      document.head.appendChild(el)
    }
    el.content = content
  }

  setMeta('name', 'description', description)
  setMeta('name', 'robots', 'index, follow')
  setMeta('property', 'og:title', `${profile.full_name || username} on Pi`)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:type', 'profile')
  setMeta('name', 'twitter:card', 'summary')
  setMeta('name', 'twitter:title', `${profile.full_name || username} on Pi`)

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.full_name || username,
    jobTitle: profile.role || undefined,
    description,
    url,
    sameAs: profile.website ? [profile.website] : [url],
    knowsAbout: tags.length ? tags : undefined,
    address: profile.location
      ? { '@type': 'PostalAddress', addressLocality: profile.location }
      : undefined,
  }

  let script = document.getElementById('pi-profile-jsonld') as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.id = 'pi-profile-jsonld'
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(jsonLd)

  return {
    title,
    description,
    canonical: url,
    jsonLd: JSON.stringify(jsonLd, null, 2),
    metaTags: [
      { name: 'description', content: description },
      { property: 'og:title', content: `${profile.full_name || username} on Pi` },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${profile.full_name || username} on Pi` },
      { name: 'robots', content: 'index, follow' },
    ] as Array<{ name?: string; property?: string; content: string }>,
  }
}

export default function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { session, profile: authProfile, user, signOut } = useAuth()
  const [showSEO, setShowSEO] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [seo, setSeo] = useState<ReturnType<typeof applySeo> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isLoggedIn = !!session
  const isOwn = !!(user && profile && user.id === profile.id)
  const displayName = authProfile?.full_name || user?.email?.split('@')[0] || 'You'

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
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle()

      if (cancelled) return
      if (!data) {
        setNotFound(true)
        setProfile(null)
        setLoading(false)
        document.title = 'Profile not found | Pi'
        return
      }

      setProfile(data)
      setSeo(applySeo(data, data.username || username))
      setLoading(false)

      if (user && user.id !== data.id) {
        const { data: follow } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', user.id)
          .eq('following_id', data.id)
          .maybeSingle()
        if (!cancelled) setFollowing(!!follow)
      }
    }
    if (username) load()
    return () => { cancelled = true }
  }, [username, user])

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    navigate('/')
  }

  const toggleFollow = async () => {
    if (!user || !profile || isOwn) {
      if (!user) navigate('/login')
      return
    }
    setFollowLoading(true)
    const actorName = authProfile?.full_name || user.email?.split('@')[0] || 'Someone'
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id).eq('following_id', profile.id)
      setFollowing(false)
      setProfile(p => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) - 1) } : p)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
      // Client-side notify in case DB triggers are not yet applied
      await notifyUserOfFollow(profile.id, user.id, actorName)
      setFollowing(true)
      setProfile(p => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p)
      void playConnectSound()
    }
    setFollowLoading(false)
  }

  const tags = [
    ...(profile?.skills || []),
    ...(profile?.interests || []),
  ].filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 12)

  const stats = profile ? [
    { label: 'Followers', value: String(profile.followers_count ?? 0) },
    { label: 'Following', value: String(profile.following_count ?? 0) },
    { label: 'Posts', value: String(profile.posts_count ?? 0) },
  ] : []

  return (
    <div className="min-h-screen pi-atmosphere overflow-x-hidden max-w-[100vw]">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl min-w-0">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-display font-extrabold text-lg pi-mark">π</div>
          <span className="font-display text-white font-bold text-xl">Pi</span>
        </div>
        <div className="flex-1 min-w-0" />

        {isLoggedIn ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white pi-mark">
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-all">
                <UserAvatar
                  url={authProfile?.avatar_url}
                  name={displayName}
                  id={user?.id}
                  size={28}
                  rounded="rounded-lg"
                />
                <span className="text-white text-sm font-medium hidden sm:inline max-w-[100px] truncate">{displayName}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden"
                    style={{ background: 'linear-gradient(160deg, #0d1224 0%, #080d1a 100%)' }}
                  >
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-white font-semibold text-sm truncate">{displayName}</p>
                      <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { navigate('/dashboard'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/[0.05]">
                        <LayoutGrid size={15} className="text-pi-400" /> Dashboard
                      </button>
                      <button onClick={() => { navigate('/notifications'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/[0.05]">
                        <Bell size={15} className="text-amber-400" /> Notifications
                      </button>
                      <button onClick={() => { navigate('/profile/edit'); setDropdownOpen(false) }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/[0.05]">
                        <UserCog size={15} className="text-emerald-400" /> Edit Profile
                      </button>
                      <div className="my-1 border-t border-white/[0.06]" />
                      <button onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10">
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="pi-btn-primary !px-4 !py-2 text-sm">
              Join Pi
            </button>
          </div>
        )}
      </nav>

      <div className="px-3 sm:px-6 pt-20 sm:pt-24 pb-12 w-full max-w-3xl mx-auto overflow-x-hidden box-border">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-pi-400 mb-3" />
            <p className="text-slate-400 text-sm">Loading profile…</p>
          </div>
        ) : notFound || !profile ? (
          <div className="text-center py-24 pi-card">
            <h1 className="font-display text-2xl font-extrabold text-white mb-2">Profile not found</h1>
            <p className="text-slate-400 text-sm mb-6">No Pi member with username “{username}”.</p>
            <button onClick={() => navigate('/')} className="pi-btn-primary">Back home</button>
          </div>
        ) : (
          <>
            <div className="!p-3 sm:!p-6 rounded-2xl sm:rounded-3xl border border-white/[0.06] mb-4 sm:mb-6 pi-card overflow-hidden w-full max-w-full min-w-0 box-border">
              <div className="flex items-start gap-3 sm:gap-5 min-w-0">
                <div className="shrink-0">
                  <UserAvatar
                    url={profile.avatar_url}
                    name={profile.full_name || profile.username}
                    id={profile.id}
                    size={72}
                    rounded="rounded-2xl"
                    className="shadow-lg shadow-pi-500/20"
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white mb-1 break-words">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-pi-300 font-semibold mb-2 text-sm sm:text-base truncate">{profile.role || 'Pi Member'}</p>
                  <div className="flex flex-wrap items-center gap-2 text-slate-400 text-sm mb-3">
                    {profile.location && <><MapPin size={14} className="shrink-0" /><span className="break-words">{profile.location}</span></>}
                    {profile.website && (
                      <>
                        {profile.location && <span className="mx-1">·</span>}
                        <Globe2 size={14} className="shrink-0" />
                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                          target="_blank" rel="noreferrer" className="hover:text-pi-300 transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                          {profile.website}
                        </a>
                      </>
                    )}
                    {profile.username && (
                      <span className="text-slate-500 truncate">@{profile.username}</span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed break-words [overflow-wrap:anywhere]">
                    {profile.bio || profile.ai_summary || 'This member has not added a bio yet.'}
                  </p>
                </div>
              </div>

              {profile.ai_summary && profile.bio && (
                <div className="mt-4 p-3 rounded-xl bg-pi-500/10 border border-pi-500/20 flex gap-2">
                  <Sparkles size={16} className="text-pi-300 flex-shrink-0 mt-0.5" />
                  <p className="text-pi-100/90 text-xs leading-relaxed">{profile.ai_summary}</p>
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {tags.map(t => (
                    <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-pi-500/10 border border-pi-500/20 text-pi-300 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/[0.06]">
                {stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="font-display text-xl font-extrabold text-white">{s.value}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className={`grid gap-1.5 sm:gap-2 mt-5 w-full min-w-0 max-w-full ${isOwn ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {isOwn ? (
                  <button onClick={() => navigate('/profile/edit')}
                    className="w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl font-bold text-white text-xs sm:text-sm pi-mark">
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={toggleFollow} disabled={followLoading}
                      className={`w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl font-bold text-[11px] sm:text-sm flex items-center justify-center gap-1 transition-all
                        ${following
                          ? 'border border-pi-500/40 text-pi-300 bg-pi-500/10'
                          : 'text-white pi-mark'}`}>
                      {followLoading ? <Loader2 size={14} className="animate-spin" />
                        : following ? <><UserCheck size={13} className="shrink-0" /> <span className="truncate">Following</span></>
                        : <><UserPlus size={13} className="shrink-0" /> <span className="truncate">Follow</span></>}
                    </button>
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate('/signup')
                          return
                        }
                        void playConnectSound()
                        navigate(`/messages?u=${profile.id}`)
                      }}
                      className="w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border border-white/10 text-slate-300 text-[11px] sm:text-sm font-medium hover:border-white/20 flex items-center justify-center gap-1">
                      <MessageCircle size={13} className="shrink-0" />
                      <span className="truncate">Message</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href)
                  }}
                  className="w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border border-white/10 text-slate-300 text-[11px] sm:text-sm font-medium hover:border-white/20 flex items-center justify-center gap-1">
                  <ExternalLink size={13} className="shrink-0" />
                  <span className="truncate">Share</span>
                </button>
              </div>
            </div>

            {seo && (
              <div className="rounded-2xl border border-pi-500/20 overflow-hidden bg-pi-500/[0.05] w-full max-w-full min-w-0">
                <button onClick={() => setShowSEO(o => !o)}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-pi-500/5 transition-all min-w-0">
                  <div className="w-8 h-8 rounded-xl pi-mark flex items-center justify-center shrink-0">
                    <Code2 size={15} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-white font-semibold text-sm">SEO Structure</p>
                    <p className="text-slate-400 text-xs truncate">Live meta tags & JSON-LD</p>
                  </div>
                  <span className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap text-[11px] text-pi-300 bg-pi-500/10 border border-pi-500/20 px-2 py-1 rounded-full font-semibold leading-none">
                    Live ✓
                  </span>
                  {showSEO
                    ? <ChevronUp size={18} className="text-slate-400 shrink-0" />
                    : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                </button>

                {showSEO && (
                  <div className="px-3 sm:px-5 pb-4 sm:pb-5 animate-fade-in space-y-4 min-w-0 max-w-full overflow-hidden">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Page Title</p>
                      <p className="text-sm text-emerald-400 font-mono break-words [overflow-wrap:anywhere]">{seo.title}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Canonical URL</p>
                      <p className="text-sm text-blue-400 font-mono break-all">{seo.canonical}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Meta Tags</p>
                      <div className="bg-black/30 rounded-xl p-2.5 sm:p-3 font-mono text-[10px] sm:text-xs space-y-1.5 overflow-x-auto max-w-full">
                        {seo.metaTags.map((m, i) => (
                          <div key={i} className="text-slate-300 break-all [overflow-wrap:anywhere] leading-relaxed">
                            <span className="text-pink-400">{'<meta '}</span>
                            {'name' in m && m.name ? (
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
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Structured Data (JSON-LD)</p>
                      <pre className="bg-black/30 rounded-xl p-2.5 sm:p-3 font-mono text-[10px] sm:text-xs text-slate-300 overflow-x-auto max-w-full whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                        {seo.jsonLd}
                      </pre>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 min-w-0">
                      <Star size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-emerald-300 text-xs font-medium break-words">
                        Title, description, canonical, Open Graph, and JSON-LD Person schema are applied to this page’s document head.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-slate-600 text-xs mt-8">
              Powered by <span className="text-pi-400 font-semibold">Pi (π)</span> · One Platform. Infinite Opportunities.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
