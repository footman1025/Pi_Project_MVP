import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarCheck, BadgeCheck, Scale, Stethoscope, Palette, Code2, BarChart2, TrendingUp,
  MessageCircle, UserRound, Loader2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { fetchHubProfiles } from '../lib/hubProfiles'
import { MatchResult } from '../lib/matching'
import UserAvatar from '../components/UserAvatar'
import StatusBadge from '../components/StatusBadge'
import ProfileName from '../components/ProfileName'

const professionalTypes = [
  { label: 'Lawyers', icon: Scale, desc: 'IP, startup, contract law', color: 'from-cyan-500 to-teal-600' },
  { label: 'Doctors', icon: Stethoscope, desc: 'Health tech & telemedicine', color: 'from-emerald-500 to-teal-600' },
  { label: 'Designers', icon: Palette, desc: 'UI/UX, brand, product', color: 'from-pink-500 to-rose-600' },
  { label: 'Developers', icon: Code2, desc: 'Full-stack, AI, mobile', color: 'from-teal-500 to-pi-600' },
  { label: 'Consultants', icon: BarChart2, desc: 'Strategy, growth, ops', color: 'from-amber-500 to-orange-600' },
  { label: 'Investors', icon: TrendingUp, desc: 'Angel, VC, syndicates', color: 'from-cyan-500 to-blue-600' },
]

export default function ProfessionalPage() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetchHubProfiles(profile, user?.id, 'professionals', 12)
      if (cancelled) return
      setMatches(res.matches)
      setCategoryCounts(res.categoryCounts)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [profile, user?.id])

  const hasLive = matches.length > 0

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="font-display text-3xl font-extrabold text-white">Professional Hub</h1>
          <StatusBadge
            kind={hasLive ? 'live' : 'partial'}
            label={hasLive ? 'Live members' : 'Awaiting professionals'}
            size="md"
          />
        </div>
        <p className="text-slate-400">
          Connect with experts on Pi via Message and profiles. Booking payments and portfolios are coming — use Matching and Search today.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-bold text-white">Browse Professionals</h2>
        <StatusBadge kind="live" label="Live counts" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {professionalTypes.map(({ icon: Icon, label, desc, color }, i) => {
          const count = categoryCounts[label] ?? 0
          return (
            <button
              key={i}
              type="button"
              onClick={() => navigate('/search')}
              className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all hover:scale-[1.02] group text-left"
              style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
            >
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <p className="text-white font-bold mb-0.5">{label}</p>
              <p className="text-pi-300 text-sm font-semibold mb-1">
                {count} {count === 1 ? 'member' : 'members'}
              </p>
              <p className="text-slate-500 text-xs">{desc}</p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <h2 className="text-lg font-bold text-white">Recommended for you</h2>
        <StatusBadge kind={hasLive ? 'live' : 'demo'} label={hasLive ? 'Live members' : 'No matches yet'} />
        <StatusBadge kind="soon" label="Book = Soon" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-pi-400" /> Loading professionals…
        </div>
      ) : !hasLive ? (
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-sm text-slate-300">
          <p className="font-semibold text-amber-200 mb-1">No matching professionals yet</p>
          <p className="text-slate-400 text-xs leading-relaxed mb-3">
            Invite experts to Pi, or open Matching / Search to find real members today.
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
        <div className="space-y-4">
          {matches.map(m => {
            const p = m.profile
            const name = p.full_name || p.username || 'Member'
            const skills = (p.skills || []).slice(0, 4)
            return (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all group"
                style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <UserAvatar url={p.avatar_url} name={name} id={p.id} username={p.username} from="/professionals" size={56} rounded="rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ProfileName name={name} username={p.username} from="/professionals" className="font-bold text-white text-lg truncate" />
                        <span className="text-xs font-extrabold text-teal-300">{m.match}% match</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-1 truncate">{p.role || 'Professional'}</p>
                      <p className="text-slate-500 text-xs mb-2 line-clamp-1">{m.reasons[0] || p.bio || 'Active on Pi'}</p>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map(s => (
                            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/messages?u=${p.id}`)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                    >
                      <MessageCircle size={14} />
                      Message
                    </button>
                    <button
                      type="button"
                      disabled={!p.username}
                      onClick={() => p.username && navigate(`/p/${p.username}`, { state: { from: '/professionals' } })}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 transition-all disabled:opacity-40"
                    >
                      <UserRound size={14} />
                      Profile
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Booking coming soon"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 border border-white/5 cursor-not-allowed opacity-60"
                    >
                      <CalendarCheck size={14} />
                      Book
                      <StatusBadge kind="soon" className="ml-1" />
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Portfolio marketplace coming soon"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 border border-white/5 cursor-not-allowed opacity-60"
                    >
                      <BadgeCheck size={14} />
                      Portfolio
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
