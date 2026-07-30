import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, UsersRound, Briefcase, Bot, Bell, TrendingUp, ArrowRight, Loader2, Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Profile } from '../lib/supabase'
import { MatchResult, rankMatches, scoreOpportunityForUser } from '../lib/matching'
import { fetchOpportunities, OpportunityItem } from '../lib/opportunities'
import MockIcon from '../components/MockIcon'
import CommunityIcon from '../components/CommunityIcon'
import UserAvatar from '../components/UserAvatar'
import StatusBadge from '../components/StatusBadge'
import CoreLoopGuide from '../components/CoreLoopGuide'
import ForYouRecommendations from '../components/ForYouRecommendations'
import GrowthNudgeBanner from '../components/GrowthNudgeBanner'
import { buildDigitalTwin } from '../lib/digitalTwin'
import DigitalTwinCard from '../components/DigitalTwinCard'
import { hasGroqKey } from '../lib/groqAssistant'

type LiveCommunity = {
  id: string
  name: string
  members_count: number | null
  category: string | null
  icon: string | null
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  to,
  live,
  loading,
  onClick,
}: {
  icon: typeof Sparkles
  label: string
  value: string
  accent: string
  to: string | null
  live: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!to}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] p-3.5 sm:p-4 text-left transition-all hover:-translate-y-0.5 min-w-0 ${
        to ? 'cursor-pointer hover:border-white/15' : 'cursor-default'
      }`}
      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-6 w-20 h-20 rounded-full opacity-25 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon size={15} />
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
            live
              ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10'
              : 'text-amber-300 border-amber-500/25 bg-amber-500/10'
          }`}
        >
          {live ? 'Live' : 'Demo'}
        </span>
      </div>
      <p className="relative text-white font-bold text-sm truncate tabular-nums">
        {loading ? '…' : value}
      </p>
      <p className="relative text-slate-500 text-[11px] mt-0.5 leading-snug">{label}</p>
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'
  const twin = buildDigitalTwin(profile)
  const groqOn = hasGroqKey()

  const [loading, setLoading] = useState(true)
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([])
  const [usingLiveMatches, setUsingLiveMatches] = useState(false)
  const [communities, setCommunities] = useState<LiveCommunity[]>([])
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [memberCount, setMemberCount] = useState(0)
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([])
  const [oppsLive, setOppsLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [profilesRes, communitiesRes, notifRes, membersRes, oppsRes] = await Promise.all([
          profile && user
            ? supabase.from('profiles').select('*').neq('id', user.id).limit(40)
            : Promise.resolve({ data: null as Profile[] | null }),
          supabase
            .from('communities')
            .select('id, name, members_count, category, icon')
            .order('members_count', { ascending: false })
            .limit(5),
          user
            ? supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false)
            : Promise.resolve({ count: 0 }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          fetchOpportunities(),
        ])

        if (cancelled) return

        if (profile && profilesRes.data && profilesRes.data.length > 0) {
          setLiveMatches(rankMatches(profile, profilesRes.data as Profile[]).slice(0, 5))
          setUsingLiveMatches(true)
        } else {
          setLiveMatches([])
          setUsingLiveMatches(false)
        }

        setCommunities((communitiesRes.data as LiveCommunity[]) || [])
        setUnreadNotifs(notifRes.count || 0)
        setMemberCount(membersRes.count || 0)
        setOpportunities(oppsRes.items)
        setOppsLive(oppsRes.isLive)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [profile, user])

  const topOpps = opportunities
    .map(o => ({ ...o, personalizedMatch: scoreOpportunityForUser(profile, o) }))
    .sort((a, b) => b.personalizedMatch - a.personalizedMatch)
    .slice(0, 3)

  const dashCards = [
    {
      icon: Sparkles,
      label: usingLiveMatches ? 'Match graph' : 'Match graph',
      value: usingLiveMatches ? `${liveMatches.length} ranked` : 'Awaiting',
      accent: '#14b8a6',
      to: '/match',
      live: usingLiveMatches,
    },
    {
      icon: Zap,
      label: 'Top match',
      value: usingLiveMatches && liveMatches[0] ? `${liveMatches[0].match}%` : '—',
      accent: '#2dd4bf',
      to: '/match',
      live: usingLiveMatches,
    },
    {
      icon: UsersRound,
      label: 'Communities',
      value: communities.length ? `${communities.length} active` : `${memberCount || 0} members`,
      accent: '#34d399',
      to: '/communities',
      live: true,
    },
    {
      icon: Briefcase,
      label: 'Opportunities',
      value: `${opportunities.length} listed`,
      accent: '#fbbf24',
      to: '/opportunities',
      live: oppsLive,
    },
    {
      icon: Bot,
      label: 'AI Assistant',
      value: groqOn ? 'Groq live' : 'Guided',
      accent: '#22d3ee',
      to: null,
      live: groqOn,
    },
    {
      icon: Bell,
      label: 'Unread alerts',
      value: String(unreadNotifs),
      accent: '#67e8f9',
      to: '/notifications',
      live: true,
    },
  ]

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-6xl mx-auto w-full min-w-0">
        {/* Header */}
        <header className="mb-6 sm:mb-7 flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatar
              url={profile?.avatar_url}
              name={displayName}
              id={user?.id}
              size={48}
              rounded="rounded-2xl"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Dashboard
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
                {greeting()}, {displayName}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5 truncate">
                Twin + live graph ·{' '}
                <button type="button" onClick={() => navigate('/demo')} className="text-teal-400 hover:text-teal-300 font-medium">
                  Investor Demo
                </button>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <StatusBadge kind="live" label="Core loops live" />
            <StatusBadge kind={oppsLive ? 'live' : 'demo'} label={oppsLive ? 'Opps live' : 'Opps demo'} />
            <button
              type="button"
              onClick={() => navigate('/traction')}
              className="text-[11px] font-bold text-teal-200 border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 rounded-full hover:bg-teal-500/15"
            >
              Traction →
            </button>
          </div>
        </header>

        <GrowthNudgeBanner unreadCount={unreadNotifs} />
        <CoreLoopGuide />
        <ForYouRecommendations />

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => navigate('/grow')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-100 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
          >
            Grow Pi <ArrowRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/match')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
          >
            Matching
          </button>
          <button
            type="button"
            onClick={() => navigate('/opportunities')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
          >
            Opportunities
          </button>
          <button
            type="button"
            onClick={() => navigate('/twin')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 border border-white/10 hover:border-white/20"
          >
            Digital Twin
          </button>
        </div>

        {twin && (
          <div className="mb-6 min-w-0">
            <DigitalTwinCard twin={twin} name={displayName} compact />
            <button
              type="button"
              onClick={() => navigate('/twin')}
              className="mt-2.5 text-xs text-teal-300 font-semibold hover:text-teal-200 inline-flex items-center gap-1"
            >
              Open full Digital Twin <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-7">
          {dashCards.map((c, i) => (
            <StatTile
              key={c.label}
              icon={c.icon}
              label={c.label}
              value={c.value}
              accent={c.accent}
              to={c.to}
              live={c.live}
              loading={loading && i < 3}
              onClick={() => c.to && navigate(c.to)}
            />
          ))}
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-5 gap-5 min-w-0">
          {/* Matches */}
          <section
            className="lg:col-span-3 rounded-2xl border border-white/[0.07] p-4 sm:p-5 min-w-0"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.96))' }}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-white font-bold text-sm sm:text-base">Best matches</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {usingLiveMatches ? 'Ranked from live profiles' : 'Invite members to fill the graph'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/match')}
                className="text-teal-400 text-xs font-semibold hover:text-teal-300 inline-flex items-center gap-1 shrink-0"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-14 text-slate-400 text-sm gap-2">
                <Loader2 size={16} className="animate-spin text-teal-400" /> Loading…
              </div>
            ) : usingLiveMatches && liveMatches.length > 0 ? (
              <ul className="space-y-2">
                {liveMatches.slice(0, 3).map(m => {
                  const p = m.profile
                  const name = p.full_name || p.username || 'Member'
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() =>
                          p.username
                            ? navigate(`/p/${p.username}`, { state: { from: '/dashboard' } })
                            : navigate('/match')
                        }
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-black/20 hover:border-teal-500/30 transition-colors text-left min-w-0"
                      >
                        <UserAvatar
                          url={p.avatar_url}
                          name={name}
                          id={p.id}
                          size={40}
                          rounded="rounded-xl"
                          username={p.username}
                          from="/dashboard"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {m.reasons[0] || p.role || p.bio || 'Active on Pi'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black tabular-nums text-teal-300">{m.match}%</p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-600">match</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
                <p className="text-amber-200 text-sm font-semibold mb-1">Live graph waiting</p>
                <p className="text-slate-400 text-xs leading-relaxed mb-3">
                  Matching uses real profiles. Invite teammates or open Matching until the graph fills.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/grow')}
                  className="text-teal-300 text-xs font-semibold hover:underline"
                >
                  Share invite →
                </button>
              </div>
            )}
          </section>

          {/* Side column */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <section
              className="rounded-2xl border border-white/[0.07] p-4 sm:p-5"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.96))' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-white font-bold text-sm">Hot opportunities</h2>
                  <div className="mt-1">
                    <StatusBadge kind={oppsLive ? 'live' : 'demo'} label={oppsLive ? 'Live' : 'Demo'} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/opportunities')}
                  className="text-teal-400 text-xs font-semibold hover:text-teal-300 inline-flex items-center gap-1"
                >
                  All <ArrowRight size={12} />
                </button>
              </div>
              <ul className="space-y-2">
                {topOpps.map(o => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => navigate('/opportunities')}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-black/20 hover:border-amber-500/25 text-left transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${o.iconColor} flex items-center justify-center shrink-0`}>
                        <MockIcon name={o.iconName} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{o.title}</p>
                        <p className="text-slate-500 text-[10px] truncate">{o.prize}</p>
                      </div>
                      <span className="text-[11px] font-bold text-amber-300 tabular-nums shrink-0">
                        {o.personalizedMatch}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="rounded-2xl border border-white/[0.07] p-4 sm:p-5"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.92), rgba(10,14,22,0.96))' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-white font-bold text-sm">Communities</h2>
                <button
                  type="button"
                  onClick={() => navigate('/communities')}
                  className="text-teal-400 text-xs font-semibold hover:text-teal-300 inline-flex items-center gap-1"
                >
                  All <ArrowRight size={12} />
                </button>
              </div>
              {communities.length === 0 && !loading ? (
                <p className="text-xs text-slate-500">No communities yet — create one from Communities.</p>
              ) : (
                <ul className="space-y-1.5">
                  {communities.slice(0, 3).map(c => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/communities')}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] text-left transition-colors"
                      >
                        <CommunityIcon name={c.name} category={c.category} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{c.name}</p>
                          <p className="text-slate-500 text-[10px]">
                            {c.members_count ?? 0} members{c.category ? ` · ${c.category}` : ''}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>

        {/* Vision strip */}
        <button
          type="button"
          onClick={() => navigate('/vision')}
          className="mt-6 w-full text-left rounded-2xl border border-teal-500/20 p-4 sm:p-5 relative overflow-hidden group"
          style={{ background: 'linear-gradient(105deg, rgba(20,184,166,0.14), rgba(20,184,166,0.03))' }}
        >
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">Pi ecosystem</p>
              <h3 className="text-white font-bold text-sm sm:text-base mb-0.5">See how everything connects</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Vision roadmap and{' '}
                <span
                  className="text-teal-300 font-semibold"
                  onClick={e => {
                    e.stopPropagation()
                    navigate('/transparency')
                  }}
                >
                  Engineering Transparency
                </span>
                {' '}— what’s live vs demo.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-2 rounded-xl shrink-0 self-start sm:self-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              Explore <ArrowRight size={13} />
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
