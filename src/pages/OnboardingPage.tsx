import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowRight, ArrowLeft, Sparkles, Check, Users, Briefcase, MessageCircle } from 'lucide-react'
import { onboardingRoles, onboardingInterests, onboardingGoals } from '../data/mockData'
import { buildOnboardingPreview } from '../lib/aiSummary'
import { track } from '../lib/analytics'

const steps = [
  'What best describes you?',
  'What are you into?',
  'What are you aiming for?',
  'What are you great at?',
  'Building your Pi…',
  'You’re in',
]

const roleEmoji: Record<string, string> = {
  Entrepreneur: '🚀',
  'Software Engineer': '💻',
  'Content Creator': '✨',
  Student: '🎓',
  Investor: '💰',
  Designer: '🎨',
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [skills, setSkills] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiResults, setAiResults] = useState<ReturnType<typeof buildOnboardingPreview> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const next = async () => {
    setError('')
    track('onboarding_step', { step, role: role || undefined })

    if (step === 3) {
      setGenerating(true)
      setStep(4)
      const skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean)
      const preview = buildOnboardingPreview(role, interests, goals, skillsArr)

      if (user) {
        setSaving(true)
        const { error: saveError } = await supabase.from('profiles').update({
          role,
          interests,
          goals,
          skills: skillsArr,
          ai_summary: preview.summary,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)

        if (saveError) {
          setError(saveError.message || 'Could not save your profile. You can continue and edit later.')
        } else {
          await refreshProfile()
          track('profile_generated', { role, interests: interests.length, goals: goals.length, skills: skillsArr.length })
        }
        setSaving(false)
      }

      setTimeout(() => {
        setAiResults(preview)
        setGenerating(false)
        setStep(5)
        track('onboarding_complete', { authenticated: !!user })
      }, 2200)
    } else {
      setStep(s => s + 1)
    }
  }

  const canNext = () => {
    if (step === 0) return role !== ''
    if (step === 1) return interests.length > 0
    if (step === 2) return goals.length > 0
    return true
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 py-10 sm:py-12 relative overflow-hidden"
      style={{ background: '#06090c' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />
      </div>

      <div className="flex items-center gap-2 mb-8 sm:mb-10 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xl"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
        <span className="text-white font-bold text-2xl">Pi</span>
      </div>

      {step < 4 && (
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Step {step + 1} of 4</span>
            <span className="truncate ml-2 text-right">{steps[step]}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / 4) * 100}%`, background: 'linear-gradient(90deg, #14b8a6, #0d9488)' }} />
          </div>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            Pi builds one intelligent profile from your role, interests, goals, and skills — then recommends people, communities, and opportunities that fit.
          </p>
        </div>
      )}

      <div className="w-full max-w-md">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        {step === 0 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">What best describes you?</h2>
            <p className="text-slate-400 mb-8 text-sm sm:text-base">This shapes how Pi introduces you and who you meet first.</p>
            <div className="grid grid-cols-2 gap-3">
              {onboardingRoles.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all duration-200 hover:scale-[1.02]
                    ${role === r ? 'border-teal-500/60 bg-teal-500/15 text-teal-200' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                  {roleEmoji[r] ? `${roleEmoji[r]} ` : ''}{r}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">What are you into?</h2>
            <p className="text-slate-400 mb-8 text-sm sm:text-base">Pick a few topics — Pi maps them to people and communities.</p>
            <div className="flex flex-wrap gap-3">
              {onboardingInterests.map(item => {
                const selected = interests.includes(item)
                return (
                  <button key={item} onClick={() => toggleItem(interests, setInterests, item)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200
                      ${selected ? 'border-teal-500/60 bg-teal-500/15 text-teal-200' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                    {selected && <Check size={12} className="inline mr-1" />}{item}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">What are you aiming for?</h2>
            <p className="text-slate-400 mb-8 text-sm sm:text-base">Pi uses your goals to prioritize the next best actions.</p>
            <div className="space-y-3">
              {onboardingGoals.map(g => {
                const selected = goals.includes(g)
                return (
                  <button key={g} onClick={() => toggleItem(goals, setGoals, g)}
                    className={`w-full px-5 py-3.5 rounded-2xl border text-left text-sm font-medium transition-all flex items-center gap-3
                      ${selected ? 'border-teal-500/60 bg-teal-500/15 text-teal-200' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-teal-500 border-teal-500' : 'border-slate-600'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </span>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">What are you great at?</h2>
            <p className="text-slate-400 mb-6 text-sm sm:text-base">Optional — but skills make matches noticeably better.</p>
            <textarea
              value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="e.g. Product strategy, React, fundraising, content creation..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500/40 resize-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">Separate with commas · You can skip and add these later in Edit Profile</p>
          </div>
        )}

        {step === 4 && generating && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
              <Sparkles size={36} className="text-white animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">Building your Pi…</h2>
            <p className="text-slate-400 mb-8 text-sm">
              {saving ? 'Saving your profile and crafting a personalized summary.' : 'Crafting a personalized summary from what you shared.'}
            </p>
            <div className="space-y-3 text-left max-w-sm mx-auto">
              {[
                { label: 'Mapping your role, interests, and goals…', delay: 0 },
                { label: 'Finding complementary collaborators…', delay: 400 },
                { label: 'Suggesting communities that fit…', delay: 900 },
                { label: 'Writing your Pi Intelligence summary…', delay: 1400 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/3 animate-fade-in"
                  style={{ animationDelay: `${item.delay}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse flex-shrink-0" />
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && aiResults && (
          <div className="animate-slide-up w-full max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-3xl"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
                π
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">You’re in</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">{aiResults.summary}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">People Pi would match next</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Preview</span>
                </div>
                <div className="space-y-2">
                  {aiResults.matches.map((m, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{m.name} <span className="text-slate-500 font-normal">· {m.role}</span></p>
                        <p className="text-slate-500 text-xs truncate">{m.reason}</p>
                      </div>
                      <span className="text-xs font-extrabold text-teal-300 flex-shrink-0">{m.match}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Communities for your interests</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Preview</span>
                </div>
                <div className="space-y-2">
                  {aiResults.communities.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{c.name} <span className="text-slate-500 font-normal">· {c.members}</span></p>
                        <p className="text-slate-500 text-xs truncate">{c.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Opportunities to explore</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Preview</span>
                </div>
                <div className="space-y-2">
                  {aiResults.opportunities.map((o, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{o.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{o.title} <span className="text-emerald-400 font-normal">· {o.prize}</span></p>
                        <p className="text-slate-500 text-xs truncate">{o.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-teal-500/20 mb-8" style={{ background: 'rgba(20,184,166,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-teal-400" />
                <span className="text-teal-300 text-xs font-bold uppercase tracking-wider">Your Pi Intelligence Summary</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{aiResults.summary}</p>
            </div>

            <button
              onClick={() => {
                track('onboarding_cta', { destination: user ? 'dashboard' : 'signup' })
                navigate(user ? '/dashboard' : '/signup')
              }}
              className="w-full py-4 rounded-2xl font-bold text-white text-base sm:text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.35)' }}>
              {user ? 'Go to dashboard' : 'Create account to unlock matches'}
              <ArrowRight size={20} />
            </button>
            {!user && (
              <p className="text-center text-slate-500 text-sm mt-4">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">Sign in</button>
              </p>
            )}
          </div>
        )}

        {step < 4 && (
          <div className="flex items-center gap-3 sm:gap-4 mt-10">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium">
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button onClick={next} disabled={!canNext()}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              {step === 3 ? (
                <><Sparkles size={16} /> Build my Pi</>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
