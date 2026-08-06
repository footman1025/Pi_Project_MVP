import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Briefcase, Clock4, ExternalLink, Loader2, MapPin, MessageCircle, Share2, Send, Star,
} from 'lucide-react'
import MockIcon from '../components/MockIcon'
import StatusBadge from '../components/StatusBadge'
import PiLogo from '../components/PiLogo'
import { useAuth } from '../contexts/AuthContext'
import {
  absoluteOpportunityUrl,
  fetchOpportunityBySlugOrId,
  opportunityPublicPath,
  type OpportunityItem,
} from '../lib/opportunities'
import { opportunityMessagePath } from '../lib/opportunityHub'
import { upsertOpportunityInterest } from '../lib/opportunityInterest'
import { isFeaturedActive } from '../lib/opportunityFeatured'
import FeatureOpportunityModal from '../components/FeatureOpportunityModal'
import { applyOpportunitySeo } from '../lib/seo'
import { track } from '../lib/analytics'
import { playConnectSound } from '../lib/connectSound'

export default function OpportunityPublicPage() {
  const { slugOrId = '' } = useParams<{ slugOrId: string }>()
  const navigate = useNavigate()
  const { session, user, profile } = useAuth()
  const [item, setItem] = useState<OpportunityItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [featureOpen, setFeatureOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setMsg('')
      const key = decodeURIComponent(slugOrId)
      const res = await fetchOpportunityBySlugOrId(key)
      if (cancelled) return
      if (!res.item) {
        setNotFound(true)
        setItem(null)
      } else {
        // Canonical clean URL — drop legacy random suffix (e.g. -167ud)
        const canonical = opportunityPublicPath(res.item)
        const current = `/o/${encodeURIComponent(key)}`
        if (res.item.slug && canonical !== current && canonical !== `/o/${key}`) {
          navigate(canonical, { replace: true })
          return
        }
        setItem(res.item)
        setNotFound(false)
        setIsLive(res.isLive)
        applyOpportunitySeo(res.item)
        track('opportunity_public_view', { id: res.item.id, live: res.isLive, slug: res.item.slug || null })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [slugOrId, navigate])

  const share = async () => {
    if (!item) return
    const url = absoluteOpportunityUrl(item)
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.subtitle, url })
        track('opportunity_share', { id: item.id })
        return
      }
    } catch {
      /* fall through */
    }
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    track('opportunity_share', { id: item.id, method: 'clipboard' })
    setTimeout(() => setCopied(false), 2000)
  }

  const goApply = async () => {
    if (!item) return
    if (!session || !user) {
      navigate('/signup')
      return
    }
    setBusy(true)
    setMsg('')
    const res = await upsertOpportunityInterest({
      userId: user.id,
      opportunityId: item.id,
      title: item.title,
      status: 'applied',
      ownerId: item.ownerId,
      slug: item.slug,
      actorName: profile?.full_name || user.email?.split('@')[0] || 'Someone',
    })
    setBusy(false)
    if (!res.ok) {
      setMsg(res.error)
      return
    }
    setMsg(res.source === 'supabase' ? 'Apply intent saved — message the poster to connect.' : 'Saved on this device.')
    void import('../lib/engagement').then(m => m.recordEngagementAction('opportunity_interest'))
  }

  const goMessage = () => {
    if (!item?.ownerId) return
    if (!session) {
      navigate('/signup')
      return
    }
    if (user?.id === item.ownerId) return
    void playConnectSound()
    navigate(
      opportunityMessagePath({
        ownerId: item.ownerId,
        title: item.title,
        opportunityId: item.id,
        status: 'interested',
      }),
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav
        className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <button type="button" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 min-w-0">
          <PiLogo size={28} className="ring-1 ring-white/10" />
          <span className="text-white font-bold text-sm truncate">Opportunity Hub</span>
        </button>
        <div className="flex-1" />
        <StatusBadge kind={isLive ? 'live' : 'demo'} label={isLive ? 'Live listing' : 'Demo listing'} />
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <Loader2 size={18} className="animate-spin text-amber-400" /> Loading…
          </div>
        ) : notFound || !item ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-extrabold text-white mb-2">Opportunity not found</h1>
            <p className="text-slate-500 text-sm mb-6">This listing may be inactive or the link is wrong.</p>
            <Link to="/signup" className="text-teal-300 font-semibold text-sm hover:underline">
              Join Pi →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.iconColor} flex items-center justify-center shrink-0`}>
                <MockIcon name={item.iconName} size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <StatusBadge kind="live" label={item.category} />
                  {item.source === 'member' && <StatusBadge kind="live" label="Member posted" />}
                  {isFeaturedActive(item) && (
                    <StatusBadge kind="live" label="Featured" />
                  )}
                  {!isFeaturedActive(item) && item.ownerId && user?.id === item.ownerId && (
                    <StatusBadge kind="partial" label="Feature available" />
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight break-words">
                  {item.title}
                </h1>
                {item.subtitle && (
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">{item.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-6">
              {item.prize && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03]">
                  <Briefcase size={12} className="text-amber-300" /> {item.prize}
                </span>
              )}
              {item.deadline && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03]">
                  <Clock4 size={12} /> {item.deadline}
                </span>
              )}
              {item.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03]">
                  <MapPin size={12} /> {item.location}
                </span>
              )}
            </div>

            {(item.description || item.aiReason) && (
              <section
                className="rounded-2xl border border-white/[0.07] p-5 mb-6"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-2">About</p>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.description || item.aiReason}
                </p>
              </section>
            )}

            {msg && (
              <p className="mb-4 text-sm text-teal-300 border border-teal-500/25 bg-teal-500/10 rounded-xl px-3 py-2">
                {msg}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mb-8">
              <button
                type="button"
                disabled={busy}
                onClick={() => void goApply()}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {session ? 'Apply interest' : 'Sign up to apply'}
              </button>
              {item.ownerId && user?.id === item.ownerId && !isFeaturedActive(item) && (
                <button
                  type="button"
                  onClick={() => setFeatureOpen(true)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-amber-950 inline-flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  <Star size={15} fill="currentColor" /> Feature listing
                </button>
              )}
              {item.ownerId && user?.id !== item.ownerId && (
                <button
                  type="button"
                  onClick={goMessage}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-200 border border-white/15 hover:bg-white/5 inline-flex items-center justify-center gap-1.5"
                >
                  <MessageCircle size={15} /> Message poster
                </button>
              )}
              <button
                type="button"
                onClick={() => void share()}
                className="sm:w-auto px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:bg-white/5 inline-flex items-center justify-center gap-1.5"
              >
                {copied ? <ExternalLink size={14} /> : <Share2 size={14} />}
                {copied ? 'Copied' : 'Share'}
              </button>
            </div>

            {session && (
              <button
                type="button"
                onClick={() => navigate('/opportunities', { state: { focusId: item.id } })}
                className="text-teal-300 text-xs font-semibold hover:underline mb-6 block"
              >
                Open in Opportunity Hub →
              </button>
            )}

            <p className="text-slate-600 text-xs leading-relaxed">
              Pi Opportunity Hub — discover and create opportunities. Interest / apply is free.
              Featured priority placement is optional (€9 / 7 days when Stripe is configured).
              Built with the No Surprise Standard.
            </p>
          </>
        )}
      </main>

      {featureOpen && item && (
        <FeatureOpportunityModal
          open
          item={item}
          onClose={() => setFeatureOpen(false)}
          onIntentRecorded={message => setMsg(message)}
        />
      )}
    </div>
  )
}
