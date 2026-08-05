import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Search } from 'lucide-react'
import { FEATURE_SEO } from '../lib/seo'
import PiLogo from '../components/PiLogo'

export default function FeaturesHubPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(16px)' }}>
        <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <PiLogo size={32} className="ring-1 ring-white/10" />
          <div>
            <p className="text-white font-bold text-sm leading-none">Pi Features</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Discoverable product identity</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/demo')}
          className="ml-auto text-xs font-semibold text-teal-300 hover:text-teal-200">
          Investor Demo
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-3">
          <Search size={18} className="text-teal-400" />
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest">Product SEO</p>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
          Every major Pi feature has a discoverable identity
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-10">
          What problem it solves, who benefits, and why Pi is different — built for search visibility as we grow.
        </p>

        <div className="space-y-3">
          {FEATURE_SEO.map(f => (
            <button
              key={f.slug}
              type="button"
              onClick={() => navigate(`/features/${f.slug}`)}
              className="w-full text-left rounded-2xl border border-white/8 p-5 hover:border-teal-500/30 transition-colors"
              style={{ background: 'rgba(14,20,25,0.65)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-white font-bold text-lg mb-1">{f.name}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.problem}</p>
                </div>
                <ArrowRight size={18} className="text-teal-400 shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/connect')}
            className="px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            Meet Pi AI
          </button>
          <button type="button" onClick={() => navigate('/transparency')}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-slate-200 border border-white/10">
            What’s live
          </button>
        </div>
      </div>
    </div>
  )
}
