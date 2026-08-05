import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react'
import PiLogo from '../../components/PiLogo'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Supabase puts recovery tokens in the URL hash; getSession picks them up.
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session) {
        setReady(true)
        setChecking(false)
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && nextSession)) {
          setReady(true)
          setChecking(false)
        }
      })

      // Give hash parsing a moment; then show error if still no session
      setTimeout(async () => {
        if (cancelled) return
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (s2) {
          setReady(true)
        } else {
          setError('This reset link is invalid or has expired. Request a new one.')
        }
        setChecking(false)
      }, 800)

      return () => subscription.unsubscribe()
    }

    let unsub: (() => void) | undefined
    init().then(u => { unsub = u })
    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password should include letters and numbers.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden pi-atmosphere">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative animate-rise">
        <div className="flex items-center justify-center gap-2.5 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <PiLogo size={40} className="ring-1 ring-white/10" />
          <span className="font-display text-white font-bold text-2xl">Pi</span>
        </div>

        <div className="p-8 pi-panel">
          {checking ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-pi-500/30 border-t-pi-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Verifying reset link…</p>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl pi-mark flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-white" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-white mb-2">Password updated</h2>
              <p className="text-slate-400 text-sm mb-6">You can now sign in with your new password.</p>
              <button onClick={() => navigate('/dashboard')} className="pi-btn-primary w-full !py-3">
                Go to Dashboard
              </button>
            </div>
          ) : !ready ? (
            <div className="text-center">
              <h2 className="font-display text-2xl font-extrabold text-white mb-2">Link expired</h2>
              <p className="text-slate-400 text-sm mb-6">{error || 'Request a new password reset email.'}</p>
              <Link to="/forgot-password" className="pi-btn-primary inline-flex justify-center w-full !py-3">
                Request new link
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-pi-500/15 border border-pi-500/25 flex items-center justify-center">
                  <Lock size={18} className="text-pi-300" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-extrabold text-white">Set new password</h1>
                  <p className="text-slate-400 text-sm">Choose a strong password for your Pi account.</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 8 characters"
                    className="pi-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Repeat password"
                    className="pi-input"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="pi-btn-primary w-full !py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update password'}
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                <Link to="/login" className="text-pi-400 hover:text-pi-300 font-semibold flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
