import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowRight, ArrowLeft, Sparkles, Check, Zap, Users, Briefcase, MessageCircle } from 'lucide-react'
import { onboardingRoles, onboardingInterests, onboardingGoals } from '../data/mockData'

const steps = ['Who are you?', 'Your interests', 'Your goals', 'Your skills', 'Pi is finding your matches...', 'Your Pi is ready']

// Simulate AI-generated results based on user inputs
function buildAIResults(role: string, interests: string[], goals: string[]) {
  const matches = [
    { name: 'Gabriel', role: 'Technical Co-Founder', match: 98, reason: 'Both focused on AI-native platforms with complementary skills' },
    { name: 'Sarah Chen', role: 'Angel Investor', match: 95, reason: 'Invests in exactly the category you are building in' },
    { name: 'Michael Torres', role: 'UI/UX Designer', match: 92, reason: 'Specializes in mobile-first products at your exact stage' },
  ]

  const communities = [
    { name: 'AI Founders Hub', members: '24.5k', icon: '🤖', reason: `Matches your interest in ${interests[0] || 'AI'}` },
    { name: 'Global Startup Network', members: '61.2k', icon: '🌐', reason: `Aligned with your goal to ${(goals[0] || 'build').toLowerCase()}` },
  ]

  const opportunities = [
    { title: 'AI Startup Competition', prize: '$200,000', icon: '🏆', reason: 'Your profile scores in the top 5% of applicants' },
    { title: 'Meet 12 AI Investors', prize: 'Up to $2M', icon: '💼', reason: 'Investors focused on your exact product category' },
  ]

  const summary = `${role ? `As ${role === 'Entrepreneur' ? 'an' : 'a'} ${role}` : 'Based on your profile'} focused on ${interests.slice(0, 2).join(' and ') || 'technology and innovation'}, Pi found ${matches.length} high-compatibility connections, ${communities.length} relevant communities, and ${opportunities.length} open opportunities — all matched to your specific goals.`

  return { matches, communities, opportunities, summary }
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
  const [aiResults, setAiResults] = useState<ReturnType<typeof buildAIResults> | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const next = async () => {
    if (step === 3) {
      // Start AI generation
      setGenerating(true)
      setStep(4)

      // Save profile to DB if user is logged in
      if (user) {
        setSaving(true)
        const skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean)
        const aiSummary = buildAIResults(role, interests, goals).summary
        await supabase.from('profiles').update({
          role,
          interests,
          goals,
          skills: skillsArr,
          ai_summary: aiSummary,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)
        await refreshProfile()
        setSaving(false)
      }

      // Simulate AI processing time
      setTimeout(() => {
        setAiResults(buildAIResults(role, interests, goals))
        setGenerating(false)
        setStep(5)
      }, 2800)
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ background: '#06090c' }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #14b8a6 0%, transparent 70%)' }} />
      </div>

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xl"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
        <span className="text-white font-bold text-2xl">Pi</span>
      </div>

      {/* Progress bar */}
      {step < 4 && (
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Step {step + 1} of 4</span>
            <span>{steps[step]}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / 4) * 100}%`, background: 'linear-gradient(90deg, #14b8a6, #0d9488)' }} />
          </div>
        </div>
      )}

      <div className="w-full max-w-md">

        {/* Step 0: Role */}
        {step === 0 && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-extrabold text-white mb-2">Who are you?</h2>
            <p className="text-slate-400 mb-8">Pi uses this to personalize your matches and recommendations.</p>
            <div className="grid grid-cols-2 gap-3">
              {onboardingRoles.map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`p-4 rounded-2xl border text-left text-sm font-semibold transition-all duration-200 hover:scale-105
                    ${role === r ? 'border-pi-500/60 bg-pi-500/15 text-pi-300' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                  {r === 'Entrepreneur' && '🚀 '}
                  {r === 'Software Engineer' && '💻 '}
                  {r === 'Content Creator' && '✨ '}
                  {r === 'Student' && '🎓 '}
                  {r === 'Investor' && '💰 '}
                  {r === 'Designer' && '🎨 '}
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Interests */}
        {step === 1 && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-extrabold text-white mb-2">Your interests</h2>
            <p className="text-slate-400 mb-8">Pi maps these to people and communities you'll genuinely connect with.</p>
            <div className="flex flex-wrap gap-3">
              {onboardingInterests.map(item => {
                const selected = interests.includes(item)
                return (
                  <button key={item} onClick={() => toggleItem(interests, setInterests, item)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200
                      ${selected ? 'border-pi-500/60 bg-pi-500/15 text-pi-300' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                    {selected && <Check size={12} className="inline mr-1" />}{item}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-extrabold text-white mb-2">Your goals</h2>
            <p className="text-slate-400 mb-8">Pi uses these to surface the opportunities that actually matter to you.</p>
            <div className="space-y-3">
              {onboardingGoals.map(g => {
                const selected = goals.includes(g)
                return (
                  <button key={g} onClick={() => toggleItem(goals, setGoals, g)}
                    className={`w-full px-5 py-3.5 rounded-2xl border text-left text-sm font-medium transition-all flex items-center gap-3
                      ${selected ? 'border-pi-500/60 bg-pi-500/15 text-pi-300' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-pi-500 border-pi-500' : 'border-slate-600'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </span>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-extrabold text-white mb-2">Your skills</h2>
            <p className="text-slate-400 mb-8">Pi uses your skills to match you with complementary collaborators.</p>
            <textarea
              value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="e.g. Product strategy, React, fundraising, content creation..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/40 resize-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-2">Separate with commas · You can always update this later</p>
          </div>
        )}

        {/* Step 4: Generating */}
        {step === 4 && generating && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
              <Sparkles size={36} className="text-white animate-pulse" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3">Pi Intelligence is working...</h2>
            <p className="text-slate-400 mb-8 text-sm">Analyzing your profile and scanning the Pi network for the best matches.</p>
            <div className="space-y-3 text-left max-w-sm mx-auto">
              {[
                { label: 'Mapping your interests and goals...', delay: 0 },
                { label: 'Scanning 284k+ Pi profiles for matches...', delay: 400 },
                { label: 'Finding communities aligned with your vision...', delay: 900 },
                { label: 'Surfacing opportunities matched to your goals...', delay: 1400 },
                { label: 'Generating your personalized AI summary...', delay: 1900 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 bg-white/3 animate-fade-in"
                  style={{ animationDelay: `${item.delay}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-pi-400 animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 200}ms` }} />
                  <span className="text-sm text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: AI Results — the key screen */}
        {step === 5 && aiResults && (
          <div className="animate-slide-up w-full max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-extrabold text-3xl"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
                π
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2">Your Pi is ready 🎉</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">{aiResults.summary}</p>
            </div>

            {/* What Pi found */}
            <div className="space-y-4 mb-8">

              {/* Matches found */}
              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pi-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Top people Pi matched you with</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Demo</span>
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
                      <span className="text-xs font-extrabold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #5eead4, #ff9b6a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {m.match}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communities found */}
              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Communities matched to your interests</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Demo</span>
                </div>
                <div className="space-y-2">
                  {aiResults.communities.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold">{c.name} <span className="text-slate-500 font-normal">· {c.members} members</span></p>
                        <p className="text-slate-500 text-xs truncate">{c.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities found */}
              <div className="p-4 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={14} className="text-white" />
                  </div>
                  <p className="text-white font-bold text-sm">Open opportunities for you</p>
                  <span className="ml-auto text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Demo</span>
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

            {/* AI summary */}
            <div className="p-4 rounded-2xl border border-pi-500/20 mb-8" style={{ background: 'rgba(20,184,166,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-pi-400" />
                <span className="text-pi-300 text-xs font-bold uppercase tracking-wider">Your Pi Intelligence Summary</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic">"{aiResults.summary}"</p>
            </div>

            {/* CTA */}
            <button onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 0 40px rgba(20,184,166,0.4)' }}>
              {user ? 'Enter Your Dashboard' : 'Create Your Account to See More'}
              <ArrowRight size={20} />
            </button>
            {!user && (
              <p className="text-center text-slate-500 text-sm mt-4">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="text-pi-400 hover:text-pi-300 font-semibold transition-colors">Sign in</button>
              </p>
            )}
          </div>
        )}

        {/* Nav buttons (steps 0–3 only) */}
        {step < 4 && (
          <div className="flex items-center gap-4 mt-10">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium">
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button onClick={next} disabled={!canNext()}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              {step === 3 ? (
                <><Sparkles size={16} /> Find My Matches</>
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
