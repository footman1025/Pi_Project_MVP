import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#06090c' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>π</div>
          <span className="text-white font-bold text-2xl">Pi</span>
        </div>

        <div className="p-8 rounded-3xl border border-white/5" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}>
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pi-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Mail size={28} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We sent a password reset link to <span className="text-white font-semibold">{email}</span>.
              </p>
              <Link to="/login"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black text-white mb-1">Reset password</h1>
              <p className="text-slate-400 text-sm mb-8">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                <Link to="/login" className="text-pi-400 hover:text-pi-300 font-semibold flex items-center justify-center gap-1 transition-colors">
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
