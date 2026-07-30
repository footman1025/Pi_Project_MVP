import { useState, useEffect, useMemo } from 'react'
import { supabase, Community, Post } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { UsersRound, Sparkles, Loader2, Send, MessageCircle, Search as SearchIcon, Trash2 } from 'lucide-react'
import UserAvatar from '../components/UserAvatar'
import CommunityIcon from '../components/CommunityIcon'
import StatusBadge from '../components/StatusBadge'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import ProfileName from '../components/ProfileName'
import { displayName } from '../lib/posts'
import { rankCommunitiesForUser } from '../lib/communityRank'
import { track } from '../lib/analytics'

const categories = ['All', 'Technology', 'Business', 'Creator', 'Design', 'Finance', 'Health', 'Music']

function CommunityDetail({ community, onBack }: { community: Community, onBack: () => void }) {
  const { user, profile, refreshProfile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [joined, setJoined] = useState(community.joined || false)
  const [joiningLoading, setJoiningLoading] = useState(false)
  const [error, setError] = useState('')
  const [membersCount, setMembersCount] = useState(community.members_count)
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null)
  const [deletingPost, setDeletingPost] = useState(false)

  useEffect(() => {
    fetchPosts()
    if (user) checkMembership()
  }, [community.id, user])

  const checkMembership = async () => {
    if (!user) return
    const { data } = await supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle()
    setJoined(!!data)
  }

  const fetchPosts = async () => {
    setLoading(true)
    let list: Post[] = []

    const withProfiles = await supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(full_name, username, role, avatar_url)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(40)

    if (withProfiles.error) {
      const plain = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', community.id)
        .order('created_at', { ascending: false })
        .limit(40)
      if (plain.error) setError(plain.error.message)
      list = (plain.data as Post[]) || []
    } else {
      list = (withProfiles.data as Post[]) || []
    }

    const { enrichPostsWithAuthors } = await import('../lib/posts')
    list = await enrichPostsWithAuthors(list)
    setPosts(list)
    setLoading(false)
  }

  const ensureProfile = async () => {
    if (!user) return null
    if (profile) return profile
    const { data: existing } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (existing) {
      await refreshProfile()
      return existing
    }
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pi Member'
    const username = String(fullName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 8)}`
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert({ id: user.id, full_name: fullName, username })
      .select()
      .single()
    if (createErr) {
      const { data: again } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (again) { await refreshProfile(); return again }
      throw new Error(createErr.message)
    }
    await refreshProfile()
    return created
  }

  const toggleJoin = async () => {
    if (!user) return
    setJoiningLoading(true)
    setError('')
    try {
      await ensureProfile()
      if (joined) {
        await supabase.from('community_members').delete()
          .eq('community_id', community.id).eq('user_id', user.id)
        const next = Math.max(0, membersCount - 1)
        await supabase.from('communities').update({ members_count: next }).eq('id', community.id)
        setMembersCount(next)
        setJoined(false)
      } else {
        const { error: joinErr } = await supabase
          .from('community_members')
          .insert({ community_id: community.id, user_id: user.id })
        if (joinErr && !joinErr.message.toLowerCase().includes('duplicate')) {
          throw new Error(joinErr.message)
        }
        const next = membersCount + 1
        await supabase.from('communities').update({ members_count: next }).eq('id', community.id)
        setMembersCount(next)
        setJoined(true)
        track('community_join', { id: community.id, name: community.name })
        void import('../lib/engagement').then(m => m.recordEngagementAction('community_join'))
      }
    } catch (e: any) {
      setError(e?.message || 'Could not update membership')
    } finally {
      setJoiningLoading(false)
    }
  }

  const handlePost = async () => {
    if (!newPost.trim() || !user) return
    setPosting(true)
    setError('')
    const content = newPost.trim()
    try {
      const me = await ensureProfile()
      if (!me) throw new Error('Could not load your profile. Sign out and back in.')

      // Auto-join so posting always works
      if (!joined) {
        await supabase.from('community_members')
          .insert({ community_id: community.id, user_id: user.id })
        setJoined(true)
        setMembersCount(c => c + 1)
        track('community_join', { id: community.id, name: community.name, via: 'post' })
        void import('../lib/engagement').then(m => m.recordEngagementAction('community_join'))
      }

      const { data, error: insertError } = await supabase
        .from('posts')
        .insert({ author_id: user.id, community_id: community.id, content })
        .select('*')
        .single()

      if (insertError || !data) throw new Error(insertError?.message || 'Failed to create post')
      track('community_post', { id: community.id, name: community.name })
      void import('../lib/engagement').then(m => m.recordEngagementAction('community_post'))

      const newItem: Post = {
        ...(data as Post),
        profiles: {
          ...me,
        },
      }
      setNewPost('')
      setPosts(ps => [newItem, ...ps.filter(p => p.id !== newItem.id)])
      await fetchPosts()
    } catch (e: any) {
      setError(e?.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return
    setDeletingPost(true)
    setError('')
    const { error: delErr, count } = await supabase
      .from('posts')
      .delete({ count: 'exact' })
      .eq('id', postId)
      .eq('author_id', user.id)
    setDeletingPost(false)
    if (delErr) {
      setError(
        /policy|permission|rls/i.test(delErr.message)
          ? 'Could not delete — run supabase_post_comment_delete.sql in Supabase.'
          : delErr.message,
      )
      return
    }
    if (count === 0) {
      setError('Delete failed — you can only delete your own posts.')
      return
    }
    setPosts(ps => ps.filter(p => p.id !== postId))
    setConfirmDeletePostId(null)
  }

  const confirmPost = posts.find(p => p.id === confirmDeletePostId)

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-white transition-colors"
      >
        ← Back to communities
      </button>

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 sm:p-6 mb-5"
        style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
      >
        <div
          className="pointer-events-none absolute -top-10 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl"
          style={{ background: '#14b8a6' }}
        />
        <div className="relative flex items-center gap-4 flex-wrap">
          <CommunityIcon name={community.name} category={community.category} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">{community.name}</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {membersCount.toLocaleString()} members · {community.category}
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={toggleJoin}
              disabled={joiningLoading}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                joined
                  ? 'border border-white/15 text-slate-300 hover:border-red-500/40 hover:text-red-400'
                  : 'text-white hover:brightness-110'
              }`}
              style={joined ? undefined : { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {joiningLoading ? <Loader2 size={14} className="animate-spin" /> : joined ? 'Leave' : 'Join'}
            </button>
          )}
        </div>
        {community.description && (
          <p className="relative text-slate-400 text-sm mt-3.5 leading-relaxed">{community.description}</p>
        )}
        <p className="relative text-slate-600 text-xs mt-2.5">
          Topic space: join, post, and discuss with people who share this interest.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {user && (
        <div
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-5"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          {!joined && (
            <p className="text-xs text-amber-400/90 mb-2">You’ll be joined automatically when you post.</p>
          )}
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            placeholder={`Share something with ${community.name}...`}
            rows={3}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500/40 transition-colors resize-none mb-3"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || !newPost.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-40 hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-teal-400" /></div>
      ) : posts.length === 0 ? (
        <div
          className="text-center py-12 rounded-2xl border border-white/[0.07]"
          style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
        >
          <MessageCircle size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No posts yet in this community.</p>
          <p className="text-slate-600 text-xs mt-1">Be the first to start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {posts.map(post => (
            <article
              key={post.id}
              className="relative overflow-hidden rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all p-4 sm:p-5"
              style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar
                  url={post.profiles?.avatar_url}
                  name={displayName(post.profiles)}
                  id={post.author_id}
                  username={post.profiles?.username}
                  from="/communities"
                  size={36}
                  rounded="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <ProfileName
                    name={displayName(post.profiles)}
                    username={post.profiles?.username}
                    from="/communities"
                    className="text-white text-sm font-semibold"
                  />
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {post.profiles?.username && post.profiles?.full_name && (
                      <>
                        <span>@{post.profiles.username}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                </div>
                {user?.id === post.author_id && (
                  <button
                    type="button"
                    onClick={() => { setError(''); setConfirmDeletePostId(post.id) }}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    title="Delete post"
                    aria-label="Delete post"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 mt-3.5 pt-3 border-t border-white/[0.06] text-[11px] text-slate-500">
                <span>{post.likes_count || 0} likes</span>
                <span>{post.comments_count || 0} comments</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {confirmDeletePostId && (
        <ConfirmDeleteDialog
          title="Delete post?"
          description="This can’t be undone. The post will be removed from this community."
          preview={confirmPost?.content}
          deleting={deletingPost}
          onCancel={() => !deletingPost && setConfirmDeletePostId(null)}
          onConfirm={() => void handleDeletePost(confirmDeletePostId)}
        />
      )}
    </div>
  )
}

export default function CommunityPage() {
  const { user, profile } = useAuth()
  const [active, setActive] = useState('All')
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Community | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => { fetchCommunities() }, [user])

  // Debounced search — runs against Supabase whenever query changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCommunities(searchQuery)
      } else {
        fetchCommunities()
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const fetchCommunities = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('members_count', { ascending: false })
    if (!data) { setLoading(false); return }
    await mergeMemberships(data)
    setLoading(false)
  }

  const searchCommunities = async (q: string) => {
    setSearching(true)
    const { data } = await supabase
      .from('communities')
      .select('*')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
      .order('members_count', { ascending: false })
    if (!data) { setSearching(false); return }
    await mergeMemberships(data)
    setSearching(false)
  }

  const mergeMemberships = async (data: Community[]) => {
    if (user) {
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
      const joinedIds = new Set((memberships || []).map((m: any) => m.community_id))
      setCommunities(data.map(c => ({ ...c, joined: joinedIds.has(c.id) })))
    } else {
      setCommunities(data)
    }
  }

  // Filter by category, then rank by twin fit
  const filtered = useMemo(() => {
    const base = active === 'All' ? communities : communities.filter(c => c.category === active)
    return rankCommunitiesForUser(profile, base)
  }, [communities, active, profile])

  const topRecs = filtered.slice(0, 2)

  if (selected) {
    return (
      <div className="min-h-full relative overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-45"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.18), transparent)' }}
        />
        <div className="relative p-4 sm:p-6 max-w-3xl mx-auto w-full min-w-0">
          <CommunityDetail community={selected} onBack={() => { setSelected(null); fetchCommunities() }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-5xl mx-auto w-full min-w-0">
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <UsersRound size={18} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Twin-ranked hubs
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Communities
                </h1>
                <StatusBadge kind="live" label="Live · twin-ranked" />
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px] max-w-2xl">
            Topic groups to join, post, and discuss. Unlike the main Feed, posts stay inside the hub.
          </p>
        </header>

        <div className="relative mb-4">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search communities by name, topic, or category..."
            className="w-full bg-black/30 border border-white/10 rounded-2xl pl-11 pr-10 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500/40 transition-colors"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 size={15} className="animate-spin text-teal-400" />
            </div>
          )}
          {searchQuery && !searching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                active === c
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-teal-500/20 p-4 mb-6 flex items-start gap-3"
          style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(10,14,22,0.9))' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <Sparkles size={15} className="text-white" />
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            <span className="text-teal-300 font-semibold">Pi recommends:</span>{' '}
            {topRecs.length >= 2 ? (
              <>
                Based on your twin, start with{' '}
                <span className="text-white font-semibold">{topRecs[0].name}</span>
                {' '}({topRecs[0].score}% fit) and{' '}
                <span className="text-white font-semibold">{topRecs[1].name}</span>
                {' '}({topRecs[1].score}% fit).
              </>
            ) : topRecs.length === 1 ? (
              <>
                Top fit right now:{' '}
                <span className="text-white font-semibold">{topRecs[0].name}</span>
                {' '}({topRecs[0].score}%).
              </>
            ) : (
              <>Complete your profile interests to personalize community ranking.</>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-teal-400" /></div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl border border-white/[0.07]"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <UsersRound size={36} className="text-slate-600 mx-auto mb-3" />
            <p className="text-white font-bold mb-1">
              {searchQuery ? `No communities found for "${searchQuery}"` : 'No communities yet'}
            </p>
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Try a different search term or clear the filter.' : 'Check back soon!'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-teal-200 border border-teal-500/25 bg-teal-500/[0.08] hover:bg-teal-500/15"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3.5">
            {filtered.map(c => (
              <article
                key={c.id}
                className="relative overflow-hidden rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all group"
                style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
              >
                <div
                  className="pointer-events-none absolute -top-8 -right-6 w-24 h-24 rounded-full opacity-15 blur-2xl group-hover:opacity-25 transition-opacity"
                  style={{ background: '#14b8a6' }}
                />
                <div className="relative p-4 sm:p-5 cursor-pointer" onClick={() => setSelected(c)}>
                  <div className="flex items-center gap-3.5 mb-3.5">
                    <CommunityIcon
                      name={c.name}
                      category={c.category}
                      size="md"
                      className="group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white">{c.name}</h3>
                        <span className="text-[11px] font-extrabold text-teal-300 tabular-nums">{c.score}% fit</span>
                        {c.joined && (
                          <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-md">
                            Joined
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {c.members_count.toLocaleString()} members · {c.category}
                      </p>
                    </div>
                  </div>

                  <div
                    className="mb-4 p-3 rounded-xl border border-teal-500/20"
                    style={{ background: 'rgba(20,184,166,0.08)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={11} className="text-teal-400" />
                      <p className="text-teal-300/90 text-[10px] font-bold uppercase tracking-[0.14em]">Why this hub</p>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{c.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setSelected(c) }}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white hover:brightness-110 transition-all"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    {c.joined ? 'View community' : 'Open community'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
