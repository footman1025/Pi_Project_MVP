import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accessibility, ArrowLeft, Check, Sparkles, Type, LayoutGrid,
  Contrast, PersonStanding, Eye, Navigation,
} from 'lucide-react'
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

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            value === o.id
              ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
              : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: typeof Contrast
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-black/25 hover:border-white/12 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center shrink-0">
        <Icon size={16} />
      </div>
      <span className="flex-1 min-w-0">
        <span className="text-white text-sm font-semibold block">{label}</span>
        <span className="text-slate-500 text-xs leading-relaxed">{desc}</span>
      </span>
      <span
        className={`relative mt-1 w-10 h-6 rounded-full shrink-0 transition-colors ${
          checked ? 'bg-teal-500' : 'bg-white/10'
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

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

  const previewScale =
    prefs.textScale === 'xl' ? '1.18' : prefs.textScale === 'large' ? '1.1' : '1'

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0">
        <button
          type="button"
          onClick={() => navigate(session ? '/dashboard' : '/')}
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} /> {session ? 'Dashboard' : 'Home'}
        </button>

        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Accessibility size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Universal Generational Experience
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Experience
                </h1>
                <StatusBadge kind="partial" label="Foundation" />
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px] max-w-xl">
            Pi adapts to you — not the other way around. Tune readability, density, and personalization for every life stage.
          </p>
        </header>

        {/* Live preview */}
        <div
          className="relative overflow-hidden rounded-2xl border border-teal-500/20 p-4 sm:p-5 mb-4"
          style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(10,14,22,0.92))' }}
        >
          <div
            className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-25 blur-2xl"
            style={{ background: '#14b8a6' }}
          />
          <div className="relative flex items-center gap-2 mb-2">
            <Eye size={14} className="text-teal-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/90">Live preview</p>
          </div>
          <p
            className="relative text-white font-semibold leading-snug"
            style={{ fontSize: `${0.95 * Number(previewScale)}rem` }}
          >
            One platform. Infinite experiences.
          </p>
          <p
            className="relative text-slate-400 mt-1.5 leading-relaxed"
            style={{ fontSize: `${0.8 * Number(previewScale)}rem` }}
          >
            {LIFE_STAGE_LABELS[prefs.lifeStage]} · {prefs.density} density
            {prefs.highContrast ? ' · high contrast' : ''}
            {prefs.reduceMotion ? ' · reduced motion' : ''}
            {prefs.simplifiedNav ? ' · simplified nav' : ''}
          </p>
        </div>

        {/* Display */}
        <section
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-3.5"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
              <Type size={15} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Display</p>
              <p className="text-slate-500 text-[11px]">Text size and layout density</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2">Text size</p>
              <ChipGroup options={scales} value={prefs.textScale} onChange={id => update('textScale', id)} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium mb-2 flex items-center gap-1.5">
                <LayoutGrid size={12} /> Density
              </p>
              <ChipGroup options={densities} value={prefs.density} onChange={id => update('density', id)} />
            </div>
          </div>
        </section>

        {/* Life stage */}
        <section
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-3.5"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
              <PersonStanding size={15} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Life stage hint</p>
              <p className="text-slate-500 text-[11px]">Helps Twin and Companion personalize over time</p>
            </div>
          </div>
          <ChipGroup
            options={(Object.keys(LIFE_STAGE_LABELS) as UgePreferences['lifeStage'][]).map(id => ({
              id,
              label: LIFE_STAGE_LABELS[id],
            }))}
            value={prefs.lifeStage}
            onChange={id => update('lifeStage', id)}
          />
        </section>

        {/* Accessibility & nav */}
        <section
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-5 space-y-2.5"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
              <Accessibility size={15} />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Accessibility & navigation</p>
              <p className="text-slate-500 text-[11px]">Comfort and cognitive load controls</p>
            </div>
          </div>
          <ToggleRow
            icon={Contrast}
            label="High contrast"
            desc="Stronger borders and text for readability"
            checked={prefs.highContrast}
            onChange={v => update('highContrast', v)}
          />
          <ToggleRow
            icon={Sparkles}
            label="Reduce motion"
            desc="Limit decorative animations across Pi"
            checked={prefs.reduceMotion}
            onChange={v => update('reduceMotion', v)}
          />
          <ToggleRow
            icon={Navigation}
            label="Simplified navigation"
            desc="Focus the sidebar on core loops only"
            checked={prefs.simplifiedNav}
            onChange={v => update('simplifiedNav', v)}
          />
        </section>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={persist}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:brightness-110 transition-all"
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
