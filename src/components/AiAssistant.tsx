import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, SendHorizonal, Sparkles, RotateCcw, BotMessageSquare, Shield } from 'lucide-react'
import { aiAssistantSuggestions } from '../data/mockData'
import { useAuth } from '../contexts/AuthContext'
import { askGroqAssistant, hasGroqKey, type ChatTurn } from '../lib/groqAssistant'
import { companionTone, loadUgePreferences } from '../lib/ugePreferences'

interface Message {
  role: 'user' | 'ai'
  text: string
}

/** Offline / no-key fallback */
function getAiReply(text: string, displayName: string): string {
  const lower = text.toLowerCase()
  const name = displayName || 'there'

  if (/\b(hi|hello|hey|good morning|good evening)\b/.test(lower)) {
    return `Hi ${name}! I can help with matches, communities, opportunities, your profile, or Investor Demo Mode. What would you like to explore?`
  }

  if (lower.includes('investor') || lower.includes('funding') || lower.includes('angel') || lower.includes('vc')) {
    return `Top demo matches for investor outreach: Giulia Conti (95% — AI-native scientific founder), plus several angels focused on deep-tech platforms. Open Matching or Investor Demo to review fit reasons and request an intro path.`
  }

  if (lower.includes('match') || lower.includes('collaborat') || lower.includes('connect') || lower.includes('people')) {
    return `Pi Intelligence ranks people by skills, goals, and overlap — not vanity metrics. Open Matching to see live ranked profiles with “Why this match?” explanations. Demo data fills gaps until more members join.`
  }

  if (lower.includes('profile') || lower.includes('twin') || lower.includes('bio')) {
    return `Your Digital Twin gets sharper as you add skills, goals, and experience. Visit AI Twin or Edit Profile to improve match quality — a complete twin is the fastest way to better recommendations.`
  }

  if (lower.includes('communit')) {
    return `Based on AI/startup interests, start with AI Founders Hub and Creator Economy Lab. Open Communities to join discussions and grow your opportunity graph.`
  }

  if (lower.includes('portfolio') || lower.includes('seo') || lower.includes('visibility')) {
    return `Public profiles are SEO-indexed on Pi. Keep your bio, skills, and username clear so searches like “AI co-founder” can find you. Review your public profile page to verify meta tags and structure.`
  }

  if (lower.includes('co-founder') || lower.includes('cofounder') || lower.includes('technical') || lower.includes('engineer')) {
    return `For a technical co-founder, Matching surfaces engineers with AI-platform overlap and shared goals. Open Matching, expand “Why this match?”, then Message a top candidate directly.`
  }

  if (lower.includes('opportunit') || lower.includes('job') || lower.includes('competition') || lower.includes('startup') || lower.includes('grant')) {
    return `Opportunity Intelligence scores fits against your twin. Open Opportunities for competitions, collaborations, and funding-style listings — each card explains why it matches you.`
  }

  if (lower.includes('demo') || lower.includes('investor demo') || lower.includes('pitch')) {
    return `Investor Demo Mode walks through Digital Twin → matches → opportunities in minutes. Open it from the sidebar or /demo — designed so first-time visitors grasp Pi’s category quickly.`
  }

  if (lower.includes('help') || lower.includes('what can') || lower.includes('how do')) {
    return `I can guide you to Matching, Opportunities, Communities, AI Twin, Messages, and Investor Demo. Ask something specific — e.g. “find investors”, “improve my profile”, or “recommend communities”.`
  }

  return `Got it. On Pi, the next best moves are usually: (1) strengthen your AI Twin on Edit Profile, (2) review Matching for ranked people + reasons, (3) check Opportunities for actionable fits. Tell me which of those you want, or ask about investors, communities, or co-founders.`
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function AiAssistant({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'
  const groqEnabled = hasGroqKey()
  const lifeStage =
    (profile?.uge_preferences?.lifeStage as ReturnType<typeof loadUgePreferences>['lifeStage'] | undefined)
    || loadUgePreferences().lifeStage
  const tone = companionTone(lifeStage || 'auto')

  const welcomeText = groqEnabled
    ? `Hi ${displayName} — I'm your Pi AI assistant (powered by Groq). ${tone} Ask about Matching, Opportunities, your Twin, Feed, Trust, or how to use Pi.`
    : `Hi ${displayName} — I'm your Pi AI assistant. ${tone} Add a Groq API key for live answers, or ask about matches, opportunities, and next steps.`

  const [messages, setMessages] = useState<Message[]>([{ role: 'ai', text: welcomeText }])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const welcomeRef = useRef(welcomeText)
  welcomeRef.current = welcomeText

  const resetChat = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setTyping(false)
    setInput('')
    setMessages([{ role: 'ai', text: welcomeRef.current }])
    setTimeout(() => inputRef.current?.focus(), 80)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      abortRef.current = null
      setTyping(false)
    }
  }, [open])

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const nextMessages: Message[] = [...messages, { role: 'user', text: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setTyping(true)

    try {
      let reply: string
      if (hasGroqKey()) {
        const history: ChatTurn[] = nextMessages
          .slice(0, -1)
          .filter(m => m.text)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          }))

        reply = await askGroqAssistant(history, trimmed, {
          displayName,
          role: profile?.role,
          skills: profile?.skills,
          goals: profile?.goals,
        })
      } else {
        await new Promise(r => setTimeout(r, 500))
        reply = getAiReply(trimmed, displayName)
      }

      setMessages(m => [...m, { role: 'ai', text: reply }])
    } catch (e: unknown) {
      let msg = 'Something went wrong.'
      if (e instanceof Error) msg = e.message
      else if (typeof e === 'string') msg = e
      else if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        msg = (e as { message: string }).message
      }
      setMessages(m => [
        ...m,
        {
          role: 'ai',
          text: `I couldn’t reach Groq just now. ${msg}`,
        },
      ])
    } finally {
      setTyping(false)
    }
  }

  if (!open) return null

  const showSuggestions = messages.length <= 3 && !typing

  const quickLinks = [
    { label: 'Matching', to: '/match' },
    { label: 'Opportunities', to: '/opportunities' },
    { label: 'AI Twin', to: '/twin' },
    { label: 'Investor Demo', to: '/demo' },
  ]

  return (
    <div
      className="fixed z-50 flex flex-col w-[min(100vw-1.5rem,380px)] rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl animate-slide-up"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 5.25rem))',
        maxHeight: 'min(580px, calc(100dvh - 7rem))',
        background: 'linear-gradient(165deg, rgba(14,22,36,0.98) 0%, rgba(8,12,20,0.99) 55%, #06090f 100%)',
        boxShadow: '0 28px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.14), 0 0 48px rgba(20,184,166,0.08)',
      }}
    >
      <div className="relative px-4 pt-4 pb-3 flex-shrink-0 border-b border-white/[0.05]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(120% 90% at 10% 0%, rgba(20,184,166,0.22), transparent 55%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 8px 24px rgba(20,184,166,0.35)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/80 mb-0.5">Companion</p>
            <p className="text-white font-bold text-sm tracking-tight leading-tight">Pi AI Assistant</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400/90 font-medium">
                {groqEnabled ? 'Online · Groq AI' : 'Online · guided replies'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={resetChat}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-200 hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20 transition-colors"
            aria-label="New chat"
            title="New chat"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close assistant"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 min-h-0" style={{ maxHeight: 280 }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}
              >
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'text-white rounded-2xl rounded-br-md'
                  : 'text-slate-200 rounded-2xl rounded-bl-md border border-white/[0.07]'
              }`}
              style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
                  : { background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}
            >
              <Sparkles size={12} className="text-white" />
            </div>
            <div
              className="px-3.5 py-3 rounded-2xl rounded-bl-md border border-white/[0.07]"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
            >
              <div className="flex gap-1.5">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-teal-400/80 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="flex-shrink-0 border-t border-white/[0.06] px-3 pt-3 pb-3"
        style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.5), rgba(6,9,15,0.95))' }}
      >
        {showSuggestions && (
          <div className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 px-1 mb-2">
              Try asking
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {aiAssistantSuggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={typing}
                  onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-white/[0.07] text-slate-300 hover:text-white hover:border-teal-500/35 hover:bg-teal-500/[0.08] transition-all disabled:opacity-50"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-0.5">
          {quickLinks.map(l => (
            <button
              key={l.to}
              type="button"
              onClick={() => { onClose(); navigate(l.to) }}
              className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-teal-500/25 text-teal-300 bg-teal-500/[0.08] hover:bg-teal-500/15"
            >
              {l.label}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 pl-3.5 pr-1.5 py-1.5 focus-within:border-teal-500/40 transition-colors"
          onSubmit={e => {
            e.preventDefault()
            void send(input)
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Pi anything…"
            disabled={typing}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0 py-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-35 transition-all hover:brightness-110 active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            aria-label="Send"
          >
            <SendHorizonal size={15} />
          </button>
        </form>

        {/* Footer: status left + actions in circled bottom-right area */}
        <div className="mt-2.5 flex items-center gap-2 min-w-0">
          <p className="text-[10px] text-slate-600 truncate flex-1 min-w-0">
            {groqEnabled ? 'Groq AI · site-aware answers' : 'Guided mode · add Groq for live AI'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-slate-400 border border-white/10 hover:text-white hover:border-white/20"
              title="Start a new chat"
            >
              <RotateCcw size={10} />
              New
            </button>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/connect') }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
              title="Meet Pi AI / human handoff"
            >
              <BotMessageSquare size={10} />
              Meet Pi
            </button>
            <button
              type="button"
              onClick={() => { onClose(); navigate('/trust') }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 border border-white/10 hover:text-teal-200 hover:border-teal-500/25"
              title="Trust & Safety"
              aria-label="Trust & Safety"
            >
              <Shield size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
