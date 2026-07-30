import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Experience } from '../lib/supabase'
import {
  Check, Sparkles, User, MapPin, Globe2, Briefcase,
  Plus, Trash2, Building2, CalendarDays, Camera, Loader2
} from 'lucide-react'
import { onboardingRoles, onboardingInterests, onboardingGoals } from '../data/mockData'
import { normalizeUsername } from '../lib/posts'
import { uploadAvatar } from '../lib/avatarUpload'
import UserAvatar from '../components/UserAvatar'
import { buildProfileSummary } from '../lib/aiSummary'
import { isValidWebsite, normalizeWebsite } from '../lib/validation'
import { track } from '../lib/analytics'

const emptyExp = (): Experience => ({
  id: crypto.randomUUID(),
  title: '',
  company: '',
  start_date: '',
  end_date: '',
  description: '',
})

export default function ProfileEditPage() {
  const { profile, refreshProfile, user } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [skills, setSkills] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setRole(profile.role || '')
      setLocation(profile.location || '')
      setWebsite(profile.website || '')
      setSkills((profile.skills || []).join(', '))
      setInterests(profile.interests || [])
      setGoals(profile.goals || [])
      setExperience(profile.experience || [])
      setAiSummary(profile.ai_summary || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile])

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setError('')
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(user.id, file)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (updateError) throw new Error(updateError.message)
      setAvatarUrl(url)
      await refreshProfile()
    } catch (err: any) {
      setError(err?.message || 'Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const addExperience = () => setExperience(e => [...e, emptyExp()])
  const removeExperience = (id: string) => setExperience(e => e.filter(x => x.id !== id))
  const updateExperience = (id: string, field: keyof Experience, value: string) => {
    setExperience(e => e.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  const generateAISummary = async () => {
    setGeneratingAI(true)
    await new Promise(r => setTimeout(r, 1200))
    const skillsList = skills.split(',').map(s => s.trim()).filter(Boolean)
    const summary = buildProfileSummary({
      fullName,
      role,
      interests,
      goals,
      skills: skillsList,
      experience,
    })
    setAiSummary(summary)
    setGeneratingAI(false)
    track('ai_summary_generated', { role: role || undefined, skills: skillsList.length })
  }

  const handleSave = async () => {
    if (!user) return
    setError('')
    setSaving(true)
    const skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean)
    const nick = normalizeUsername(username)
    if (!nick) {
      setError('Please choose a nickname (letters, numbers, underscore).')
      setSaving(false)
      return
    }
    if (!isValidWebsite(website)) {
      setError('Please enter a valid website URL (e.g. yoursite.com).')
      setSaving(false)
      return
    }
    const payload = {
      full_name: fullName.trim(),
      username: nick,
      bio,
      role,
      location,
      website: website.trim() ? normalizeWebsite(website) : '',
      skills: skillsArr,
      interests,
      goals,
      experience,
      ai_summary: aiSummary,
      updated_at: new Date().toISOString(),
    }
    let { error } = await supabase.from('profiles').update(payload).eq('id', user.id)

    // Older DBs may be missing the experience column — save the rest without it
    if (error && /experience/i.test(error.message) && /schema cache|column/i.test(error.message)) {
      const { experience: _omit, ...withoutExperience } = payload
      ;({ error } = await supabase.from('profiles').update(withoutExperience).eq('id', user.id))
    }

    setSaving(false)
    if (error) { setError(error.message); return }
    await refreshProfile()
    track('profile_saved', { has_summary: !!aiSummary, skills: skillsArr.length })
    if (role && (skillsArr.length + interests.length + goals.length >= 3 || bio.trim().length > 20)) {
      track('profile_complete', { skills: skillsArr.length, interests: interests.length, goals: goals.length })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const field =
    'w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500/40 transition-colors'
  const fieldSm =
    'w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500/40 transition-colors'
  const label = 'text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 block mb-1.5'
  const panel =
    'relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6'
  const panelBg = { background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-3xl mx-auto w-full min-w-0">
        <header className="mb-6 sm:mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                <User size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                  Twin signals
                </p>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Edit Profile
                </h1>
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed pl-[52px] max-w-md">
              Stronger profile → better Matching, Opportunities, and Digital Twin quality.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> :
              saved ? <><Check size={15} /> Saved</> : 'Save changes'}
          </button>
        </header>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-3.5">
          {/* Basic info */}
          <section className={panel} style={panelBg}>
            <div
              className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-15 blur-2xl"
              style={{ background: '#14b8a6' }}
            />
            <div className="relative flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
                <User size={15} />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Basic info</h2>
                <p className="text-slate-500 text-[11px]">Identity and public presence</p>
              </div>
            </div>

            <div className="relative flex items-center gap-4 mb-5 pb-5 border-b border-white/[0.06]">
              <div className="relative">
                <UserAvatar
                  url={avatarUrl}
                  name={fullName || username}
                  id={user?.id}
                  size={80}
                  rounded="rounded-2xl"
                />
                {uploadingAvatar && (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm mb-1">Profile photo</p>
                <p className="text-slate-500 text-xs mb-3">JPG, PNG, WEBP or GIF · max 2 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
                <button
                  type="button"
                  disabled={uploadingAvatar || !user}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                >
                  <Camera size={15} />
                  {uploadingAvatar ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
              </div>
            </div>

            <div className="relative grid md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className={field} />
              </div>
              <div>
                <label className={label}>Nickname</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(normalizeUsername(e.target.value))}
                    placeholder="your_nickname"
                    className={`${field} pl-8`}
                  />
                </div>
                <p className="text-slate-600 text-xs mt-1">Public URL: /p/{username || 'nickname'}</p>
              </div>
              <div>
                <label className={label}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className={field}>
                  <option value="">Select your role</option>
                  {onboardingRoles.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  placeholder="Tell the world about yourself..."
                  className={`${field} resize-none`} />
              </div>
              <div>
                <label className={`${label} flex items-center gap-1`}><MapPin size={11} /> Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className={field} />
              </div>
              <div>
                <label className={`${label} flex items-center gap-1`}><Globe2 size={11} /> Website</label>
                <input value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="linkedin.com/in/you or yoursite.com" className={field} />
              </div>
            </div>
          </section>

          {/* Experience */}
          <section className={panel} style={panelBg}>
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
                  <Building2 size={15} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Experience</h2>
                  <p className="text-slate-500 text-[11px]">Roles that strengthen your Twin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addExperience}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
              >
                <Plus size={13} /> Add
              </button>
            </div>

            {experience.length === 0 ? (
              <div className="text-center py-7 border border-dashed border-white/10 rounded-xl bg-black/20">
                <Building2 size={28} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No experience added yet.</p>
                <button
                  type="button"
                  onClick={addExperience}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
                >
                  <Plus size={13} /> Add your first experience
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {experience.map((exp, i) => (
                  <div key={exp.id} className="p-4 rounded-xl border border-white/[0.06] bg-black/25 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.12em]">Experience {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExperience(exp.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Job title *</label>
                        <input value={exp.title} onChange={e => updateExperience(exp.id, 'title', e.target.value)}
                          placeholder="e.g. Software Engineer" className={fieldSm} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Company *</label>
                        <input value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)}
                          placeholder="e.g. Google" className={fieldSm} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                          <CalendarDays size={10} /> Start date
                        </label>
                        <input type="month" value={exp.start_date} onChange={e => updateExperience(exp.id, 'start_date', e.target.value)}
                          className={fieldSm} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                          <CalendarDays size={10} /> End date
                        </label>
                        <input type="month" value={exp.end_date} onChange={e => updateExperience(exp.id, 'end_date', e.target.value)}
                          className={fieldSm} />
                        {!exp.end_date && exp.start_date && (
                          <p className="text-xs text-emerald-400 mt-1">Currently working here</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Description</label>
                        <textarea value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)}
                          placeholder="What did you do in this role?" rows={2}
                          className={`${fieldSm} resize-none`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Skills */}
          <section className={panel} style={panelBg}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
                <Briefcase size={15} />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Skills</h2>
                <p className="text-slate-500 text-[11px]">Comma-separated · powers match ranking</p>
              </div>
            </div>
            <input value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="React, Python, AI, Product Strategy, Fundraising…"
              className={field} />
          </section>

          {/* Interests */}
          <section className={panel} style={panelBg}>
            <h2 className="text-white font-bold text-sm mb-1">Interests</h2>
            <p className="text-slate-500 text-[11px] mb-4">Select what you care about</p>
            <div className="flex flex-wrap gap-2">
              {onboardingInterests.map(item => {
                const selected = interests.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(interests, setInterests, item)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                      selected
                        ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                        : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {selected && <Check size={12} className="inline mr-1" />}{item}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Goals */}
          <section className={panel} style={panelBg}>
            <h2 className="text-white font-bold text-sm mb-1">Goals</h2>
            <p className="text-slate-500 text-[11px] mb-4">What you’re looking for on Pi</p>
            <div className="space-y-2">
              {onboardingGoals.map(g => {
                const selected = goals.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleItem(goals, setGoals, g)}
                    className={`w-full px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${
                      selected
                        ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                        : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      selected ? 'bg-teal-500 border-teal-500' : 'border-slate-600'
                    }`}>
                      {selected && <Check size={12} className="text-white" />}
                    </span>
                    {g}
                  </button>
                )
              })}
            </div>
          </section>

          {/* AI Summary */}
          <section
            className="relative overflow-hidden rounded-2xl border border-teal-500/20 p-5 sm:p-6"
            style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(10,14,22,0.92))' }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-25 blur-2xl"
              style={{ background: '#14b8a6' }}
            />
            <div className="relative flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-200 flex items-center justify-center">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">AI profile summary</h2>
                  <p className="text-slate-500 text-[11px]">Narrative Twin signal for matching</p>
                </div>
              </div>
              <button
                type="button"
                onClick={generateAISummary}
                disabled={generatingAI}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                {generatingAI
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Sparkles size={14} /> Generate</>}
              </button>
            </div>
            {aiSummary
              ? <p className="relative text-slate-300 text-sm leading-relaxed italic">“{aiSummary}”</p>
              : <p className="relative text-slate-500 text-sm">Fill in your info above and generate an AI-powered summary.</p>
            }
          </section>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> :
              saved ? <><Check size={16} /> Saved</> : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/twin')}
            className="px-5 py-3.5 rounded-xl font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.06] hover:bg-teal-500/12 text-sm"
          >
            View Twin
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-5 py-3.5 rounded-xl font-semibold text-slate-400 border border-white/10 hover:text-white hover:border-white/20 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
