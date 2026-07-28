import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clapperboard, GraduationCap, UsersRound, Package, HeartHandshake, AreaChart,
  TrendingUp, PlayCircle, Newspaper, UserCog, MessageCircle, UserRound, Loader2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fetchHubProfiles } from '../lib/hubProfiles'
import { MatchResult } from '../lib/matching'
import UserAvatar from '../components/UserAvatar'
import StatusBadge from '../components/StatusBadge'
import ProfileName from '../components/ProfileName'

const creatorFeatures = [
  { icon: Clapperboard, label: 'Go Live', desc: 'Host live sessions with your audience', color: 'from-red-500 to-pink-600', to: '/feed', soon: true },
  { icon: GraduationCap, label: 'Courses', desc: 'Sell premium educational content', color: 'from-pi-500 to-teal-600', to: '/feed', soon: true },
  { icon: UsersRound, label: 'Communities', desc: 'Build and grow communities', color: 'from-emerald-500 to-teal-600', to: '/communities', soon: false },
  { icon: Package, label: 'Digital Products', desc: 'Sell templates, tools & more', color: 'from-amber-500 to-orange-600', to: '/feed', soon: true },
  { icon: HeartHandshake, label: 'Tips & Donations', desc: 'Let your audience support you', color: 'from-pink-500 to-rose-600', to: '/profile/edit', soon: true },
  { icon: AreaChart, label: 'Analytics', desc: 'Real-time performance insights', color: 'from-cyan-500 to-blue-600', to: '/dashboard', soon: true },
]

export default function CreatorPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<MatchResult[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchHubProfiles(profile, user?.id, 'creators', 12)
      if (cancelled) return
      setMatches(res.matches)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [profile, user?.id])

  const hasLive = matches.length > 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="font-display text-3xl font-extrabold text-white">Creator Hub</h1>
          <StatusBadge
            kind={hasLive ? 'live' : 'partial'}
            label={hasLive ? 'Live members' : 'Awaiting creators'}
            size="md"
          />
        </div>
        <p className="text-slate-400">
          Discover creators on Pi and connect via Message. Monetization tools (courses, livestreams, tips) are coming — start by posting and joining communities today.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-pink-500/20 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(13,148,136,0.05))' }}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-pink-400" />
              <span className="text-pink-300 text-sm font-semibold">Creator Economy</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white mb-2">Grow your audience on Pi</h2>
            <p className="text-slate-400 text-sm max-w-md">
              Start by sharing on the Feed and completing your public profile so people can discover you.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigate('/feed')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #ec4899, #0d9488)' }}>
              <PlayCircle size={18} />
              Start Creating
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile/edit')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-200 border border-white/15 hover:border-white/30 hover:bg-white/5 transition-all">
              <UserCog size={16} />
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button type="button" onClick={() => navigate('/feed')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15">
          <Newspaper size={15} /> Open Feed
        </button>
        <button type="button" onClick={() => navigate('/communities')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20">
          <UsersRound size={15} /> Browse Communities
        </button>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Creator Tools</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {creatorFeatures.map(({ icon: Icon, label, desc, color, to, soon }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigate(to)}
            className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300 hover:scale-[1.02] group text-left relative"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            {soon ? (
              <StatusBadge kind="soon" className="absolute top-3 right-3" />
            ) : (
              <StatusBadge kind="live" className="absolute top-3 right-3" />
            )}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-white mb-1">{label}</h3>
            <p className="text-slate-400 text-xs">{desc}</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h2 className="text-xl font-bold text-white">Creators for you</h2>
        <StatusBadge kind={hasLive ? 'live' : 'demo'} label={hasLive ? 'Live members' : 'No matches yet'} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-pi-400" /> Loading creators…
        </div>
      ) : !hasLive ? (
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-sm text-slate-300">
          <p className="font-semibold text-amber-200 mb-1">No matching creators yet</p>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            Invite creators to Pi, or open Matching / Search to find real members today.
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/match')} className="text-teal-300 font-semibold text-xs hover:underline">
              Open Matching →
            </button>
            <button type="button" onClick={() => navigate('/search')} className="text-teal-300 font-semibold text-xs hover:underline">
              Search →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(m => {
            const p = m.profile
            const name = p.full_name || p.username || 'Member'
            const skills = (p.skills || []).slice(0, 3)
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all"
                style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
              >
                <div className="flex items-center gap-3 mb-3">
                    <UserAvatar url={p.avatar_url} name={name} id={p.id} username={p.username} from="/creators" size={48} rounded="rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <ProfileName name={name} username={p.username} from="/creators" className="text-white font-bold truncate block" />
                    <p className="text-slate-400 text-xs truncate">{p.role || 'Creator'}</p>
                  </div>
                  <span className="text-sm font-extrabold text-teal-300 shrink-0">{m.match}%</span>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {skills.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-slate-500 text-xs mb-4 line-clamp-2">{m.reasons[0] || p.bio || 'Active on Pi'}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/messages?u=${p.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <MessageCircle size={14} /> Message
                  </button>
                  <button
                    type="button"
                    disabled={!p.username}
                    onClick={() => p.username && navigate(`/p/${p.username}`, { state: { from: '/creators' } })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 transition-all disabled:opacity-40"
                  >
                    <UserRound size={14} /> Profile
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
