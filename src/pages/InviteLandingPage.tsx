import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Copy, Check, UserPlus } from 'lucide-react'
import { captureInviteRef, inviteUrl } from '../lib/acquisition'
import { track } from '../lib/analytics'
import { useEffect } from 'react'
import PiLogo from '../components/PiLogo'

/** Public invite landing — captures ?ref / :code then sends visitor to signup. */
export default function InviteLandingPage() {
  const { code: pathCode = '' } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const code = useMemo(() => {
    const q = new URLSearchParams(window.location.search).get('ref') || pathCode || ''
    return q.trim().toLowerCase()
  }, [pathCode])

  useEffect(() => {
    if (code) captureInviteRef(code)
  }, [code])

  const link = code ? inviteUrl(code) : `${window.location.origin}/signup`

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-white/5">
        <button type="button" onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <PiLogo size={32} className="ring-1 ring-white/10" />
          <span className="text-white font-bold text-sm">You’re invited to Pi</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          <UserPlus size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">
          {code ? `Join via @${code}` : 'Join Pi'}
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          AI-native opportunity ecosystem — Digital Twin, ranked matching, communities, and opportunities.
          {code ? ' This invite helps us grow the live graph with people who care about the product.' : ''}
        </p>

        <button
          type="button"
          onClick={() => {
            track('invite_cta_signup', { ref: code || 'none' })
            navigate('/signup')
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-white text-sm mb-3"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          Create account <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/demo')}
          className="w-full px-5 py-3 rounded-xl text-sm font-semibold text-slate-200 border border-white/10 mb-6"
        >
          Watch Investor Demo first
        </button>

        {code && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link)
                setCopied(true)
                track('invite_link_copy', { ref: code })
                setTimeout(() => setCopied(false), 2000)
              } catch { /* ignore */ }
            }}
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-teal-300"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied invite link' : 'Copy this invite link'}
          </button>
        )}

        <p className="mt-8 text-[11px] text-slate-600">
          Phase 3 · User acquisition — organic invites, not paid acquisition theatre.
        </p>
      </div>
    </div>
  )
}
