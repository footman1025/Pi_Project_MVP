/** Sci‑fi / alien-style connection ring via Web Audio (no external file). */

let sharedCtx: AudioContext | null = null

function getCtx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AC()
  return sharedCtx
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gainPeak = 0.18,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gainPeak, start + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/**
 * Plays a short alien “connection” ring when two users connect.
 * Safe to call from UI clicks; no-ops if Audio is unavailable.
 */
export async function playConnectSound() {
  try {
    const ctx = getCtx()
    if (!ctx) return
    if (ctx.state === 'suspended') await ctx.resume()

    const t0 = ctx.currentTime + 0.02
    // Rising alien chirps + low pulse
    tone(ctx, 880, t0, 0.22, 'sawtooth', 0.12)
    tone(ctx, 1320, t0 + 0.18, 0.2, 'square', 0.1)
    tone(ctx, 660, t0 + 0.36, 0.28, 'triangle', 0.14)
    tone(ctx, 1760, t0 + 0.55, 0.35, 'sawtooth', 0.11)
    tone(ctx, 110, t0, 0.9, 'sine', 0.08)
  } catch {
    // Ignore autoplay / permission failures
  }
}
