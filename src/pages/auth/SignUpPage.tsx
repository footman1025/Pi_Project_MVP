import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react'

export default function SignUpPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) { setError(error.message); return }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden" style={{ background: '#080d1a' }}>
      {/* Background glow — same as login */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo — identical to login */}
        <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>π</div>
          <span className="text-white font-bold text-2xl">Pi</span>
        </div>

        {/* Card — identical to login */}
        <div className="p-8 rounded-3xl border border-white/5" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}>
          {success ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-black text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6">
                We sent a confirmation link to <span className="text-white font-semibold">{email}</span>.
                Click it to activate your Pi account.
              </p>
              <button onClick={() => navigate('/login')}
                className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black text-white mb-1">Create your account</h1>
              <p className="text-slate-400 text-sm mb-8">Join Pi — One Platform. Infinite Opportunities.</p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
                  <input
                    value={fullName} onChange={e => setFullName(e.target.value)} required
                    placeholder="Your full name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                      placeholder="At least 6 characters"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Sparkles size={16} /> Create Account <ArrowRight size={16} /></>
                  )}
                </button>
              </form>

              <p className="text-center text-slate-500 text-sm mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-pi-400 hover:text-pi-300 font-semibold transition-colors">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
