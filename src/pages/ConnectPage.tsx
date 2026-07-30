import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Bot, Loader2, SendHorizonal, UserRound, Sparkles, Check,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { hasGroqKey, type ChatTurn } from '../lib/groqAssistant'
import {
  CONNECT_TEAMS,
  ConnectMessage,
  ConnectTeam,
  askConnectAi,
  buildHandoffSummary,
  detectTeam,
  submitHandoff,
} from '../lib/connectAgent'
import { track } from '../lib/analytics'

const SUGGESTIONS = [
  'I’m an investor exploring Pi',
  'I want to partner with Pi',
  'Enterprise / B2B interest',
  'Show me the Investor Demo',
  'I’m interested in joining the team',
  'Press / media inquiry',
]

export default function ConnectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const groqOn = hasGroqKey()

  const initialTeam = (() => {
    const t = searchParams.get('team') as ConnectTeam | null
    return CONNECT_TEAMS.some(x => x.id === t) ? (t as ConnectTeam) : 'partnerships'
  })()
  const intentParam = searchParams.get('intent') || ''

  const [messages, setMessages] = useState<ConnectMessage[]>([
    {
      role: 'ai',
      text:
        'Welcome — I’m Pi AI, your first point of contact.\n\n' +
        'Tell me why you’re here (invest, partner, enterprise, support, community, careers, or press). ' +
        'I’ll answer, guide you through Pi, and collect only what’s needed to route you well.\n\n' +
        'At any time, tap Speak with a Human — I’ll summarize this conversation so you never repeat yourself.',
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [teamHint, setTeamHint] = useState<ConnectTeam | null>(initialTeam)
  const [humanOpen, setHumanOpen] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [email, setEmail] = useState('')
  const [org, setOrg] = useState('')
  const [note, setNote] = useState(intentParam ? `Intent: ${intentParam}` : '')
  const [team, setTeam] = useState<ConnectTeam>(initialTeam)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [emailNote, setEmailNote] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bootstrapped = useRef(false)

  useEffect(() => {
    track('connect_open', { team: initialTeam, intent: intentParam || undefined })
  }, [])

  // Deep-link from /partners or /discuss — acknowledge routing intent once
  useEffect(() => {
    if (bootstrapped.current) return
    if (!searchParams.get('team') && !intentParam) return
    bootstrapped.current = true
    const label = CONNECT_TEAMS.find(t => t.id === initialTeam)?.label || initialTeam
    setMessages(m => [
      ...m,
      {
        role: 'ai',
        text:
          `I see you’re here for ${label}` +
          (intentParam ? ` (${intentParam.replace(/-/g, ' ')})` : '') +
          '. Ask anything about Pi, or tap Speak with a Human and I’ll package context for the team.',
      },
    ])
  }, [searchParams, initialTeam, intentParam])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, humanOpen])

  // Name only — email always starts blank so the visitor types the address they want
  useEffect(() => {
    if (profile?.full_name && !name) setName(profile.full_name)
  }, [profile?.full_name])

  const send = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || typing) return

    const detected = detectTeam(trimmed, teamHint)
    setTeamHint(detected)
    setTeam(detected)

    const next: ConnectMessage[] = [...messages, { role: 'user', text: trimmed }]
    setMessages(next)
    setInput('')
    setTyping(true)
    track('connect_message', { team: detected })

    try {
      const history: ChatTurn[] = next.slice(0, -1).map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }))
      const reply = await askConnectAi(history, trimmed)
      setMessages(m => [...m, { role: 'ai', text: reply }])
    } finally {
      setTyping(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const openHuman = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')?.text || ''
    const detected = detectTeam(lastUser || note, teamHint)
    setTeam(detected)
    setHumanOpen(true)
    setDone(false)
    setError('')
    track('connect_speak_human', { team: detected })
  }

  const submitHuman = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail && !name.trim()) {
      setError('Add at least a name or email so our team can reply.')
      return
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter a valid email address (e.g. name@gmail.com).')
      return
    }
    setSending(true)
    setError('')
    const summary = buildHandoffSummary(messages, {
      name,
      email: trimmedEmail,
      org,
      team,
      note,
    })
    const res = await submitHandoff({
      team,
      visitorName: name,
      visitorEmail: trimmedEmail,
      visitorOrg: org,
      intent: note || team,
      summary,
      transcript: messages,
      userId: user?.id || null,
    })
    setSending(false)
    if (res.error) {
      setError(res.error)
      return
    }
    track('connect_handoff_submitted', { team })
    setDone(true)
    setEmailNote(res.emailNote || '')
    const emailBit = res.emailNote
      ? ` ${res.emailNote}`
      : ' A confirmation email was sent if email delivery is configured.'
    setMessages(m => [
      ...m,
      {
        role: 'ai',
        text:
          `Done — I’ve passed your context to ${CONNECT_TEAMS.find(t => t.id === team)?.label}. ` +
          'A human will continue from this summary so you don’t repeat yourself.' +
          emailBit +
          ' Meanwhile you can explore /demo or /transparency.',
      },
    ])
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#06090f' }}>
      <nav
        className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            π
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">Meet Pi AI</p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              Contact & Partnership · AI first · humans for relationships
            </p>
          </div>
        </div>
        <span className="ml-auto text-[10px] sm:text-xs px-2.5 py-1 rounded-full border border-teal-500/25 bg-teal-500/10 text-teal-300 font-semibold shrink-0">
          {groqOn ? 'AI live' : 'AI guided'}
        </span>
      </nav>

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col min-h-0">
        <div className="mb-4">
          <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-1">AI-native company</p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Every visitor meets Pi AI first
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Not a “Contact Us” form. Understand intent → guide the product → route with context.
            People become the relationship builders.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {CONNECT_TEAMS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTeamHint(t.id)
                setTeam(t.id)
                void send(`I’m here about ${t.label}: ${t.blurb}`)
              }}
              className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                teamHint === t.id
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-200'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className="flex-1 rounded-3xl border border-white/10 overflow-hidden flex flex-col min-h-[420px]"
          style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.95), rgba(8,13,26,0.98))' }}
        >
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-teal-500/20 border border-teal-500/30 text-teal-50'
                      : 'bg-white/[0.04] border border-white/10 text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <UserRound size={14} className="text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Loader2 size={14} className="animate-spin text-teal-400" /> Pi AI is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {!humanOpen && messages.length < 4 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  disabled={typing}
                  onClick={() => void send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 text-slate-400 hover:text-teal-200 hover:border-teal-500/30 disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {humanOpen ? (
            <div className="border-t border-white/10 p-4 space-y-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
              {done ? (
                <div className="text-emerald-300 text-sm py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Check size={16} /> Handoff saved to the team inbox with full conversation context.
                  </div>
                  {emailNote && <p className="text-xs text-slate-400 pl-6">{emailNote}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <UserRound size={14} className="text-teal-400" />
                    <p className="text-white text-sm font-bold">Speak with a Human</p>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Pi AI attaches a chat summary. Type any email below — confirmation goes to that address.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40"
                    />
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Type the email you want"
                      type="email"
                      autoComplete="off"
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40"
                    />
                  </div>
                  <input
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    placeholder="Organization (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40"
                  />
                  <select
                    value={team}
                    onChange={e => setTeam(e.target.value as ConnectTeam)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pi-500/40"
                  >
                    {CONNECT_TEAMS.map(t => (
                      <option key={t.id} value={t.id} className="bg-slate-900">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything else for the human? (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40 resize-none"
                  />
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setHumanOpen(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-white/10"
                    >
                      Keep chatting
                    </button>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void submitHuman()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
                      Send with context
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="border-t border-white/10 p-3 sm:p-4 space-y-2">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send(input)
                    }
                  }}
                  rows={1}
                  placeholder="Why are you here? Ask Pi AI anything…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-pi-500/40 resize-none min-h-[42px]"
                />
                <button
                  type="button"
                  disabled={typing || !input.trim()}
                  onClick={() => void send(input)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-40 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  <SendHorizonal size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={openHuman}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-teal-100 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/15"
              >
                <UserRound size={14} /> Speak with a Human
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          <button type="button" onClick={() => navigate('/demo')} className="text-teal-300 hover:underline inline-flex items-center gap-1">
            <Sparkles size={12} /> Investor Demo
          </button>
          <button type="button" onClick={() => navigate('/transparency')} className="hover:text-white">
            What’s live
          </button>
          <button type="button" onClick={() => navigate('/investor')} className="hover:text-white">
            Investor Dashboard
          </button>
          {user && (
            <button type="button" onClick={() => navigate('/handoffs')} className="hover:text-white">
              Team handoffs inbox
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
