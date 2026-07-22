import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, UserCircle2, Sparkles, UsersRound,
  Rocket, Building2, Bot,
  Link2, TrendingUp, Globe2, ShieldCheck
} from 'lucide-react'

const nodes = [
  { label: 'People', Icon: UserCircle2, color: 'from-pi-500 to-teal-600', x: 50, y: 8 },
  { label: 'AI Layer', icon: 'π', color: 'from-teal-500 to-pi-600', x: 50, y: 30, center: true },
  { label: 'Communities', Icon: UsersRound, color: 'from-emerald-500 to-teal-600', x: 15, y: 52 },
  { label: 'Creators', Icon: Sparkles, color: 'from-pink-500 to-rose-600', x: 38, y: 62 },
  { label: 'Professionals', Icon: Building2, color: 'from-amber-500 to-orange-600', x: 62, y: 62 },
  { label: 'Companies', Icon: Globe2, color: 'from-cyan-500 to-blue-600', x: 85, y: 52 },
  { label: 'Opportunities', Icon: Rocket, color: 'from-rose-500 to-red-600', x: 50, y: 82 },
]

const pillars = [
  { Icon: Bot, color: 'from-pi-500 to-teal-600', title: 'AI Personal Intelligence', desc: 'Every user has an intelligent AI companion that discovers opportunities, organizes information, and personalizes the experience.' },
  { Icon: Link2, color: 'from-emerald-500 to-teal-600', title: 'Social Connection', desc: 'Meaningful connections based on goals, skills, and interests — not just engagement algorithms.' },
  { Icon: Sparkles, color: 'from-pink-500 to-rose-600', title: 'Collaboration Economy', desc: 'Transform skills and ideas into opportunities through services, courses, digital products, and professional collaboration.' },
  { Icon: TrendingUp, color: 'from-amber-500 to-orange-600', title: 'SEO Growth Engine', desc: 'Organic discovery built in from day one. Public profiles, communities, and opportunities indexed for search engines.' },
  { Icon: Globe2, color: 'from-cyan-500 to-blue-600', title: 'Global Discovery', desc: 'AI-powered translation and matching breaks language barriers, connecting talent and opportunity across borders.' },
  { Icon: ShieldCheck, color: 'from-teal-500 to-pi-600', title: 'Trust & Safety', desc: 'Layered moderation, compliance, and fraud prevention built into the core architecture of Pi.' },
]

export default function VisionPage() {
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold text-white mb-2">Pi Vision Dashboard</h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Pi is more than a social network. It is an AI-powered opportunity ecosystem where every interaction creates value.
        </p>
      </div>

      {/* Ecosystem diagram */}
      <div className="p-8 rounded-3xl border border-pi-500/20 mb-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.95), rgba(8,13,26,0.98))' }}>
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(rgba(20,184,166,0.8) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(circle at 50% 30%, rgba(20,184,166,0.3) 0%, transparent 60%)' }} />

        <h2 className="text-center text-lg font-bold text-white mb-8 relative z-10">
          The Pi Ecosystem — Everything Connected Through AI
        </h2>

        <div className="relative" style={{ height: '340px' }}>
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {nodes.slice(2).map((n, i) => (
              <line key={i}
                x1="50%" y1="33%"
                x2={`${n.x}%`} y2={`${n.y + 5}%`}
                stroke="rgba(20,184,166,0.3)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                style={{ opacity: animated ? 1 : 0, transition: `opacity 0.5s ease ${i * 150 + 300}ms` }}
              />
            ))}
            <line x1="50%" y1="14%" x2="50%" y2="30%"
              stroke="rgba(20,184,166,0.5)" strokeWidth="2" strokeDasharray="4 4"
              style={{ opacity: animated ? 1 : 0, transition: 'opacity 0.5s ease 100ms' }} />
          </svg>

          {/* Nodes */}
          {nodes.map((node, i) => (
            <div key={i}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                zIndex: 2,
                opacity: animated ? 1 : 0,
                transform: `translate(-50%, -50%) scale(${animated ? 1 : 0.5})`,
                transition: `opacity 0.5s ease ${i * 150}ms, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 150}ms`,
              }}>
              <div
                className={`bg-gradient-to-br ${node.color} rounded-2xl flex items-center justify-center text-white shadow-lg ${node.center ? 'w-16 h-16' : 'w-12 h-12'}`}
                style={node.center ? { boxShadow: '0 0 30px rgba(20,184,166,0.6)' } : {}}>
                {node.center
                  ? <span className="font-extrabold text-2xl">π</span>
                  : node.Icon && <node.Icon size={node.center ? 28 : 20} className="text-white" />
                }
              </div>
              <span className={`text-xs font-semibold text-center whitespace-nowrap ${node.center ? 'text-pi-300' : 'text-slate-300'}`}>
                {node.label}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-4 relative z-10">
          <p className="text-slate-400 text-sm">Connect · Learn · Build · Create · Earn · Grow</p>
        </div>
      </div>

      {/* Pillars */}
      <h2 className="font-display text-2xl font-extrabold text-white mb-6">The Foundation of Pi</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {pillars.map(({ Icon, color, title, desc }, i) => (
          <div key={i}
            className="p-5 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all group"
            style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.4), rgba(14,20,25,0.6))' }}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon size={18} className="text-white" />
            </div>
            <h3 className="font-bold text-white mb-2 text-sm">{title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <h2 className="font-display text-2xl font-extrabold text-white mb-6">Long-Term Roadmap</h2>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { Icon: Link2, phase: 'Phase 1', title: 'Foundation', color: 'from-pi-500 to-teal-600', desc: 'Build the AI-native social experience. Focus on user experience, AI personalization, community building, and early adoption.', active: true },
          { Icon: Rocket, phase: 'Phase 2', title: 'Expansion', color: 'from-emerald-500 to-teal-600', desc: 'Introduce the opportunity ecosystem. Professional networking, creator economy, digital services, collaboration tools.', active: false },
          { Icon: Globe2, phase: 'Phase 3', title: 'Pi Ecosystem', color: 'from-amber-500 to-orange-600', desc: 'Expand into a complete AI-native environment: advanced AI agents, global marketplace, digital economy.', active: false },
        ].map(({ Icon, phase, title, color, desc, active }, i) => (
          <div key={i}
            className={`p-5 rounded-2xl border transition-all ${active ? 'border-pi-500/30' : 'border-white/5'}`}
            style={{ background: active ? 'rgba(20,184,166,0.08)' : 'rgba(14,20,25,0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{phase}</p>
                <p className="text-white font-bold">{title}</p>
              </div>
              {active && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-semibold">
                  Now
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="p-8 rounded-3xl border border-pi-500/20 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(13,148,136,0.05))', boxShadow: '0 0 60px rgba(20,184,166,0.15)' }}>
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-3xl"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
          π
        </div>
        <h2 className="font-display text-3xl font-extrabold text-white mb-3">The Future of Human Connection Starts Here.</h2>
        <p className="text-slate-400 mb-6">Pi (π). One Platform. Infinite Opportunities.</p>
        <button onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
          Explore Pi Dashboard
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}
