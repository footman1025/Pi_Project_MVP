import { supabase } from './supabase'
import { askGroqWithSystem, hasGroqKey, type ChatTurn } from './groqAssistant'

export type ConnectTeam =
  | 'partnerships'
  | 'investors'
  | 'enterprise'
  | 'support'
  | 'community'
  | 'hiring'
  | 'media'

export type ConnectMessage = { role: 'user' | 'ai'; text: string }

export const CONNECT_TEAMS: Array<{
  id: ConnectTeam
  label: string
  blurb: string
}> = [
  { id: 'investors', label: 'Investors', blurb: 'Fundraising, investor intros, demo follow-up' },
  { id: 'partnerships', label: 'Partnerships', blurb: 'Integrations, co-marketing, platform partners' },
  { id: 'enterprise', label: 'Enterprise', blurb: 'Org / B2B opportunity intelligence' },
  { id: 'support', label: 'Technical Support', blurb: 'Bugs, access, product help' },
  { id: 'community', label: 'Community', blurb: 'Hubs, creators, member questions' },
  { id: 'hiring', label: 'Hiring & Careers', blurb: 'Join the Pi team' },
  { id: 'media', label: 'Media & Press', blurb: 'Press, podcasts, speaking' },
]

const CONNECT_SYSTEM = `You are Pi AI — the first point of contact for Pi (an AI-native human opportunity platform / ecosystem).

You greet every visitor (investors, partners, enterprises, creators, press, candidates, users) before any human.

Your job:
1) Understand why they are visiting.
2) Answer clearly about Pi (Digital Twin, matching, communities, opportunities, Investor Demo at /demo, Transparency at /transparency, Traction for signed-in team).
3) Guide them to the right next step on the product.
4) Collect name, email, organization, and intent when they want a human — keep it light, not a form dump.
5) Suggest the best routing team: Partnerships, Investors, Enterprise, Technical Support, Community, Hiring & Careers, or Media & Press.
6) Remind them they can tap “Speak with a Human” anytime; you will summarize the chat so they never repeat themselves.

Style: warm, concise (2–5 sentences), AI-native company energy — not a generic contact desk.
Be honest about MVP: some surfaces are Live, Partial, Demo, or Soon (see /transparency).
Never invent fake metrics or claim private access you don't have.
Never reveal API keys or internal credentials.`

export function detectTeam(text: string, hint?: ConnectTeam | null): ConnectTeam {
  if (hint) return hint
  const t = text.toLowerCase()
  if (/invest|vc|angel|fundrais|seed|series/.test(t)) return 'investors'
  if (/partner|integrat|co-?market|alliance/.test(t)) return 'partnerships'
  if (/enterprise|b2b|company|organization|corp/.test(t)) return 'enterprise'
  if (/bug|broken|error|support|help desk|login|password|technical/.test(t)) return 'support'
  if (/communit|creator|member|hub/.test(t)) return 'community'
  if (/hir|job|career|join.*(team|pi)|work (at|for) pi|recruit/.test(t)) return 'hiring'
  if (/press|media|podcast|interview|journalist/.test(t)) return 'media'
  return 'partnerships'
}

export function connectOfflineReply(text: string, teamHint?: ConnectTeam | null): string {
  const lower = text.toLowerCase()
  const team = detectTeam(text, teamHint)
  const teamLabel = CONNECT_TEAMS.find(t => t.id === team)?.label || 'Partnerships'

  if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower) || lower.length < 12) {
    return `Welcome — I’m Pi AI, your first point of contact. Tell me why you’re here (invest, partner, enterprise, support, community, careers, or press), and I’ll guide you. You can request Speak with a Human anytime — I’ll pass a full summary so you don’t repeat yourself.`
  }

  if (/demo|walkthrough|pitch/.test(lower)) {
    return `Open Investor Demo at /demo for the ~5 minute story (what Pi is, who it’s for, why AI is central), then /investor for the company view (vision, Twin, metrics, roadmap, architecture) plus Demo opportunity-graph search. Want a human follow-up? Tap Speak with a Human — I’ll route you (likely ${teamLabel}).`
  }

  if (/human|person|call|meeting|speak/.test(lower)) {
    return `Understood. Tap Speak with a Human below — I’ll summarize this chat and route it to ${teamLabel}. Add your name and email so the right teammate can reply with context.`
  }

  if (team === 'investors') {
    return `For investors: start with /demo (walkthrough) and /investor (company narrative + Demo deal-flow search). We prioritize traction and honest Live vs Demo labeling (/transparency). I can route you to Investors when you’re ready for a human conversation.`
  }

  if (team === 'partnerships') {
    return `For partnerships: share what you want to build with Pi (integration, distribution, co-marketing). I’ll capture intent and route to Partnerships — or keep chatting so I can guide you through the product first.`
  }

  if (team === 'enterprise') {
    return `Enterprise interest noted. Pi’s long-term path includes org-scale opportunity intelligence; today the live MVP focuses on member twin, matching, communities, and opportunities. I can route you to Enterprise with a clear summary of your needs.`
  }

  if (team === 'support') {
    return `I can help with product navigation (Matching, Twin, Communities, Messages). Describe the issue — if you need a person, Speak with a Human routes to Technical Support with this transcript attached.`
  }

  if (team === 'hiring') {
    return `Excited you’re considering Pi. Share your role focus and link (LinkedIn / GitHub / portfolio). Speak with a Human routes to Hiring & Careers with context so you don’t re-explain.`
  }

  if (team === 'media') {
    return `For press: I can outline what Pi is (AI-native opportunity ecosystem) and point to /demo + /transparency. Speak with a Human routes to Media & Press with a conversation summary.`
  }

  return `Got it — I’m routing this conversation toward ${teamLabel}. Ask anything about Pi, or tap Speak with a Human and I’ll package name, intent, and a short summary for our team.`
}

