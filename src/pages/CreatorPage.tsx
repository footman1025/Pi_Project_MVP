import { Clapperboard, GraduationCap, UsersRound, Package, HeartHandshake, AreaChart, TrendingUp, PlayCircle } from 'lucide-react'
import { mockCreators } from '../data/mockData'

const creatorFeatures = [
  { icon: Clapperboard, label: 'Go Live', desc: 'Host live sessions with your audience', color: 'from-red-500 to-pink-600' },
  { icon: GraduationCap, label: 'Courses', desc: 'Sell premium educational content', color: 'from-pi-500 to-teal-600' },
  { icon: UsersRound, label: 'Communities', desc: 'Build paid premium communities', color: 'from-emerald-500 to-teal-600' },
  { icon: Package, label: 'Digital Products', desc: 'Sell templates, tools & more', color: 'from-amber-500 to-orange-600' },
  { icon: HeartHandshake, label: 'Tips & Donations', desc: 'Let your audience support you', color: 'from-pink-500 to-rose-600' },
  { icon: AreaChart, label: 'Analytics', desc: 'Real-time performance insights', color: 'from-cyan-500 to-blue-600' },
]

export default function CreatorPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white mb-2">Creator Hub</h1>
        <p className="text-slate-400">Build your audience. Monetize your expertise. Everything inside one ecosystem.</p>
      </div>

      {/* Hero banner */}
      <div className="p-6 rounded-2xl border border-pink-500/20 mb-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(13,148,136,0.05))' }}>
        <div className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-pink-400" />
              <span className="text-pink-300 text-sm font-semibold">Creator Economy</span>
            </div>
            <h2 className="font-display text-2xl font-extrabold text-white mb-2">Grow your audience on Pi</h2>
            <p className="text-slate-400 text-sm max-w-md">
              Join thousands of creators already monetizing their expertise. Pi's AI helps your content reach the right audience — organically.
            </p>
          </div>
          <button className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ec4899, #0d9488)' }}>
            <PlayCircle size={18} />
            Start Creating
          </button>
        </div>
      </div>

      {/* Creator features */}
      <h2 className="text-xl font-bold text-white mb-4">Creator Tools</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {creatorFeatures.map(({ icon: Icon, label, desc, color }, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all duration-300 cursor-pointer hover:scale-[1.02] group"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-white mb-1">{label}</h3>
            <p className="text-slate-400 text-xs">{desc}</p>
          </div>
        ))}
      </div>

      {/* Top Creators */}
      <h2 className="text-xl font-bold text-white mb-4">Top Creators on Pi</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {mockCreators.map((c, i) => (
          <div key={i} className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white font-bold text-xl`}>
                {c.avatar}
              </div>
              <div>
                <p className="text-white font-bold">{c.name}</p>
                <p className="text-slate-400 text-xs">{c.category}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-white font-bold text-sm">{c.followers}</p>
                <p className="text-slate-500 text-xs">Followers</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/5">
                <p className="text-emerald-400 font-bold text-sm">{c.revenue}</p>
                <p className="text-slate-500 text-xs">Revenue</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
