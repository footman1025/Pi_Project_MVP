import { Star, CalendarCheck, BadgeCheck, Scale, Stethoscope, Palette, Code2, BarChart2, TrendingUp } from 'lucide-react'
import { mockProfessionals } from '../data/mockData'

const professionalTypes = [
  { label: 'Lawyers', icon: Scale, count: '1.2k', desc: 'IP, startup, contract law', color: 'from-cyan-500 to-teal-600' },
  { label: 'Doctors', icon: Stethoscope, count: '890', desc: 'Health tech & telemedicine', color: 'from-emerald-500 to-teal-600' },
  { label: 'Designers', icon: Palette, count: '3.4k', desc: 'UI/UX, brand, product', color: 'from-pink-500 to-rose-600' },
  { label: 'Developers', icon: Code2, count: '8.7k', desc: 'Full-stack, AI, mobile', color: 'from-teal-500 to-pi-600' },
  { label: 'Consultants', icon: BarChart2, count: '2.1k', desc: 'Strategy, growth, ops', color: 'from-amber-500 to-orange-600' },
  { label: 'Investors', icon: TrendingUp, count: '640', desc: 'Angel, VC, syndicates', color: 'from-cyan-500 to-blue-600' },
]

export default function ProfessionalPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white mb-2">Professional Hub</h1>
        <p className="text-slate-400">Discover professionals, book sessions, and collaborate across borders with AI-powered matching.</p>
      </div>

      {/* Category grid */}
      <h2 className="text-lg font-bold text-white mb-4">Browse Professionals</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {professionalTypes.map(({ icon: Icon, label, count, desc, color }, i) => (
          <div key={i}
            className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer hover:scale-[1.02] group"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            {/* Modern lucide icon with gradient background */}
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-white font-bold mb-0.5">{label}</p>
            <p className="text-pi-300 text-sm font-semibold mb-1">{count} available</p>
            <p className="text-slate-500 text-xs">{desc}</p>
          </div>
        ))}
      </div>

      {/* Featured professionals */}
      <h2 className="text-lg font-bold text-white mb-4">AI-Recommended for You</h2>
      <div className="space-y-4">
        {mockProfessionals.map((p, i) => (
          <div key={i}
            className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer group"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {p.avatar}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                <p className="text-slate-400 text-sm mb-2">{p.role}</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13}
                      className={j < Math.floor(p.rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">{p.rating} ({p.reviews} reviews)</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  <CalendarCheck size={14} />
                  Book
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 border border-white/10 hover:border-white/20 transition-all">
                  <BadgeCheck size={14} />
                  Portfolio
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
