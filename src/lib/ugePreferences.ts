/** Pi Universal Generational Experience (UGE) — client preferences v0 */

export type TextScale = 'comfortable' | 'large' | 'xl'
export type Density = 'comfortable' | 'compact' | 'spacious'
export type NavMode = 'full' | 'simplified'

export type UgePreferences = {
  textScale: TextScale
  density: Density
  highContrast: boolean
  reduceMotion: boolean
  simplifiedNav: boolean
  /** Optional life-stage hint for future Twin personalization */
  lifeStage: 'teen' | 'young_adult' | 'adult' | 'senior' | 'auto'
}

const STORAGE_KEY = 'pi_uge_prefs_v1'

export const DEFAULT_UGE: UgePreferences = {
  textScale: 'comfortable',
  density: 'comfortable',
  highContrast: false,
  reduceMotion: false,
  simplifiedNav: false,
  lifeStage: 'auto',
}

export function loadUgePreferences(): UgePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const prefersReduce = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return { ...DEFAULT_UGE, reduceMotion: prefersReduce }
    }
    return { ...DEFAULT_UGE, ...JSON.parse(raw) as Partial<UgePreferences> }
  } catch {
    return { ...DEFAULT_UGE }
  }
}

export function saveUgePreferences(prefs: UgePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  applyUgePreferences(prefs)
  window.dispatchEvent(new CustomEvent('pi:uge-prefs', { detail: prefs }))
}

export function applyUgePreferences(prefs: UgePreferences) {
  const root = document.documentElement
  const scale =
    prefs.textScale === 'xl' ? '1.18' : prefs.textScale === 'large' ? '1.1' : '1'
  root.style.setProperty('--pi-text-scale', scale)
  root.dataset.piDensity = prefs.density
  root.dataset.piContrast = prefs.highContrast ? 'high' : 'normal'
  root.dataset.piMotion = prefs.reduceMotion ? 'reduce' : 'ok'
  root.dataset.piNav = prefs.simplifiedNav ? 'simple' : 'full'
  root.style.fontSize = `${16 * Number(scale)}px`
}

export const LIFE_STAGE_LABELS: Record<UgePreferences['lifeStage'], string> = {
  auto: 'Let Pi adapt',
  teen: 'Teen / student',
  young_adult: 'Young adult',
  adult: 'Adult / professional',
  senior: 'Older adult',
}
