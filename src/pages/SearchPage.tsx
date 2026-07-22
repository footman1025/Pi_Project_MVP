import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, Community, Post } from '../lib/supabase'
import {
  SearchCheck, Sparkles, Loader2, Users, MessageSquare,
  MapPin, Tag, X, TrendingUp, UserCircle2, Globe2,
  FileText, Briefcase, CalendarDays, Flame
} from 'lucide-react'

const searchTypes = ['All', 'People', 'Communities', 'Posts']

const trendingSearches = [
  'AI co-founder', 'startup competition', 'angel investor',
  'product designer', 'AI founders hub', 'remote developer',
  'creator monetization', 'web3 builder',
]

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(false)

  const [people, setPeople] = useState<Profile[]>([])
  const [communities, setCommunities] = useState<Community[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  const [totalPeople, setTotalPeople] = useState(0)
  const [totalCommunities, setTotalCommunities] = useState(0)
  const [totalPosts, setTotalPosts] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search whenever query or type changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length >= 2) runSearch(query.trim())
      else {
        setPeople([]); setCommunities([]); setPosts([])
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query, type])

  const runSearch = async (q: string) => {
    setLoading(true)

    // Run all queries in parallel with async/await
    const [peopleRes, commRes, postsRes] = await Promise.all([
      (type === 'All' || type === 'People')
        ? supabase.from('profiles').select('*')
            .or(`full_name.ilike.%${q}%,bio.ilike.%${q}%,role.ilike.%${q}%,location.ilike.%${q}%`)
            .limit(type === 'People' ? 20 : 5)
        : Promise.resolve({ data: null }),

      (type === 'All' || type === 'Communities')
        ? supabase.from('communities').select('*')
            .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
            .order('members_count', { ascending: false })
            .limit(type === 'Communities' ? 20 : 5)
        : Promise.resolve({ data: null }),

      (type === 'All' || type === 'Posts')
        ? supabase.from('posts').select('*, profiles(full_name, role, avatar_url)')
            .ilike('content', `%${q}%`)
            .order('created_at', { ascending: false })
            .limit(type === 'Posts' ? 20 : 5)
        : Promise.resolve({ data: null }),
    ])

    const p = peopleRes.data || []
    const c = commRes.data || []
    const po = postsRes.data || []

    setPeople(type === 'All' || type === 'People' ? p : [])
    setCommunities(type === 'All' || type === 'Communities' ? c : [])
    setPosts(type === 'All' || type === 'Posts' ? po : [])
    setTotalPeople(p.length)
    setTotalCommunities(c.length)
    setTotalPosts(po.length)

    setLoading(false)
  }

  const hasResults = people.length > 0 || communities.length > 0 || posts.length > 0
  const searched = query.trim().length >= 2

  const totalResults = (type === 'All' ? totalPeople + totalCommunities + totalPosts
    : type === 'People' ? totalPeople
    : type === 'Communities' ? totalCommunities
    : totalPosts)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-white mb-1">Search</h1>
        <p className="text-slate-400 text-sm">Search people, communities, and posts across Pi.</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <SearchCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, communities, posts..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 size={17} className="animate-spin text-pi-400" />
          </div>
        )}
        {query && !loading && (
          <button onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {searchTypes.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${type === t
                ? 'text-white border border-pi-500/40'
                : 'text-slate-400 border border-white/5 hover:text-white hover:border-white/10'
              }`}
            style={type === t ? { background: 'rgba(20,184,166,0.15)' } : {}}>
            {t}
            {/* Show count badge for active type when there are results */}
            {searched && t !== 'All' && (
              (t === 'People' && totalPeople > 0) ? (
                <span className="ml-1.5 text-xs bg-pi-500/20 text-pi-300 px-1.5 py-0.5 rounded-full">{totalPeople}</span>
              ) : (t === 'Communities' && totalCommunities > 0) ? (
                <span className="ml-1.5 text-xs bg-pi-500/20 text-pi-300 px-1.5 py-0.5 rounded-full">{totalCommunities}</span>
              ) : (t === 'Posts' && totalPosts > 0) ? (
                <span className="ml-1.5 text-xs bg-pi-500/20 text-pi-300 px-1.5 py-0.5 rounded-full">{totalPosts}</span>
              ) : null
            )}
          </button>
        ))}
      </div>

      {/* ── Results ── */}
      {!searched ? (
        /* Trending / pre-search state */
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Trending Searches</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {trendingSearches.map((s, i) => (
              <button key={i}
                onClick={() => setQuery(s)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 text-slate-300 text-sm hover:border-pi-500/20 hover:text-white transition-all"
                style={{ background: 'rgba(14,20,25,0.3)' }}>
                <Flame size={13} className="text-orange-400 flex-shrink-0" />
                {s}
              </button>
            ))}
          </div>

          {/* Quick access tiles */}
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'People', Icon: UserCircle2, iconColor: 'from-pi-500 to-teal-600', color: 'from-pi-500/20 to-teal-500/10', border: 'border-pi-500/20', type: 'People' },
              { label: 'Communities', Icon: Globe2, iconColor: 'from-emerald-500 to-teal-600', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/20', type: 'Communities' },
              { label: 'Posts', Icon: FileText, iconColor: 'from-amber-500 to-orange-600', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/20', type: 'Posts' },
              { label: 'Opportunities', Icon: Briefcase, iconColor: 'from-pink-500 to-rose-600', color: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/20', type: 'All' },
              { label: 'Creators', Icon: Sparkles, iconColor: 'from-teal-500 to-pi-600', color: 'from-pi-500/20 to-teal-500/10', border: 'border-pi-500/20', type: 'People' },
              { label: 'Events', Icon: CalendarDays, iconColor: 'from-cyan-500 to-blue-600', color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/20', type: 'All' },
            ].map((item, i) => (
              <button key={i}
                onClick={() => { setType(item.type); inputRef.current?.focus() }}
                className={`p-5 rounded-2xl border bg-gradient-to-br ${item.color} ${item.border} text-left hover:scale-[1.02] transition-all group`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.iconColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.Icon size={18} className="text-white" />
                </div>
                <p className="text-white font-bold text-sm">{item.label}</p>
              </button>
            ))}
          </div>
        </div>
      ) : loading && !hasResults ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-pi-400 mb-3" />
          <p className="text-slate-400 text-sm">Searching Pi...</p>
        </div>
      ) : !hasResults && !loading ? (
        /* No results */
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <SearchCheck size={28} className="text-pi-400" />
          </div>
          <p className="text-white font-bold text-lg mb-2">No results for "{query}"</p>
          <p className="text-slate-400 text-sm mb-6">Try different keywords or browse by category below.</p>
          <button onClick={() => setQuery('')}
            className="px-6 py-2.5 rounded-xl font-semibold text-pi-300 bg-pi-500/10 border border-pi-500/20 hover:bg-pi-500/15 transition-all text-sm">
            Clear search
          </button>
        </div>
      ) : (
        /* Results */
        <div className="animate-fade-in">
          {/* Results summary */}
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-400">
            <Sparkles size={14} className="text-pi-400" />
            <span>
              Found <span className="text-white font-semibold">{totalResults} result{totalResults !== 1 ? 's' : ''}</span> for{' '}
              <span className="text-pi-300 font-semibold">"{query}"</span>
            </span>
          </div>

          {/* ── People ── */}
          {(type === 'All' || type === 'People') && people.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} /> People ({totalPeople})
                </h3>
              </div>
              <div className="space-y-3">
                {people.map(p => (
                  <div key={p.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer group"
                    style={{ background: 'rgba(14,20,25,0.3)' }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                      {p.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{p.full_name || 'Pi Member'}</p>
                        {p.role && (
                          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{p.role}</span>
                        )}
                      </div>
                      {p.bio && <p className="text-slate-500 text-xs truncate mt-0.5">{p.bio}</p>}
                      {p.location && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-600">
                          <MapPin size={10} />{p.location}
                        </div>
                      )}
                      {p.skills && p.skills.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {p.skills.slice(0, 3).map(s => (
                            <span key={s} className="flex items-center gap-0.5 text-xs text-pi-300 bg-pi-500/10 px-2 py-0.5 rounded-full">
                              <Tag size={9} />{s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Communities ── */}
          {(type === 'All' || type === 'Communities') && communities.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} /> Communities ({totalCommunities})
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {communities.map(c => (
                  <div key={c.id}
                    onClick={() => navigate('/communities')}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer"
                    style={{ background: 'rgba(14,20,25,0.3)' }}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.2)' }}>
                      {c.icon || '🌐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{c.name}</p>
                      <p className="text-slate-500 text-xs">{c.members_count.toLocaleString()} members · {c.category}</p>
                      {c.description && (
                        <p className="text-slate-600 text-xs truncate mt-0.5">{c.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Posts ── */}
          {(type === 'All' || type === 'Posts') && posts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare size={14} /> Posts ({totalPosts})
                </h3>
              </div>
              <div className="space-y-3">
                {posts.map(p => (
                  <div key={p.id}
                    onClick={() => navigate('/feed')}
                    className="p-4 rounded-2xl border border-white/5 hover:border-pi-500/20 transition-all cursor-pointer"
                    style={{ background: 'rgba(14,20,25,0.3)' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                        {p.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white text-xs font-semibold">{p.profiles?.full_name || 'Pi Member'}</p>
                        <p className="text-slate-600 text-xs">{timeAgo(p.created_at)}</p>
                      </div>
                    </div>
                    {/* Highlight matching text */}
                    <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">{p.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                      <span>❤️ {p.likes_count}</span>
                      <span>💬 {p.comments_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
