import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, UsersRound, Briefcase, Bot, Bell, TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
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
      label: usingLiveMatches ? 'Live match graph' : 'Match graph',
      value: usingLiveMatches ? `${liveMatches.length} ranked` : 'Awaiting graph',
      color: 'from-pi-500 to-teal-600',
      to: '/match',
      demo: !usingLiveMatches,
    },
    {
      icon: UsersRound,
      label: 'Suggested people',
      value: usingLiveMatches && liveMatches[0] ? `${liveMatches[0].match}% top` : '—',
      color: 'from-pink-500 to-rose-600',
      to: '/match',
      demo: !usingLiveMatches,
    },
    {
      icon: UsersRound,
      label: 'Communities',
      value: communities.length ? `${communities.length} active` : `${memberCount || 0} members`,
      color: 'from-emerald-500 to-teal-600',
      to: '/communities',
      demo: false,
    },
    {
      icon: Briefcase,
      label: 'Opportunities',
      value: `${opportunities.length} in catalog`,
      color: 'from-amber-500 to-orange-600',
      to: '/opportunities',
      demo: !oppsLive,
    },
    {
      icon: Bot,
      label: 'AI Assistant',
      value: groqOn ? 'Groq live' : 'Guided',
      color: 'from-teal-500 to-pi-600',
      to: null,
      demo: !groqOn,
    },
    {
      icon: Bell,
      label: 'Unread alerts',
      value: String(unreadNotifs),
      color: 'from-cyan-500 to-blue-600',
      to: '/notifications',
      demo: false,
    },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto overflow-x-hidden w-full min-w-0">
      <div className="mb-6 sm:mb-8 min-w-0">
        <div className="flex items-start gap-3 mb-2 min-w-0">
          <UserAvatar
            url={profile?.avatar_url}
            name={displayName}
            id={user?.id}
            size={44}
            rounded="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white break-words">
              Good morning, {displayName}
            </h1>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Live twin + match graph from real Pi members.{' '}
              <button onClick={() => navigate('/demo')} className="text-teal-300 font-semibold hover:underline">
                Open Investor Demo
              </button>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <StatusBadge kind="live" label="Live: profiles · match · messages · feed · communities" size="md" />
          <StatusBadge
            kind={oppsLive ? 'live' : 'demo'}
            label={oppsLive ? 'Live opportunities catalog' : 'Demo opportunities fallback'}
            size="md"
          />
          <StatusBadge kind="partial" label="Creators / Professionals = live members + Soon tools" size="md" />
          <button
            type="button"
            onClick={() => navigate('/traction')}
            className="text-[11px] font-bold text-teal-300 border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 rounded-full hover:bg-teal-500/15"
          >
            Traction metrics →
          </button>
        </div>
      </div>

      <GrowthNudgeBanner unreadCount={unreadNotifs} />
      <CoreLoopGuide />
      <ForYouRecommendations />

      <button
        type="button"
        onClick={() => navigate('/grow')}
        className="mb-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-200 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/15"
      >
        Grow Pi · invites, partners, discussions →
      </button>

      {twin && (
        <div className="mb-6 sm:mb-8 min-w-0">
          <DigitalTwinCard twin={twin} name={displayName} compact />
          <button
            onClick={() => navigate('/twin')}
            className="mt-3 text-sm text-teal-300 font-semibold hover:text-teal-200 inline-flex items-center gap-1"
          >
            Open full Digital Twin <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        {dashCards.map(({ icon: Icon, label, value, color, to, demo }, i) => (
          <button key={i}
            onClick={() => to && navigate(to)}
            className={`p-3 sm:p-4 rounded-2xl border border-white/5 text-left transition-all duration-300 hover:border-pi-500/20 group relative min-w-0 ${to ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            <StatusBadge
              kind={demo ? 'demo' : 'live'}
              className="absolute top-2 right-2"
            />
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2 sm:mb-3`}>
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-white font-bold text-sm truncate">{loading && i < 3 ? '…' : value}</p>
            <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 min-w-0">
        <div className="lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">Your Best Matches Today</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {usingLiveMatches ? 'Ranked from live Pi profiles' : 'Invite members to activate the live graph'}
              </p>
            </div>
            <button onClick={() => navigate('/match')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1 shrink-0">
              View all <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <Loader2 size={18} className="animate-spin text-pi-400" /> Loading live matches…
            </div>
          ) : usingLiveMatches && liveMatches.length > 0 ? (
            <div className="space-y-3">
              {liveMatches.slice(0, 3).map(m => {
                const p = m.profile
                const name = p.full_name || p.username || 'Member'
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => p.username ? navigate(`/p/${p.username}`, { state: { from: '/dashboard' } }) : navigate('/match')}
                    className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all group min-w-0 text-left"
                    style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.4), rgba(14,20,25,0.6))' }}
                  >
                    <UserAvatar url={p.avatar_url} name={name} id={p.id} size={44} rounded="rounded-2xl" username={p.username} from="/dashboard" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 mb-0.5 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{name}</p>
                        {p.role && (
                          <>
                            <span className="text-xs text-slate-500 hidden sm:inline">·</span>
                            <p className="text-xs text-slate-400 truncate hidden sm:block">{p.role}</p>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {m.reasons[0] || p.bio || 'Active on Pi'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-base sm:text-lg font-extrabold" style={{ background: 'linear-gradient(135deg, #5eead4, #ff9b6a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {m.match}%
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500">match</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-sm text-slate-300">
              <p className="font-semibold text-amber-200 mb-1">Live graph waiting for members</p>
              <p className="text-slate-400 text-xs leading-relaxed mb-3">
                Matching uses real profiles. Invite teammates or open Matching to see demo samples until the graph fills.
              </p>
              <button onClick={() => navigate('/match')} className="text-teal-300 font-semibold text-xs hover:underline">
                Open Matching →
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Hot Opportunities</h2>
                <p className="text-[11px] font-semibold flex items-center gap-1.5 mt-0.5">
                  <StatusBadge kind={oppsLive ? 'live' : 'demo'} label={oppsLive ? 'Live catalog' : 'Demo catalog'} />
                  <span className="text-slate-500">scored for you</span>
                </p>
              </div>
              <button onClick={() => navigate('/opportunities')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1 shrink-0">
                All <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {topOpps.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate('/opportunities')}
                  className={`w-full p-3 rounded-2xl border bg-gradient-to-br ${o.color} ${o.border} hover:scale-[1.01] transition-all min-w-0 text-left`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${o.iconColor} flex items-center justify-center flex-shrink-0`}>
                      <MockIcon name={o.iconName} size={15} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-white text-sm font-semibold truncate">{o.title}</p>
                      <p className="text-slate-400 text-xs truncate">{o.prize}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 shrink-0">{o.personalizedMatch}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Communities</h2>
                <p className="text-[11px] text-emerald-400/90 font-semibold">Live from Pi</p>
              </div>
              <button onClick={() => navigate('/communities')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1 shrink-0">
                All <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {communities.length === 0 && !loading && (
                <p className="text-xs text-slate-500 px-1">No communities yet — create one from Communities.</p>
              )}
              {communities.slice(0, 3).map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-pi-500/20 transition-all min-w-0 text-left"
                  onClick={() => navigate('/communities')}
                >
                  <CommunityIcon name={c.name} category={c.category} size="sm" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <p className="text-slate-500 text-xs">
                      {c.members_count ?? 0} members{c.category ? ` · ${c.category}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl border border-pi-500/20 relative overflow-hidden cursor-pointer hover:border-pi-500/40 transition-all min-w-0"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(13,148,136,0.05))' }}
        onClick={() => navigate('/vision')}
      >
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, #0d9488, transparent)' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-pi-400 shrink-0" />
              <span className="text-pi-300 font-semibold text-sm">Explore the Pi Ecosystem</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1 break-words">
              See how everything connects
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Vision roadmap plus{' '}
              <button
                type="button"
                className="text-teal-300 font-semibold hover:underline"
                onClick={e => { e.stopPropagation(); navigate('/transparency') }}
              >
                Engineering Transparency
              </button>
              {' '}— what’s live vs demo.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            Explore <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
