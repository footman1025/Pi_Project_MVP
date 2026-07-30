import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accessibility, ArrowLeft, Check, Sparkles } from 'lucide-react'
import {
  DEFAULT_UGE,
  LIFE_STAGE_LABELS,
  applyUgePreferences,
  loadUgePreferences,
  saveUgePreferences,
  type Density,
  type TextScale,
  type UgePreferences,
} from '../lib/ugePreferences'
import { track } from '../lib/analytics'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'

export default function ExperienceSettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [prefs, setPrefs] = useState<UgePreferences>(DEFAULT_UGE)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loaded = loadUgePreferences()
    setPrefs(loaded)
    applyUgePreferences(loaded)
  }, [])

  const update = <K extends keyof UgePreferences>(key: K, value: UgePreferences[K]) => {
    setPrefs(p => {
      const next = { ...p, [key]: value }
      applyUgePreferences(next)
      return next
    })
    setSaved(false)
  }

  const persist = () => {
    saveUgePreferences(prefs)
    track('uge_prefs_save', {
      text_scale: prefs.textScale,
      density: prefs.density,
      high_contrast: prefs.highContrast,
      reduce_motion: prefs.reduceMotion,
      simplified_nav: prefs.simplifiedNav,
      life_stage: prefs.lifeStage,
    })
    setSaved(true)
  }

  const scales: { id: TextScale; label: string }[] = [
    { id: 'comfortable', label: 'Standard' },
    { id: 'large', label: 'Large' },
    { id: 'xl', label: 'Extra large' },
  ]

  const densities: { id: Density; label: string }[] = [
    { id: 'compact', label: 'Compact' },
    { id: 'comfortable', label: 'Comfortable' },
    { id: 'spacious', label: 'Spacious' },
  ]

  return (
    <div className="min-h-full relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.18), transparent)' }}
      />
      <div className="relative p-4 sm:p-6 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(session ? '/dashboard' : '/')}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white"
        >
          <ArrowLeft size={13} /> {session ? 'Dashboard' : 'Home'}
        </button>

        <header className="mb-7">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Accessibility size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90">UGE</p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Experience</h1>
            </div>
            <StatusBadge kind="partial" label="Foundation" />
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px]">
            Pi adapts to you — not the other way around. These preferences are the first layer of Universal Generational Experience.
          </p>
        </header>

        <section
          className="rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-4 space-y-5"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          <div>
            <p className="text-white text-sm font-semibold mb-2">Text size</p>
            <div className="flex flex-wrap gap-2">
              {scales.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update('textScale', s.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    prefs.textScale === s.id
                      ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white text-sm font-semibold mb-2">Density</p>
            <div className="flex flex-wrap gap-2">
              {densities.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => update('density', d.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    prefs.density === d.id
                      ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white text-sm font-semibold mb-2">Life stage hint</p>
            <p className="text-slate-500 text-[11px] mb-2">Helps Twin and Companion personalize guidance over time.</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LIFE_STAGE_LABELS) as UgePreferences['lifeStage'][]).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => update('lifeStage', id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    prefs.lifeStage === id
                      ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                      : 'border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {LIFE_STAGE_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: 'highContrast' as const, label: 'High contrast', desc: 'Stronger borders and text for readability' },
            { key: 'reduceMotion' as const, label: 'Reduce motion', desc: 'Limit decorative animations' },
            { key: 'simplifiedNav' as const, label: 'Simplified navigation', desc: 'Focus sidebar on core loops' },
          ].map(item => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={e => update(item.key, e.target.checked)}
                className="mt-1 rounded border-white/20 bg-black/40 text-teal-500 focus:ring-teal-500/40"
              />
              <span>
                <span className="text-white text-sm font-semibold block">{item.label}</span>
                <span className="text-slate-500 text-xs">{item.desc}</span>
              </span>
            </label>
          ))}
        </section>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={persist}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {saved ? <Check size={15} /> : <Sparkles size={15} />}
            {saved ? 'Saved' : 'Save preferences'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/features/universal-experience')}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20"
          >
            About UGE
          </button>
          <button
            type="button"
            onClick={() => navigate('/trust')}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/10 hover:border-white/20"
          >
            Trust & Safety
          </button>
        </div>

        <p className="text-slate-600 text-xs leading-relaxed">
          Roadmap: voice-first mode, family spaces, intergenerational mentoring, and deeper Companion personalization.
          Preferences apply on this device today; account sync comes next.
        </p>
      </div>
    </div>
  )
}
