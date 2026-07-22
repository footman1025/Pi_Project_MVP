import { useState, useRef, useEffect } from 'react'
import { X, SendHorizonal, BotMessageSquare, Sparkles } from 'lucide-react'
import { aiAssistantSuggestions } from '../data/mockData'

interface Message {
  role: 'user' | 'ai'
  text: string
}

const aiResponses: Record<string, string> = {
  default: "I'm analyzing your profile and network to find the best matches. One moment...",
  investor: "I found 12 AI investors interested in social platforms. Top match: **Sarah Chen** (95% compatibility) — angel investor focused on AI-native B2C products. Would you like an introduction?",
  profile: "Your profile is 78% complete. Adding your skills and portfolio will unlock 3x more relevant matches. Want me to suggest improvements?",
  community: "Based on your interests in AI and startups, I recommend **AI Founders Hub** (24.5k members) and **Creator Economy Lab** (18.3k members). Both are highly active this week.",
  portfolio: "I can help optimize your portfolio visibility. Enabling SEO indexing on your profile will make you discoverable to the 2.3M monthly searches for 'AI co-founder'. Enable it?",
  cofounder: "I found 8 potential technical co-founders with >90% compatibility. **Gabriel** leads at 98% — experienced engineering lead specializing in AI platforms. Want me to send an introduction?",
  competition: "The Alibaba CoCreate London Finals deadline is July 28th. You're eligible for the $200,000 prize. Your Pi pitch scores 94/100 on our readiness index. Want tips to improve it?",
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
    { role: 'ai', text: "Hi! I'm your Pi AI assistant. I can help you discover opportunities, find collaborators, grow your network, and navigate the Pi ecosystem. What would you like to explore?" }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = (text: string) => {
    if (!text.trim()) return
    setMessages(m => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { role: 'ai', text: getAiReply(text) }])
    }, 1200 + Math.random() * 600)
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-80 sm:w-96 rounded-2xl overflow-hidden shadow-2xl border border-pi-500/20 animate-slide-up"
      style={{ background: 'linear-gradient(180deg, #0d1224 0%, #080d1a 100%)', maxHeight: '520px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <BotMessageSquare size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Pi AI Assistant</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-emerald-400">Online</span>
          </div>
        </div>
        <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '320px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user'
                ? 'bg-pi-500/20 border border-pi-500/30 text-white rounded-br-sm'
                : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {typing && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-pi-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-pi-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-pi-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {aiAssistantSuggestions.slice(0, 3).map((s, i) => (
          <button key={i} onClick={() => send(s)}
            className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full bg-pi-500/10 border border-pi-500/20 text-pi-300 hover:bg-pi-500/20 transition-all whitespace-nowrap">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask Pi anything..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pi-500/40 transition-colors"
          />
          <button
            onClick={() => send(input)}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center hover:opacity-90 transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <SendHorizonal size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
