import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  MapPin, Globe2, Star, Code2, ChevronDown, ChevronUp, ExternalLink,
  UserPlus, UserCheck, Loader2, MessageCircle, Sparkles, ArrowLeft, Flag, HeartHandshake,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Profile } from '../lib/supabase'
import { notifyUserOfFollow } from '../lib/notifications'
import { playConnectSound } from '../lib/connectSound'
import {
  ensureFollowerProfile,
  followUser,
  unfollowUser,
  getFollowCounts,
  isFollowing,
} from '../lib/follows'
import { submitContentReport, type ReportReason } from '../lib/contentReports'
import UserAvatar from '../components/UserAvatar'
import CreatorTipModal from '../components/CreatorTipModal'
import ReportContentModal from '../components/ReportContentModal'
import PiLogo from '../components/PiLogo'
import { externalHref, absoluteProfileUrl } from '../lib/urls'

function applySeo(profile: Profile, username: string) {
  const title = `${profile.full_name || username} — ${profile.role || 'Pi Member'} | Pi`
  const description = profile.bio || profile.ai_summary || `${profile.full_name || username} on Pi`
  const safeUser = encodeURIComponent(username.trim())
  const url = `${window.location.origin}/p/${safeUser}`
  const websiteAbs = externalHref(profile.website)
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
    sameAs: websiteAbs ? [websiteAbs, url] : [url],
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
  const { username: rawUsername = '' } = useParams<{ username: string }>()
  const username = (() => {
    try {
      return decodeURIComponent(rawUsername).trim().replace(/^@/, '')
    } catch {
      return rawUsername.trim().replace(/^@/, '')
    }
  })()
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile: authProfile, user } = useAuth()
  const [showSEO, setShowSEO] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followError, setFollowError] = useState('')
  const [seo, setSeo] = useState<ReturnType<typeof applySeo> | null>(null)
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)
  const [reportError, setReportError] = useState('')
  const [tipOpen, setTipOpen] = useState(false)

  const isLoggedIn = !!session
  const isOwn = !!(user && profile && user.id === profile.id)
  const siteHref = externalHref(profile?.website)

  const submitProfileReport = async () => {
    if (!user || !profile) return
    setReporting(true)
    setReportError('')
    const res = await submitContentReport({
      reporterId: user.id,
      targetType: 'profile',
      targetId: profile.id,
      reason: reportReason,
      details: reportDetails,
    })
    setReporting(false)
    if (!res.ok) {
      setReportError(res.error)
      return
    }
    setReportDone(true)
    setTimeout(() => {
      setReportOpen(false)
      setReportDone(false)
      setReportDetails('')
    }, 1400)
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setFollowError('')
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

      // Counts from follows table so refresh always matches reality
      let counts = { followers_count: data.followers_count ?? 0, following_count: data.following_count ?? 0 }
      try {
        counts = await getFollowCounts(data.id)
      } catch {
        /* keep cached profile counts */
      }

      if (cancelled) return
      setProfile({ ...data, ...counts })
      setSeo(applySeo(data, data.username || username))
      setLoading(false)

      if (user && user.id !== data.id) {
        try {
          const yes = await isFollowing(user.id, data.id)
          if (!cancelled) setFollowing(yes)
        } catch {
          if (!cancelled) setFollowing(false)
        }
      } else if (!cancelled) {
        setFollowing(false)
      }
    }
    if (username) load()
    return () => { cancelled = true }
  }, [username, user])

  const goBack = () => {
    const from = (location.state as { from?: string } | null)?.from
    if (from) {
      navigate(from)
      return
    }
    // Prefer real browser history (e.g. Matching → profile); else Matching / home
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(isLoggedIn ? '/match' : '/')
    }
  }

  // Logged-in: AppShell sidebar — no public top nav; show Back above the card
  const inApp = isLoggedIn
  const backLabel =
    (location.state as { from?: string } | null)?.from === '/match'
      ? 'Back to Matching'
      : 'Back'

  const toggleFollow = async () => {
    if (!user || !profile || isOwn) {
      if (!user) navigate('/login')
      return
    }
    setFollowLoading(true)
    setFollowError('')
    const actorName = authProfile?.full_name || user.email?.split('@')[0] || 'Someone'
    const wasFollowing = following

    // Optimistic UI
    setFollowing(!wasFollowing)
    setProfile(p =>
      p
        ? {
            ...p,
            followers_count: Math.max(0, (p.followers_count || 0) + (wasFollowing ? -1 : 1)),
          }
        : p,
    )

    try {
      await ensureFollowerProfile(user.id, actorName)
      if (wasFollowing) {
        await unfollowUser(user.id, profile.id)
      } else {
        await followUser(user.id, profile.id)
        await notifyUserOfFollow(profile.id, user.id, actorName)
        void playConnectSound()
      }
      // Re-sync counts from DB
      const counts = await getFollowCounts(profile.id)
      setProfile(p => (p ? { ...p, ...counts } : p))
      setFollowing(await isFollowing(user.id, profile.id))
    } catch (e: unknown) {
      // Revert optimistic UI
      setFollowing(wasFollowing)
      setProfile(p =>
        p
          ? {
              ...p,
              followers_count: Math.max(0, (p.followers_count || 0) + (wasFollowing ? 1 : -1)),
            }
          : p,
      )
      setFollowError(e instanceof Error ? e.message : 'Follow failed')
    } finally {
      setFollowLoading(false)
    }
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
    <div className={`${inApp ? 'min-h-0' : 'min-h-screen'} pi-atmosphere overflow-x-hidden max-w-[100vw]`}>
      {!inApp && (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl min-w-0">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft size={16} className="shrink-0" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2 cursor-pointer shrink-0 min-w-0" onClick={() => navigate('/')}>
          <PiLogo size={32} className="ring-1 ring-white/10" />
          <span className="font-display text-white font-bold text-xl hidden sm:inline">Pi</span>
        </div>
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20">
            Sign In
          </button>
          <button onClick={() => navigate('/signup')} className="pi-btn-primary !px-4 !py-2 text-sm">
            Join Pi
          </button>
        </div>
      </nav>
      )}

      <div className={`px-3 sm:px-6 ${inApp ? 'pt-2 sm:pt-4' : 'pt-20 sm:pt-24'} pb-12 w-full max-w-3xl mx-auto overflow-x-hidden box-border`}>
        {inApp && (
          <button
            type="button"
            onClick={goBack}
            className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white border border-pi-500/35 bg-pi-500/15 hover:bg-pi-500/25 transition-all"
            aria-label="Go back to previous screen"
          >
            <ArrowLeft size={16} className="shrink-0" />
            {backLabel}
          </button>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-pi-400 mb-3" />
            <p className="text-slate-400 text-sm">Loading profile…</p>
          </div>
        ) : notFound || !profile ? (
          <div className="text-center py-24 pi-card">
            <h1 className="font-display text-2xl font-extrabold text-white mb-2">Profile not found</h1>
            <p className="text-slate-400 text-sm mb-6">No Pi member with username “{username}”.</p>
            <button onClick={() => navigate(inApp ? '/match' : '/')} className="pi-btn-primary">
              {inApp ? 'Back to Matching' : 'Back home'}
            </button>
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
                    {siteHref && (
                      <>
                        {profile.location && <span className="mx-1">·</span>}
                        <Globe2 size={14} className="shrink-0" />
                        <a href={siteHref}
                          target="_blank" rel="noopener noreferrer" className="hover:text-pi-300 transition-colors truncate max-w-[140px] sm:max-w-[180px]">
                          {profile.website?.replace(/^https?:\/\//i, '')}
                        </a>
                      </>
                    )}
                    {profile.username && (
                      <button
                        type="button"
                        onClick={() => {
                          const link = absoluteProfileUrl(profile.username)
                          if (!link) return
                          void navigator.clipboard?.writeText(link).then(() => {
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          })
                        }}
                        className="text-slate-500 truncate hover:text-teal-300 text-left"
                        title="Copy profile link for LinkedIn"
                      >
                        @{profile.username}{copied ? ' · copied' : ''}
                      </button>
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

              {followError && (
                <p className="mt-3 text-xs text-red-400 text-center px-2">{followError}</p>
              )}

              <div className={`grid gap-1.5 sm:gap-2 mt-5 w-full min-w-0 max-w-full ${isOwn ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
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
                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate('/signup')
                          return
                        }
                        setTipOpen(true)
                      }}
                      className="w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border border-pink-500/30 text-pink-200 bg-pink-500/10 text-[11px] sm:text-sm font-medium hover:bg-pink-500/20 flex items-center justify-center gap-1"
                    >
                      <HeartHandshake size={13} className="shrink-0" />
                      <span className="truncate">Tip</span>
                    </button>
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => { setReportOpen(true); setReportError(''); setReportDone(false) }}
                        className="w-full min-w-0 py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border border-white/10 text-slate-300 text-[11px] sm:text-sm font-medium hover:border-amber-500/30 hover:text-amber-200 flex items-center justify-center gap-1"
                      >
                        <Flag size={13} className="shrink-0" />
                        <span className="truncate">Report</span>
                      </button>
                    )}
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

            {tipOpen && user && profile && !isOwn && (
              <CreatorTipModal
                open
                fromUserId={user.id}
                toUserId={profile.id}
                toName={profile.full_name || profile.username || 'Member'}
                onClose={() => setTipOpen(false)}
              />
            )}

            <ReportContentModal
              open={reportOpen}
              title="Report profile"
              reason={reportReason}
              details={reportDetails}
              busy={reporting}
              done={reportDone}
              error={reportError}
              onReasonChange={setReportReason}
              onDetailsChange={setReportDetails}
              onClose={() => setReportOpen(false)}
              onSubmit={() => void submitProfileReport()}
            />

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
