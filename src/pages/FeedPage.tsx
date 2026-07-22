import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Post, Comment } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Heart, MessageCircle, Share2, Send, Image, X, Loader2 } from 'lucide-react'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function PostCard({ post, onLike, onComment }: { post: Post, onLike: (id: string, liked: boolean) => void, onComment: (id: string) => void }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)

  const avatar = post.profiles?.full_name?.charAt(0).toUpperCase() || '?'
  const name = post.profiles?.full_name || 'Anonymous'
  const role = post.profiles?.role || ''

  const loadComments = async () => {
    setLoadingComments(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, role, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoadingComments(false)
  }

  const toggleComments = () => {
    if (!showComments) loadComments()
    setShowComments(v => !v)
  }

  const submitComment = async () => {
    if (!commentText.trim() || !user) return
    setSubmitting(true)
    await supabase.from('comments').insert({ post_id: post.id, author_id: user.id, content: commentText.trim() })
    setCommentText('')
    await loadComments()
    setSubmitting(false)
    onComment(post.id)
  }

  return (
    <div className="p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
      style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.4), rgba(14,20,25,0.6))' }}>
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          {avatar}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{name}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {role && <span>{role}</span>}
            {role && <span>·</span>}
            <span>{timeAgo(post.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-white/5">
        <button onClick={() => onLike(post.id, !!post.liked)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105 ${post.liked ? 'text-pink-400 bg-pink-500/10' : 'text-slate-400 hover:text-pink-400 hover:bg-pink-500/10'}`}>
          <Heart size={15} className={post.liked ? 'fill-pink-400' : ''} />
          {post.likes_count > 0 && post.likes_count}
        </button>
        <button onClick={toggleComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-pi-300 hover:bg-pi-500/10 transition-all">
          <MessageCircle size={15} />
          {post.comments_count > 0 && post.comments_count}
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
          <Share2 size={15} />
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/5">
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-pi-400" /></div>
          ) : (
            <div className="space-y-3 mb-3">
              {comments.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No comments yet. Be the first!</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #2dd4bf)' }}>
                    {c.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                    <span className="text-white text-xs font-semibold">{c.profiles?.full_name} </span>
                    <span className="text-slate-300 text-xs">{c.content}</span>
                    <p className="text-slate-600 text-xs mt-0.5">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {user && (
            <div className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-pi-500/50 transition-colors" />
              <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(full_name, role, avatar_url)')
      .is('community_id', null)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!data) { setLoading(false); return }

    if (user) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      const likedIds = new Set((likes || []).map(l => l.post_id))
      setPosts(data.map(p => ({ ...p, liked: likedIds.has(p.id) })))
    } else {
      setPosts(data)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [user])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const handlePost = async () => {
    if (!newPost.trim() || !user) return
    setPosting(true)
    await supabase.from('posts').insert({ author_id: user.id, content: newPost.trim() })
    setNewPost('')
    await fetchPosts()
    setPosting(false)
  }

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) { navigate('/login'); return }
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
    }
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 } : p))
  }

  const handleComment = (postId: string) => {
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-white mb-1">Feed</h1>
        <p className="text-slate-400 text-sm">Share your thoughts with the Pi community.</p>
      </div>

      {/* Create post */}
      {user ? (
        <div className="p-4 rounded-2xl border border-white/5 mb-6" style={{ background: 'linear-gradient(135deg, rgba(14,20,25,0.5), rgba(14,20,25,0.7))' }}>
          <textarea
            value={newPost} onChange={e => setNewPost(e.target.value)}
            placeholder="What's on your mind? Share with the Pi community..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors resize-none mb-3"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs transition-colors">
                <Image size={14} /> Photo
              </button>
            </div>
            <button onClick={handlePost} disabled={posting || !newPost.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-pi-500/20 mb-6 text-center" style={{ background: 'rgba(20,184,166,0.08)' }}>
          <p className="text-slate-400 text-sm mb-3">Sign in to post and interact with the community.</p>
          <button onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>Sign In</button>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-pi-400 mb-3" />
          <p className="text-slate-400 text-sm">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-white font-bold mb-2">No posts yet</h3>
          <p className="text-slate-400 text-sm">Be the first to post on Pi!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onLike={handleLike} onComment={handleComment} />
          ))}
        </div>
      )}
    </div>
  )
}
