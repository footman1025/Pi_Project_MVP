import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Copy, Check, Share2, Handshake, Shield, UserPlus, Rocket,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  inviteCodeFromProfile,
  inviteUrl,
  shareInviteLink,
} from '../lib/acquisition'
import { track } from '../lib/analytics'
import StatusBadge from '../components/StatusBadge'

/** Phase 3 market expansion hub — acquisition, partnerships, strategic discussions. */
export default function GrowPage() {
  const navigate = useNavigate()
  const { session, profile, user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [shareHint, setShareHint] = useState('')

  const code = useMemo(
    () => inviteCodeFromProfile(profile?.username, user?.id),
    [profile?.username, user?.id],
  )
  const link = inviteUrl(code)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      track('invite_share', { method: 'clipboard', from: 'grow' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShareHint('Could not copy — select the link manually')
    }
  }

  const share = async () => {
    const r = await shareInviteLink(link)
    setShareHint(r === 'shared' ? 'Shared' : r === 'copied' ? 'Link copied' : 'Share cancelled')
  }

  return (
    <div className="min-h-screen" style={{ background: '#080d1a' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(8,13,26,0.92)', backdropFilter: 'blur(16px)' }}>
        <button type="button" onClick={() => navigate(session ? '/dashboard' : '/')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-teal-400" />
          <div>
            <p className="text-white font-bold text-sm leading-none">Grow Pi</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Phase 3 · Market expansion</p>
          </div>
        </div>
        <StatusBadge kind="live" label="Acquisition · Partners · Discussions" className="ml-auto hidden sm:inline-flex" />
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
            Expand the graph — carefully
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            User acquisition, partnership density, and strategic investor conversations —
            with the same discipline: raise product value before rushing external deals.
          </p>
        </header>

        {/* Acquisition */}
        <section className="rounded-2xl border border-white/8 p-5 sm:p-6" style={{ background: 'rgba(14,20,25,0.75)' }}>
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={18} className="text-teal-400" />
            <h2 className="text-white font-bold text-lg">User acquisition</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Invite people who will activate Twin → match → communities → opportunities.
            Organic growth compounds the live graph.
          </p>

          {session ? (
            <>
              <p className="text-[11px] text-slate-500 mb-1.5">Your invite link</p>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <code className="flex-1 text-xs text-teal-200 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 break-all">
                  {link}
                </code>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => void copyLink()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 border border-white/10">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => void share()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>
              {shareHint && <p className="text-[11px] text-teal-400/80 mb-2">{shareHint}</p>}
              {!profile?.username && (
                <p className="text-[11px] text-amber-400/80">
                  Tip: set a username in profile edit for a cleaner invite code.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              Sign up to get your invite link <ArrowRight size={14} />
            </button>
          )}
        </section>

        {/* Partnerships */}
        <section className="rounded-2xl border border-white/8 p-5 sm:p-6" style={{ background: 'rgba(14,20,25,0.75)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Handshake size={18} className="text-emerald-400" />
            <h2 className="text-white font-bold text-lg">Partnerships</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Integrations, distribution, ecosystem, and enterprise pilots — routed through Meet Pi AI.
          </p>
          <button
            type="button"
            onClick={() => {
              track('grow_open_partners')
              navigate('/partners')
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-100 border border-emerald-500/30 hover:bg-emerald-500/10"
          >
            Open partnerships <ArrowRight size={14} />
          </button>
        </section>

        {/* Strategic discussions */}
        <section className="rounded-2xl border border-white/8 p-5 sm:p-6" style={{ background: 'rgba(14,20,25,0.75)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-amber-400" />
            <h2 className="text-white font-bold text-lg">Strategic investor discussions</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Prep room before human talks. Raise negotiation power with Demo, Transparency, and Traction first.
          </p>
          <button
            type="button"
            onClick={() => {
              track('grow_open_discuss')
              navigate('/discuss')
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-100 border border-amber-500/30 hover:bg-amber-500/10"
          >
            Open discussion prep <ArrowRight size={14} />
          </button>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={() => navigate('/demo')} className="text-xs text-teal-300 hover:underline">Demo</button>
          <span className="text-slate-600">·</span>
          <button type="button" onClick={() => navigate('/investor')} className="text-xs text-teal-300 hover:underline">Investor</button>
          <span className="text-slate-600">·</span>
          <button type="button" onClick={() => navigate('/transparency')} className="text-xs text-teal-300 hover:underline">Transparency</button>
          <span className="text-slate-600">·</span>
          <button type="button" onClick={() => navigate('/connect')} className="text-xs text-teal-300 hover:underline">Meet Pi AI</button>
        </div>
      </div>
    </div>
  )
}
