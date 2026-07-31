/** Pi Universal Generational Experience (UGE) — device + account sync */

import { supabase } from './supabase'

export type TextScale = 'comfortable' | 'large' | 'xl'
export type Density = 'comfortable' | 'compact' | 'spacious'
export type NavMode = 'full' | 'simplified'

export type UgePreferences = {
  textScale: TextScale
  density: Density
  highContrast: boolean
  reduceMotion: boolean
  simplifiedNav: boolean
  /** Optional life-stage hint for Twin / Companion personalization */
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

function normalizePrefs(raw: Partial<UgePreferences> | null | undefined): UgePreferences {
  return { ...DEFAULT_UGE, ...(raw || {}) }
}

export function loadUgePreferences(): UgePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const prefersReduce = typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return { ...DEFAULT_UGE, reduceMotion: prefersReduce }
    }
    return normalizePrefs(JSON.parse(raw) as Partial<UgePreferences>)
  } catch {
    return { ...DEFAULT_UGE }
  }
}

export function saveUgePreferences(prefs: UgePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  applyUgePreferences(prefs)
  window.dispatchEvent(new CustomEvent('pi:uge-prefs', { detail: prefs }))
}

/** Merge profile JSON into local prefs (account wins when present). */
export function hydrateUgeFromProfile(profilePrefs: Record<string, unknown> | null | undefined) {
  if (!profilePrefs || typeof profilePrefs !== 'object') return loadUgePreferences()
  const merged = normalizePrefs(profilePrefs as Partial<UgePreferences>)
  saveUgePreferences(merged)
  return merged
}

/** Persist to profiles.uge_preferences when logged in (needs supabase_uge_preferences.sql). */
export async function syncUgeToProfile(userId: string, prefs: UgePreferences): Promise<{ ok: boolean; error?: string }> {
  saveUgePreferences(prefs)
  const { error } = await supabase
    .from('profiles')
    .update({ uge_preferences: prefs, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    if (/uge_preferences|schema cache|column/i.test(error.message)) {
      return { ok: true, error: 'Saved on this device. Run supabase_uge_preferences.sql for account sync.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
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

  const pad =
    prefs.density === 'compact' ? '0.85' : prefs.density === 'spacious' ? '1.15' : '1'
  root.style.setProperty('--pi-density-scale', pad)
}

export const LIFE_STAGE_LABELS: Record<UgePreferences['lifeStage'], string> = {
  auto: 'Let Pi adapt',
  teen: 'Teen / student',
  young_adult: 'Young adult',
  adult: 'Adult / professional',
  senior: 'Older adult',
}

export function companionTone(lifeStage: UgePreferences['lifeStage']): string {
  switch (lifeStage) {
    case 'teen':
      return 'I’ll keep explanations clear and practical — no jargon walls.'
    case 'senior':
      return 'I’ll use plain language and short steps. Ask me anytime to slow down.'
    case 'young_adult':
      return 'I can move fast on matches, opportunities, and next actions.'
    case 'adult':
      return 'I’ll focus on goals, trust, and high-signal opportunities.'
    default:
      return 'I’ll adapt as I learn how you like to work on Pi.'
  }
}
