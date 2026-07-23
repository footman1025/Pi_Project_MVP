import { useNavigate } from 'react-router-dom'
import { Sparkles, UsersRound, Briefcase, Bot, CalendarDays, TrendingUp, ArrowRight } from 'lucide-react'
import { mockMatches, mockOpportunities, mockCommunities } from '../data/mockData'
import { useAuth } from '../contexts/AuthContext'
import MockIcon from '../components/MockIcon'
import UserAvatar from '../components/UserAvatar'
import { buildDigitalTwin } from '../lib/digitalTwin'
import DigitalTwinCard from '../components/DigitalTwinCard'

const dashCards = [
  { icon: Sparkles, label: 'AI Recommendations', value: '12 new', color: 'from-pi-500 to-teal-600', to: '/match', demo: true },
  { icon: UsersRound, label: 'Suggested People', value: '8 matches', color: 'from-pink-500 to-rose-600', to: '/match', demo: true },
  { icon: UsersRound, label: 'Trending Communities', value: '5 active', color: 'from-emerald-500 to-teal-600', to: '/communities', demo: false },
  { icon: Briefcase, label: 'Opportunities', value: '24 open', color: 'from-amber-500 to-orange-600', to: '/opportunities', demo: true },
  { icon: Bot, label: 'AI Assistant', value: 'Online', color: 'from-teal-500 to-pi-600', to: null, demo: false },
  { icon: CalendarDays, label: 'Upcoming Events', value: '3 this week', color: 'from-cyan-500 to-blue-600', to: '/opportunities', demo: true },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'
  const twin = buildDigitalTwin(profile)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <UserAvatar
            url={profile?.avatar_url}
            name={displayName}
            id={user?.id}
            size={48}
            rounded="rounded-2xl"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-white">Good morning, {displayName}</h1>
            <p className="text-slate-400 text-sm">
              Your AI Twin is mapping who and what can accelerate your goals.{' '}
              <button onClick={() => navigate('/demo')} className="text-teal-300 font-semibold hover:underline">
                Open Investor Demo
              </button>
            </p>
          </div>
        </div>
      </div>

      {twin && (
        <div className="mb-8">
          <DigitalTwinCard twin={twin} name={displayName} compact />
          <button
            onClick={() => navigate('/twin')}
            className="mt-3 text-sm text-teal-300 font-semibold hover:text-teal-200 inline-flex items-center gap-1"
          >
            Open full Digital Twin <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {dashCards.map(({ icon: Icon, label, value, color, to, demo }, i) => (
          <button key={i}
            onClick={() => to && navigate(to)}
            className={`p-4 rounded-2xl border border-white/5 text-left transition-all duration-300 hover:scale-105 hover:border-pi-500/20 group relative ${to ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            {demo && (
              <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 font-semibold leading-none">
                Demo
              </span>
            )}
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="text-white font-bold text-sm">{value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top matches */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Your Best Matches Today</h2>
            <button onClick={() => navigate('/match')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {mockMatches.slice(0, 3).map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer group"
                style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.4), rgba(14,20,25,0.6))' }}>
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{m.name}</p>
                    <span className="text-xs text-slate-500">·</span>
                    <p className="text-xs text-slate-400">{m.role}</p>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{m.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-lg font-extrabold" style={{ background: 'linear-gradient(135deg, #5eead4, #ff9b6a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {m.match}%
                  </div>
                  <p className="text-xs text-slate-500">match</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Top opportunities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Hot Opportunities</h2>
              <button onClick={() => navigate('/opportunities')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1">
                All <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {mockOpportunities.slice(0, 3).map(o => (
                <div key={o.id} className={`p-3 rounded-2xl border bg-gradient-to-br ${o.color} ${o.border} cursor-pointer hover:scale-[1.02] transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${o.iconColor} flex items-center justify-center flex-shrink-0`}>
                      <MockIcon name={o.iconName} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{o.title}</p>
                      <p className="text-slate-400 text-xs">{o.prize}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{o.match}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending communities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Communities</h2>
              <button onClick={() => navigate('/communities')} className="text-pi-400 text-sm hover:text-pi-300 flex items-center gap-1">
                All <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {mockCommunities.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center flex-shrink-0`}>
                    <MockIcon name={c.iconName} size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{c.name}</p>
                    <p className="text-slate-500 text-xs">{c.members} members</p>
                  </div>
                  {c.active && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pi Vision Banner */}
      <div className="mt-8 p-6 rounded-2xl border border-pi-500/20 relative overflow-hidden cursor-pointer hover:border-pi-500/40 transition-all"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(13,148,136,0.05))' }}
        onClick={() => navigate('/vision')}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{ background: 'radial-gradient(circle at top right, #0d9488, transparent)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-pi-400" />
              <span className="text-pi-300 font-semibold text-sm">Explore the Pi Ecosystem</span>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-1">See how everything connects</h3>
            <p className="text-slate-400 text-sm">Discover the full vision behind Pi — the AI-native ecosystem for human connection.</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex-shrink-0 ml-4"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            Explore <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