export async function askConnectAi(
  history: ChatTurn[],
  userMessage: string,
): Promise<string> {
  if (!hasGroqKey()) {
    return connectOfflineReply(userMessage)
  }
  try {
    return await askGroqWithSystem(history, userMessage, CONNECT_SYSTEM)
  } catch {
    return connectOfflineReply(userMessage)
  }
}

export function buildHandoffSummary(
  messages: ConnectMessage[],
  meta: { name: string; email: string; org: string; team: ConnectTeam; note: string },
): string {
  const teamLabel = CONNECT_TEAMS.find(t => t.id === meta.team)?.label || meta.team
  const userLines = messages.filter(m => m.role === 'user').map(m => m.text)
  const lastUser = userLines.slice(-3).join(' | ') || meta.note || '(no user messages yet)'
  return [
    `Team: ${teamLabel}`,
    `Visitor: ${meta.name || '—'} <${meta.email || '—'}>`,
    meta.org ? `Organization: ${meta.org}` : null,
    meta.note ? `Visitor note: ${meta.note}` : null,
    `Recent visitor messages: ${lastUser}`,
    `Turns: ${messages.length}`,
    'Pi AI collected this so the human conversation starts with full context.',
  ].filter(Boolean).join('\n')
}

export async function submitHandoff(input: {
  team: ConnectTeam
  visitorName: string
  visitorEmail: string
  visitorOrg: string
  intent: string
  summary: string
  transcript: ConnectMessage[]
  userId?: string | null
}): Promise<{ error?: string; id?: string; emailNote?: string }> {
  const { data, error } = await supabase
    .from('contact_handoffs')
    .insert({
      team: input.team,
      visitor_name: input.visitorName.trim() || null,
      visitor_email: input.visitorEmail.trim() || null,
      visitor_org: input.visitorOrg.trim() || null,
      intent: input.intent.trim() || null,
      summary: input.summary,
      transcript: input.transcript,
      user_id: input.userId || null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    return {
      error: error.message.includes('does not exist')
        ? 'Run supabase_contact_handoffs.sql in Supabase, then try again.'
        : error.message,
    }
  }

  // Email visitor confirmation + team alert (Resend). Non-blocking if misconfigured.
  let emailNote: string | undefined
  if (data?.id) {
    try {
      const r = await fetch('/api/handoff-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handoffId: data.id }),
      })
      const json = (await r.json().catch(() => ({}))) as {
        visitorSent?: boolean
        teamSent?: boolean
        sentTo?: string | null
        userMessage?: string
        warnings?: string[]
        error?: string
      }
      if (!r.ok) {
        emailNote = json.error || 'Email API not ready — handoff saved in team inbox.'
      } else if (json.userMessage) {
        emailNote = json.userMessage
      } else if (json.visitorSent && json.sentTo) {
        emailNote = `Confirmation emailed to ${json.sentTo}.`
      } else if (json.teamSent) {
        emailNote = 'Team was notified by email.'
      } else if (json.warnings?.length) {
        emailNote = json.warnings[0]
      }
    } catch {
      emailNote = 'Could not reach email API — handoff saved in team inbox.'
    }
  }

  return { id: data?.id, emailNote }
}
