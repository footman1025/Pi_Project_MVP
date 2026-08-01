/** Rules-based Trust risk scoring v0 — not a full AI moderation engine. */

import type { ReportReason } from './contentReports'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type RiskBreakdown = {
  score: number
  level: RiskLevel
  signals: string[]
}

const REASON_BASE: Record<ReportReason, number> = {
  illegal: 88,
  scam: 78,
  harassment: 68,
  misinformation: 52,
  spam: 38,
  other: 28,
}

const HIGH_SIGNAL = [
  /suicid|self[- ]?harm|kill|weapon|bomb|terror/i,
  /child|minor|underage|csam/i,
  /extort|ransom|blackmail/i,
  /phishing|wire transfer|crypto scam|rug pull/i,
]

const MED_SIGNAL = [
  /threat|doxx|dox |swat/i,
  /hate|slur|racist/i,
  /impersonat|fake account/i,
  /fraud|steal|hacked/i,
]

export function levelFromScore(score: number): RiskLevel {
  if (score >= 85) return 'critical'
  if (score >= 65) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

/** Compute a 0–100 risk score for triage (honest Partial — not live AI risk engine). */
export function scoreReportRisk(input: {
  reason: ReportReason | string
  details?: string | null
  targetType?: string
}): RiskBreakdown {
  const reason = (input.reason || 'other') as ReportReason
  const signals: string[] = []
  let score = REASON_BASE[reason] ?? REASON_BASE.other
  signals.push(`Reason: ${reason} (+${REASON_BASE[reason] ?? REASON_BASE.other})`)

  const details = (input.details || '').trim()
  if (details.length >= 40) {
    score += 6
    signals.push('Detailed report (+6)')
  } else if (details.length >= 12) {
    score += 3
    signals.push('Some context provided (+3)')
  }

  for (const re of HIGH_SIGNAL) {
    if (re.test(details) || re.test(reason)) {
      score += 18
      signals.push('High-severity language signal (+18)')
      break
    }
  }
  for (const re of MED_SIGNAL) {
    if (re.test(details)) {
      score += 10
      signals.push('Elevated language signal (+10)')
      break
    }
  }

  if (input.targetType === 'profile') {
    score += 4
    signals.push('Profile target (+4)')
  }
  if (input.targetType === 'message') {
    score += 5
    signals.push('Private message target (+5)')
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  return { score, level: levelFromScore(score), signals }
}

export function riskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'text-rose-300 border-rose-500/35 bg-rose-500/15'
    case 'high':
      return 'text-orange-300 border-orange-500/35 bg-orange-500/15'
    case 'medium':
      return 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    default:
      return 'text-slate-400 border-white/10 bg-white/5'
  }
}
