import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile, Community, Post } from '../lib/supabase'
import {
  SearchCheck, Sparkles, Loader2, Users, MessageSquare,
  MapPin, Tag, X, UserCircle2, Globe2,
  FileText, Briefcase, CalendarDays, Flame
} from 'lucide-react'
import UserAvatar from '../components/UserAvatar'
import CommunityIcon from '../components/CommunityIcon'

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
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-4xl mx-auto w-full min-w-0">
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <SearchCheck size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Discover
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                Search
              </h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px]">
            Find people, communities, and posts across Pi.
          </p>
        </header>

        <div className="relative mb-4">
          <SearchCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people, communities, posts..."
            className="w-full bg-black/30 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 sm:py-4 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500/40 transition-colors"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={17} className="animate-spin text-teal-400" />
            </div>
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          {searchTypes.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center ${
                type === t
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {t}
              {searched && t !== 'All' && (
                (t === 'People' && totalPeople > 0) ? (
                  <span className="ml-1.5 text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md">{totalPeople}</span>
                ) : (t === 'Communities' && totalCommunities > 0) ? (
                  <span className="ml-1.5 text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md">{totalCommunities}</span>
                ) : (t === 'Posts' && totalPosts > 0) ? (
                  <span className="ml-1.5 text-[10px] bg-teal-500/20 text-teal-300 px-1.5 py-0.5 rounded-md">{totalPosts}</span>
                ) : null
              )}
            </button>
          ))}
        </div>

        {!searched ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">Trending</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {trendingSearches.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.07] text-slate-300 text-sm hover:border-teal-500/30 hover:text-white transition-all"
                  style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.9), rgba(10,14,22,0.95))' }}
                >
                  <Flame size={13} className="text-amber-400/90 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">Browse</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'People', Icon: UserCircle2, accent: '#14b8a6', type: 'People' },
                { label: 'Communities', Icon: Globe2, accent: '#34d399', type: 'Communities' },
                { label: 'Posts', Icon: FileText, accent: '#fbbf24', type: 'Posts' },
                { label: 'Opportunities', Icon: Briefcase, accent: '#f472b6', type: 'All', href: '/opportunities' },
                { label: 'Creators', Icon: Sparkles, accent: '#2dd4bf', type: 'People', href: '/creators' },
                { label: 'Events', Icon: CalendarDays, accent: '#22d3ee', type: 'All' },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (item.href) { navigate(item.href); return }
                    setType(item.type)
                    inputRef.current?.focus()
                  }}
                  className="relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-white/[0.07] hover:border-white/15 text-left transition-all group"
                  style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                >
                  <div
                    className="pointer-events-none absolute -top-8 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl group-hover:opacity-30"
                    style={{ background: item.accent }}
                  />
                  <div
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${item.accent}22`, color: item.accent }}
                  >
                    <item.Icon size={16} />
                  </div>
                  <p className="relative text-white font-bold text-sm">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : loading && !hasResults ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-teal-400 mb-3" />
            <p className="text-slate-500 text-sm">Searching Pi…</p>
          </div>
        ) : !hasResults && !loading ? (
          <div
            className="text-center py-16 rounded-2xl border border-white/[0.07]"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-teal-500/10 border border-teal-500/20">
              <SearchCheck size={24} className="text-teal-400" />
            </div>
            <p className="text-white font-bold text-lg mb-2">No results for “{query}”</p>
            <p className="text-slate-500 text-sm mb-6">Try different keywords or clear and browse.</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="px-5 py-2.5 rounded-xl font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15 text-sm"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-5 text-sm text-slate-500">
              <Sparkles size={14} className="text-teal-400" />
              <span>
                Found <span className="text-white font-semibold">{totalResults} result{totalResults !== 1 ? 's' : ''}</span> for{' '}
                <span className="text-teal-300 font-semibold">“{query}”</span>
              </span>
            </div>

            {(type === 'All' || type === 'People') && people.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] flex items-center gap-2 mb-3">
                  <Users size={12} /> People ({totalPeople})
                </h3>
                <div className="space-y-2.5">
                  {people.map(p => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => p.username && navigate(`/p/${p.username}`)}
                      onKeyDown={e => e.key === 'Enter' && p.username && navigate(`/p/${p.username}`)}
                      className="relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all cursor-pointer group"
                      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                    >
                      <UserAvatar
                        url={p.avatar_url}
                        name={p.full_name}
                        id={p.id}
                        username={p.username}
                        from="/search"
                        size={44}
                        rounded="rounded-2xl"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{p.full_name || 'Pi Member'}</p>
                          {p.role && (
                            <span className="text-[11px] text-slate-500 bg-black/30 border border-white/[0.06] px-2 py-0.5 rounded-lg">{p.role}</span>
                          )}
                          {p.username && (
                            <span className="text-[11px] text-slate-600">@{p.username}</span>
                          )}
                        </div>
                        {p.bio && <p className="text-slate-500 text-xs truncate mt-0.5">{p.bio}</p>}
                        {p.location && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-600">
                            <MapPin size={10} />{p.location}
                          </div>
                        )}
                        {p.skills && p.skills.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {p.skills.slice(0, 3).map(s => (
                              <span key={s} className="inline-flex items-center gap-0.5 text-[11px] text-teal-300/90 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-lg">
                                <Tag size={9} />{s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); p.username && navigate(`/p/${p.username}`) }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-all hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(type === 'All' || type === 'Communities') && communities.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] flex items-center gap-2 mb-3">
                  <Users size={12} /> Communities ({totalCommunities})
                </h3>
                <div className="grid md:grid-cols-2 gap-2.5">
                  {communities.map(c => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate('/communities')}
                      onKeyDown={e => e.key === 'Enter' && navigate('/communities')}
                      className="flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all cursor-pointer"
                      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                    >
                      <CommunityIcon name={c.name} category={c.category} size="md" />
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

            {(type === 'All' || type === 'Posts') && posts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.14em] flex items-center gap-2 mb-3">
                  <MessageSquare size={12} /> Posts ({totalPosts})
                </h3>
                <div className="space-y-2.5">
                  {posts.map(p => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate('/feed')}
                      onKeyDown={e => e.key === 'Enter' && navigate('/feed')}
                      className="p-4 rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all cursor-pointer"
                      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
                    >
                      <div className="flex items-center gap-3 mb-2.5">
                        <UserAvatar
                          url={p.profiles?.avatar_url}
                          name={p.profiles?.full_name}
                          id={p.author_id}
                          username={p.profiles?.username}
                          from="/search"
                          size={32}
                          rounded="rounded-xl"
                        />
                        <div>
                          <p className="text-white text-xs font-semibold">{p.profiles?.full_name || 'Pi Member'}</p>
                          <p className="text-slate-600 text-[11px]">{timeAgo(p.created_at)}</p>
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">{p.content}</p>
                      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-white/[0.06] text-[11px] text-slate-500">
                        <span>{p.likes_count} likes</span>
                        <span>{p.comments_count} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
