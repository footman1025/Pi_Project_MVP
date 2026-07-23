import { useState, useRef, useEffect } from 'react'
import { X, SendHorizonal, Sparkles, Minimize2 } from 'lucide-react'
import { aiAssistantSuggestions } from '../data/mockData'

interface Message {
  role: 'user' | 'ai'
  text: string
}

const aiResponses: Record<string, string> = {
  default: "I'm analyzing your profile and network to find the best matches. One moment...",
  investor: "I found 12 AI investors interested in social platforms. Top match: Sarah Chen (95% compatibility) — angel investor focused on AI-native B2C products. Would you like an introduction?",
  profile: "Your profile is 78% complete. Adding your skills and portfolio will unlock more relevant matches. Want me to suggest improvements?",
  community: "Based on your interests in AI and startups, I recommend AI Founders Hub and Creator Economy Lab. Both are highly active this week.",
  portfolio: "I can help optimize your portfolio visibility. Enabling SEO indexing on your public profile makes you discoverable for searches like “AI co-founder”. Want to review your profile?",
  cofounder: "I found potential technical co-founders with strong compatibility. Gabriel leads the list — engineering lead specializing in AI platforms. Want me to draft an introduction?",
  competition: "The Alibaba CoCreate London Finals deadline is approaching. Your pitch readiness looks strong. Want tips to improve it?",
}

function getAiReply(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('investor')) return aiResponses.investor
  if (lower.includes('profile')) return aiResponses.profile
  if (lower.includes('communit')) return aiResponses.community
  if (lower.includes('portfolio')) return aiResponses.portfolio
  if (lower.includes('co-founder') || lower.includes('cofounder') || lower.includes('technical')) return aiResponses.cofounder
  if (lower.includes('competition') || lower.includes('startup')) return aiResponses.competition
  return aiResponses.default
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function AiAssistant({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: "Hi — I'm your Pi AI assistant. I can help you find collaborators, opportunities, communities, and next steps on Pi. What should we explore?",
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  const send = (text: string) => {
    if (!text.trim() || typing) return
    setMessages(m => [...m, { role: 'user', text: text.trim() }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { role: 'ai', text: getAiReply(text) }])
    }, 900 + Math.random() * 500)
  }

  if (!open) return null

  const showSuggestions = messages.length <= 2 && !typing

  return (
    <div
      className="fixed z-50 flex flex-col w-[min(100vw-1.5rem,380px)] rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-slide-up"
      style={{
        right: 'max(0.75rem, env(safe-area-inset-right))',
        bottom: 'max(5.5rem, calc(env(safe-area-inset-bottom) + 5.25rem))',
        maxHeight: 'min(560px, calc(100dvh - 7rem))',
        background: 'linear-gradient(165deg, #0f1724 0%, #0a101c 55%, #080d16 100%)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.12)',
      }}
    >
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3 flex-shrink-0">
        <div
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{ background: 'radial-gradient(120% 80% at 0% 0%, rgba(20,184,166,0.18), transparent 55%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 8px 24px rgba(20,184,166,0.35)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm tracking-tight">Pi AI Assistant</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400/90 font-medium">Online · ready to help</span>
            </div>
          </div>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3.5 min-h-0" style={{ maxHeight: 280 }}>
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
              className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-2xl rounded-br-md'
                  : 'text-slate-200 rounded-2xl rounded-bl-md border border-white/[0.07]'
              }`}
              style={
                msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }
                  : { background: 'rgba(255,255,255,0.04)' }
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
            <div className="px-3.5 py-3 rounded-2xl rounded-bl-md border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.04)' }}>
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

      {/* Composer block */}
      <div className="flex-shrink-0 border-t border-white/[0.06] px-3 pt-3 pb-3"
        style={{ background: 'rgba(0,0,0,0.22)' }}>
        {showSuggestions && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
              Try asking
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {aiAssistantSuggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-white/[0.08] text-slate-300 hover:text-white hover:border-teal-500/35 hover:bg-teal-500/10 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] pl-3.5 pr-1.5 py-1.5 focus-within:border-teal-500/40 transition-colors"
          onSubmit={e => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Pi anything…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0 py-2"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-35 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            aria-label="Send"
          >
            <SendHorizonal size={15} />
          </button>
        </form>
        <p className="text-[10px] text-slate-600 text-center mt-2 flex items-center justify-center gap-1">
          <Minimize2 size={10} /> Demo replies · not a live model yet
        </p>
      </div>
    </div>
  )
}
