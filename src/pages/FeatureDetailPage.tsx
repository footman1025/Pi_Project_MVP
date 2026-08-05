import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Target, Users, Sparkles } from 'lucide-react'
import { featureBySlug, FEATURE_SEO } from '../lib/seo'
import { useAuth } from '../contexts/AuthContext'
import PiLogo from '../components/PiLogo'

export default function FeatureDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const feature = featureBySlug(slug)

  if (!feature) return <Navigate to="/features" replace />

  const goCta = () => {
    const authOnly = ['/twin', '/match', '/communities', '/opportunities', '/messages', '/creators']
    if (authOnly.includes(feature.ctaPath) && !session) {
      navigate('/signup')
      return
    }
    navigate(feature.ctaPath)
  }

  const others = FEATURE_SEO.filter(f => f.slug !== feature.slug).slice(0, 4)

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(16px)' }}>
        <button type="button" onClick={() => navigate('/features')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <PiLogo size={32} className="shrink-0 ring-1 ring-white/10" />
          <p className="text-white font-bold text-sm truncate">{feature.name}</p>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2">Pi feature</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">{feature.name}</h1>
        <p className="text-slate-300 text-base leading-relaxed mb-8">{feature.description}</p>

        <div className="space-y-4 mb-10">
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,25,0.7)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-amber-400" />
              <h2 className="text-white font-bold text-sm">Problem it solves</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.problem}</p>
          </section>
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,25,0.7)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-sky-400" />
              <h2 className="text-white font-bold text-sm">Who benefits</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.who}</p>
          </section>
          <section className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(14,20,25,0.7)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-teal-400" />
              <h2 className="text-white font-bold text-sm">Why Pi is different</h2>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.whyDifferent}</p>
          </section>
        </div>

        <button
          type="button"
          onClick={goCta}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white mb-12"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          {feature.ctaLabel} <ArrowRight size={16} />
        </button>

        <h3 className="text-white font-bold text-sm mb-3">More Pi features</h3>
        <div className="flex flex-wrap gap-2">
          {others.map(f => (
            <button
              key={f.slug}
              type="button"
              onClick={() => navigate(`/features/${f.slug}`)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:text-white hover:border-teal-500/30"
            >
              {f.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/features')}
            className="text-xs px-3 py-1.5 rounded-full border border-teal-500/30 text-teal-300"
          >
            All features
          </button>
        </div>
      </article>
    </div>
  )
}
