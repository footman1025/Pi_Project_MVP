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
    await new Promise(r => setTimeout(r, 1800))
    const skillsList = skills.split(',').map(s => s.trim()).filter(Boolean)
    const expLine = experience.length > 0
      ? ` Previously worked at ${experience.map(e => e.company).filter(Boolean).join(', ')}.`
      : ''
    const summary = `${fullName || 'This user'} is ${role ? `an ambitious ${role}` : 'a driven professional'} focused on ${interests.slice(0, 2).join(' and ') || 'innovation and technology'}.${expLine} ${skillsList.length ? `Key strengths include ${skillsList.slice(0, 3).join(', ')}.` : ''} ${goals.length ? `Currently pursuing goals to ${goals[0].toLowerCase()}.` : ''} Pi recommends connecting with like-minded professionals, investors, and collaborators.`
    setAiSummary(summary)
    setGeneratingAI(false)
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
    const payload = {
      full_name: fullName,
      username: nick,
      bio,
      role,
      location,
      website,
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white mb-1">Edit Profile</h1>
          <p className="text-slate-400 text-sm">Keep your profile complete to get better AI recommendations.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
        </button>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      <div className="space-y-6">

        {/* ── Basic info ── */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-pi-400" /> Basic Info
          </h2>

          {/* Avatar upload */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
              >
                <Camera size={15} />
                {uploadingAvatar ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Nickname</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(normalizeUsername(e.target.value))}
                  placeholder="your_nickname"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                />
              </div>
              <p className="text-slate-600 text-xs mt-1">Shown on posts and your public profile URL: /p/{username || 'nickname'}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pi-500/50 transition-colors">
                <option value="">Select your role</option>
                {onboardingRoles.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder="Tell the world about yourself..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <MapPin size={11} /> Location
              </label>
              <input value={location} onChange={e => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Globe2 size={11} /> Website
              </label>
              <input value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="yourwebsite.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
            </div>
          </div>
        </div>

        {/* ── Experience ── */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 size={18} className="text-pi-400" /> Experience
            </h2>
            <button onClick={addExperience}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15 transition-all">
              <Plus size={13} /> Add
            </button>
          </div>

          {experience.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
              <Building2 size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No experience added yet.</p>
              <button onClick={addExperience}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15 transition-all mx-auto">
                <Plus size={13} /> Add your first experience
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={exp.id} className="p-4 rounded-xl border border-white/5 bg-white/3 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Experience {i + 1}</span>
                    <button onClick={() => removeExperience(exp.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Job Title *</label>
                      <input value={exp.title} onChange={e => updateExperience(exp.id, 'title', e.target.value)}
                        placeholder="e.g. Software Engineer"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Company *</label>
                      <input value={exp.company} onChange={e => updateExperience(exp.id, 'company', e.target.value)}
                        placeholder="e.g. Google"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                        <CalendarDays size={10} /> Start Date
                      </label>
                      <input type="month" value={exp.start_date} onChange={e => updateExperience(exp.id, 'start_date', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1 flex items-center gap-1">
                        <CalendarDays size={10} /> End Date
                      </label>
                      <input type="month" value={exp.end_date} onChange={e => updateExperience(exp.id, 'end_date', e.target.value)}
                        placeholder="Leave empty if current"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
                      {!exp.end_date && exp.start_date && (
                        <p className="text-xs text-emerald-400 mt-1 ml-1">Currently working here</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-slate-500 block mb-1">Description</label>
                      <textarea value={exp.description} onChange={e => updateExperience(exp.id, 'description', e.target.value)}
                        placeholder="What did you do in this role?"
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors resize-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Skills ── */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-pi-400" /> Skills
          </h2>
          <input value={skills} onChange={e => setSkills(e.target.value)}
            placeholder="React, Python, AI, Product Strategy, Fundraising... (comma separated)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors" />
          <p className="text-xs text-slate-500 mt-2">Separate skills with commas</p>
        </div>

        {/* ── Interests ── */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <h2 className="text-lg font-bold text-white mb-4">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {onboardingInterests.map(item => {
              const selected = interests.includes(item)
              return (
                <button key={item} onClick={() => toggleItem(interests, setInterests, item)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all
                    ${selected ? 'border-pi-500/60 bg-pi-500/15 text-pi-300' : 'border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/5'}`}>
                  {selected && <Check size={12} className="inline mr-1" />}{item}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Goals ── */}
        <div className="p-6 rounded-2xl border border-white/5" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <h2 className="text-lg font-bold text-white mb-4">Goals</h2>
          <div className="space-y-2">
            {onboardingGoals.map(g => {
              const selected = goals.includes(g)
              return (
                <button key={g} onClick={() => toggleItem(goals, setGoals, g)}
                  className={`w-full px-5 py-3 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3
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

        {/* ── AI Summary ── */}
        <div className="p-6 rounded-2xl border border-pi-500/20" style={{ background: 'rgba(20,184,166,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-pi-400" /> AI Profile Summary
            </h2>
            <button onClick={generateAISummary} disabled={generatingAI}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              {generatingAI
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Sparkles size={14} /> Generate</>}
            </button>
          </div>
          {aiSummary
            ? <p className="text-slate-300 text-sm leading-relaxed italic">"{aiSummary}"</p>
            : <p className="text-slate-500 text-sm">Fill in your info above and click Generate to create your AI-powered profile summary.</p>
          }
        </div>
      </div>

      {/* Save button */}
      <div className="mt-8 flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
            saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="px-6 py-3.5 rounded-xl font-semibold text-slate-400 border border-white/10 hover:text-white hover:border-white/20 transition-all text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
