import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Post, Comment, Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { notifyPostAuthorOfLike, notifyPostAuthorOfComment } from '../lib/notifications'
import { displayName } from '../lib/posts'
import { uploadPostImage } from '../lib/postImageUpload'
import {
  FEED_STREAMS,
  classifyPostStream,
  filterAndSortPosts,
  opportunityActions,
  reputationBreakdown,
  stripStreamPrefix,
  whyPostReasons,
  withStreamPrefix,
  type FeedStream,
  type PostStreamTag,
} from '../lib/feedStreams'
import { REPORT_REASONS, submitContentReport, type ReportReason } from '../lib/contentReports'
import { track } from '../lib/analytics'
import {
  Heart, MessageCircle, Share2, Send, Image, Loader2, Sparkles, X, Pencil, Trash2, Check,
  Flag, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import UserAvatar from '../components/UserAvatar'
import ProfileName from '../components/ProfileName'
import LoadingSpinner from '../components/LoadingSpinner'
import StateMessage from '../components/StateMessage'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function PostCard({ post, onLike, onComment, onDeletePost, actorName }: {
  post: Post
  onLike: (id: string, liked: boolean) => void
  onComment: (id: string, delta?: number) => void
  onDeletePost: (id: string) => Promise<{ error?: string }>
  actorName: string
}) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null)
  const [confirmDeletePost, setConfirmDeletePost] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [actionError, setActionError] = useState('')
  const [shareNote, setShareNote] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null)
  const [reportReason, setReportReason] = useState<ReportReason>('spam')
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  const name = displayName(post.profiles)
  const role = post.profiles?.role || ''
  const authorUsername = post.profiles?.username || null
  const isOwnPost = !!user && user.id === post.author_id
  const stream = classifyPostStream(post)
  const body = stripStreamPrefix(post.content || '')
  const trust = reputationBreakdown(post.profiles)
  const why = whyPostReasons(post, profile)
  const actions = opportunityActions(post)

  const sharePost = async () => {
    const url = `${window.location.origin}/feed?post=${post.id}`
    const text = body.slice(0, 140) || 'Shared from Pi'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Pi', text, url })
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setShareNote('Link copied')
        setTimeout(() => setShareNote(''), 2000)
      }
      track('feed_share', { post_id: post.id, stream })
      await supabase.from('posts').update({ shares_count: (post.shares_count || 0) + 1 }).eq('id', post.id)
    } catch {
      /* user cancelled share */
    }
  }

  const openReport = (type: 'post' | 'comment', id: string) => {
    setActionError('')
    setReportTarget({ type, id })
    setReportOpen(true)
    setReportDone(false)
  }

  const submitReport = async () => {
    if (!user) { navigate('/login'); return }
    if (!reportTarget) return
    setReporting(true)
    setActionError('')
    const res = await submitContentReport({
      reporterId: user.id,
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      reason: reportReason,
      details: reportDetails,
    })
    setReporting(false)
    if (!res.ok) {
      setActionError(res.error)
      return
    }
    setReportDone(true)
    setTimeout(() => {
      setReportOpen(false)
      setReportDone(false)
      setReportDetails('')
      setReportTarget(null)
    }, 1400)
  }

  const loadComments = async () => {
    setLoadingComments(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(full_name, username, role, avatar_url)')
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
    setActionError('')
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      author_id: user.id,
      content: commentText.trim(),
    })
    if (!error) {
      await notifyPostAuthorOfComment(post.id, user.id, actorName)
      setCommentText('')
      await loadComments()
      onComment(post.id, 1)
    } else {
      setActionError(error.message)
    }
    setSubmitting(false)
  }

  const startEdit = (c: Comment) => {
    setEditingId(c.id)
    setEditText(c.content)
    setActionError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (commentId: string) => {
    if (!user || !editText.trim()) return
    setSavingEdit(true)
    setActionError('')
    const { error } = await supabase
      .from('comments')
      .update({ content: editText.trim(), updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('author_id', user.id)
    if (!error) {
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, content: editText.trim(), updated_at: new Date().toISOString() }
          : c,
      ))
      cancelEdit()
    } else {
      setActionError(
        /policy|permission|rls/i.test(error.message)
          ? 'Could not edit — run supabase_comment_edit.sql in Supabase.'
          : error.message,
      )
    }
    setSavingEdit(false)
  }

  const deleteComment = async (commentId: string) => {
    if (!user) return
    setDeletingId(commentId)
    setActionError('')
    const { error, count } = await supabase
      .from('comments')
      .delete({ count: 'exact' })
      .eq('id', commentId)
      .eq('author_id', user.id)
    if (!error && (count === null || count > 0)) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      onComment(post.id, -1)
      if (editingId === commentId) cancelEdit()
      setConfirmDeleteCommentId(null)
    } else {
      setActionError(
        error
          ? (/policy|permission|rls/i.test(error.message)
            ? 'Could not delete comment — run supabase_post_comment_delete.sql in Supabase.'
            : error.message)
          : 'Delete failed — you can only delete your own comments.',
      )
    }
    setDeletingId(null)
  }

  const deletePost = async () => {
    setDeletingPost(true)
    setActionError('')
    const res = await onDeletePost(post.id)
    if (res.error) {
      setActionError(res.error)
      setDeletingPost(false)
      return
    }
    setConfirmDeletePost(false)
    setDeletingPost(false)
  }

  const confirmDeleteComment = comments.find(c => c.id === confirmDeleteCommentId)

  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] hover:border-white/15 transition-all"
      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
    >
      <div className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3.5">
        <UserAvatar
          url={post.profiles?.avatar_url}
          name={name}
          id={post.author_id}
          username={authorUsername}
          from="/feed"
          size={40}
          rounded="rounded-xl"
        />
        <div className="flex-1 min-w-0">
          <ProfileName
            name={name}
            username={authorUsername}
            from="/feed"
            className="text-white font-semibold text-sm truncate block"
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
            {role && <span className="truncate max-w-[140px]">{role}</span>}
            {role && <span>·</span>}
            <span>{timeAgo(post.created_at)}</span>
            <span>·</span>
            <span className="text-teal-400/80 capitalize">{stream}</span>
            <span
              className="inline-flex items-center gap-0.5 text-emerald-400/80"
              title={`Twin ${trust.twinReady} · activity ${trust.activity} · network ${trust.network}`}
            >
              <Shield size={10} /> {trust.score} · {trust.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isOwnPost && (
            <button
              type="button"
              onClick={() => openReport('post', post.id)}
              className="p-2 rounded-xl text-slate-500 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
              title="Report"
              aria-label="Report post"
            >
              <Flag size={15} />
            </button>
          )}
          {isOwnPost && (
            <button
              type="button"
              onClick={() => { setActionError(''); setConfirmDeletePost(true) }}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete post"
              aria-label="Delete post"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {body.trim() && (
        <p className="text-slate-200 text-sm leading-relaxed mb-3.5 whitespace-pre-wrap">{body}</p>
      )}

      {post.image_url && (
        <div className="mb-3.5 overflow-hidden rounded-xl border border-white/[0.08]">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full max-h-[480px] object-cover bg-black/40"
            loading="lazy"
          />
        </div>
      )}

      {actionError && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        {actions.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => {
              track('feed_opp_action', { action: a.id, stream, post_id: post.id })
              navigate(a.to)
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              a.kind === 'primary'
                ? 'text-teal-200 border-teal-500/25 bg-teal-500/[0.07] hover:bg-teal-500/15'
                : 'text-slate-300 border-white/10 hover:border-white/20'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 pt-3 border-t border-white/[0.06] flex-wrap">
        <button onClick={() => onLike(post.id, !!post.liked)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${post.liked ? 'text-pink-400 bg-pink-500/10' : 'text-slate-400 hover:text-pink-400 hover:bg-pink-500/10'}`}>
          <Heart size={15} className={post.liked ? 'fill-pink-400' : ''} />
          {post.likes_count > 0 && post.likes_count}
        </button>
        <button onClick={toggleComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all">
          <MessageCircle size={15} />
          {post.comments_count > 0 && post.comments_count}
        </button>
        <button
          type="button"
          onClick={() => void sharePost()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
        >
          <Share2 size={15} />
          {shareNote || (post.shares_count > 0 ? post.shares_count : null)}
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !showWhy
            setShowWhy(next)
            if (next) track('feed_why_open', { post_id: post.id, stream })
          }}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-teal-200 border border-teal-500/20 bg-teal-500/[0.06] hover:bg-teal-500/12"
        >
          <Sparkles size={12} /> Why
          {showWhy ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showWhy && (
        <div
          className="mt-3 p-3.5 rounded-xl border border-teal-500/20"
          style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.1), rgba(10,14,22,0.7))' }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/90 mb-2">Why this post</p>
          <ul className="space-y-1.5">
            {why.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal>
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 p-5"
            style={{ background: 'linear-gradient(160deg, #0d1220, #06090f)' }}
          >
            <h3 className="text-white font-bold text-base mb-1">
              Report {reportTarget?.type === 'comment' ? 'comment' : 'post'}
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Trust & Safety — you can appeal enforcement later. Reports are reviewed by humans for high-risk cases.
            </p>
            {reportDone ? (
              <p className="text-teal-300 text-sm font-medium py-4 text-center">Thanks — report received.</p>
            ) : (
              <>
                <div className="space-y-1.5 mb-3">
                  {REPORT_REASONS.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name={`report-${post.id}`}
                        checked={reportReason === r.id}
                        onChange={() => setReportReason(r.id)}
                        className="text-teal-500"
                      />
                      {r.label}
                    </label>
                  ))}
                </div>
                <textarea
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  rows={2}
                  placeholder="Optional details…"
                  className="w-full mb-3 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500/40 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setReportOpen(false); setReportTarget(null) }}
                    className="px-3 py-2 rounded-xl text-xs text-slate-400 border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={reporting}
                    onClick={() => void submitReport()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    {reporting ? 'Sending…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showComments && (
        <div className="mt-3.5 pt-3.5 border-t border-white/[0.06]">
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-teal-400" /></div>
          ) : (
            <div className="space-y-2.5 mb-3">
              {comments.length === 0 && <p className="text-slate-500 text-xs text-center py-2">No comments yet. Be the first!</p>}
              {comments.map(c => {
                const isOwn = user?.id === c.author_id
                const cName = c.profiles?.full_name || 'Member'
                const cUser = c.profiles?.username || null
                const isEditing = editingId === c.id
                return (
                  <div key={c.id} className="flex gap-2">
                    <UserAvatar
                      url={c.profiles?.avatar_url}
                      name={cName}
                      id={c.author_id}
                      username={cUser}
                      from="/feed"
                      size={28}
                      rounded="rounded-lg"
                    />
                    <div className="flex-1 bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={2}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500/40 resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={savingEdit || !editText.trim()}
                              onClick={() => void saveEdit(c.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                            >
                              {savingEdit ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 border border-white/10 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <ProfileName
                                name={cName}
                                username={cUser}
                                from="/feed"
                                className="text-white text-xs font-semibold"
                              />
                              {' '}
                              <span className="text-slate-300 text-xs break-words">{c.content}</span>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              {!isOwn && user && (
                                <button
                                  type="button"
                                  onClick={() => openReport('comment', c.id)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-amber-300 hover:bg-white/5"
                                  title="Report comment"
                                  aria-label="Report comment"
                                >
                                  <Flag size={13} />
                                </button>
                              )}
                              {isOwn && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(c)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-teal-300 hover:bg-white/5"
                                    title="Edit comment"
                                    aria-label="Edit comment"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingId === c.id}
                                    onClick={() => { setActionError(''); setConfirmDeleteCommentId(c.id) }}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-white/5 disabled:opacity-40"
                                    title="Delete comment"
                                    aria-label="Delete comment"
                                  >
                                    {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-600 text-[10px] mt-0.5">
                            {timeAgo(c.created_at)}
                            {c.updated_at && c.updated_at !== c.created_at ? ' · edited' : ''}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {user && (
            <div className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-teal-500/40 transition-colors" />
              <button onClick={submitComment} disabled={submitting || !commentText.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
        </div>
      )}

      {confirmDeleteCommentId && (
        <ConfirmDeleteDialog
          title="Delete comment?"
          description="This can’t be undone. The comment will be removed from this post."
          preview={confirmDeleteComment?.content}
          deleting={!!deletingId}
          onCancel={() => !deletingId && setConfirmDeleteCommentId(null)}
          onConfirm={() => void deleteComment(confirmDeleteCommentId)}
        />
      )}

      {confirmDeletePost && (
        <ConfirmDeleteDialog
          title="Delete post?"
          description="This can’t be undone. The post and its comments will be removed."
          preview={body}
          deleting={deletingPost}
          onCancel={() => !deletingPost && setConfirmDeletePost(false)}
          onConfirm={() => void deletePost()}
        />
      )}
      </div>
    </article>
  )
}

export default function FeedPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postStream, setPostStream] = useState<PostStreamTag>('knowledge')
  const [activeStream, setActiveStream] = useState<FeedStream>('all')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const actorName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'

  const visiblePosts = useMemo(
    () => filterAndSortPosts(posts, activeStream, profile),
    [posts, activeStream, profile],
  )

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const onPickImage = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WEBP, or GIF).')
      return
    }
    setError('')
    setImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setImageFile(file)
  }

  const fetchPosts = useCallback(async () => {
    let list: Post[] = []
    let fetchError: { message: string } | null = null

    const withProfiles = await supabase
      .from('posts')
      .select('*, profiles!posts_author_id_fkey(full_name, username, role, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(80)

    if (withProfiles.error) {
      const plain = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80)
      list = (plain.data as Post[] | null) || []
      fetchError = plain.error
    } else {
      list = (withProfiles.data as Post[] | null) || []
    }

    list = list.filter(p => !p.community_id)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const { enrichPostsWithAuthors } = await import('../lib/posts')
    list = await enrichPostsWithAuthors(list)

    if (user && list.length > 0) {
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      const likedIds = new Set((likes || []).map(l => l.post_id))
      setPosts(list.map(p => ({ ...p, liked: likedIds.has(p.id) })))
    } else {
      setPosts(list)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [fetchPosts])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPosts])

  const ensureProfile = async (): Promise<Profile | null> => {
    if (!user) return null
    if (profile) return profile

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) {
      await refreshProfile()
      return existing
    }

    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pi Member'
    const username = String(fullName).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `user_${user.id.slice(0, 8)}`
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName,
        username,
      })
      .select()
      .single()

    if (createErr) {
      // Race: profile may have been created by trigger
      const { data: again } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (again) {
        await refreshProfile()
        return again
      }
      throw new Error(createErr.message)
    }
    await refreshProfile()
    return created
  }

  const handlePost = async () => {
    const content = newPost.trim()
    if ((!content && !imageFile) || !user) return
    setPosting(true)
    setError('')

    try {
      const me = await ensureProfile()
      if (!me) throw new Error('Could not load your profile. Try signing out and back in.')

      let imageUrl: string | null = null
      if (imageFile) {
        imageUrl = await uploadPostImage(user.id, imageFile)
      }

      const plainBody = content || (imageFile ? 'Shared a photo' : '')
      // Prefer DB stream column; keep content prefix as fallback for older schemas
      const taggedContent = withStreamPrefix(postStream, plainBody)

      let data: Post | null = null
      let insertError: { message: string } | null = null

      const withStream = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: plainBody,
          image_url: imageUrl,
          stream: postStream,
        })
        .select('*')
        .single()

      if (withStream.error && /stream|schema cache|column/i.test(withStream.error.message)) {
        const fallback = await supabase
          .from('posts')
          .insert({
            author_id: user.id,
            content: taggedContent,
            image_url: imageUrl,
          })
          .select('*')
          .single()
        data = fallback.data as Post | null
        insertError = fallback.error
      } else {
        data = withStream.data as Post | null
        insertError = withStream.error
      }

      track('feed_post', { stream: postStream, has_image: !!imageUrl })

      if (insertError || !data) {
        throw new Error(insertError?.message || 'Failed to create post')
      }

      const newItem: Post = {
        ...(data as Post),
        profiles: {
          id: me.id,
          username: me.username,
          full_name: me.full_name,
          avatar_url: me.avatar_url,
          bio: me.bio,
          role: me.role,
          location: me.location,
          website: me.website,
          skills: me.skills,
          interests: me.interests,
          goals: me.goals,
          ai_summary: me.ai_summary,
          experience: me.experience,
          followers_count: me.followers_count,
          following_count: me.following_count,
          posts_count: me.posts_count,
          created_at: me.created_at,
        },
        liked: false,
        likes_count: data.likes_count ?? 0,
        comments_count: data.comments_count ?? 0,
        shares_count: data.shares_count ?? 0,
      }

      setNewPost('')
      clearImage()
      setPosts(ps => [newItem, ...ps.filter(p => p.id !== newItem.id)])
      await fetchPosts()
    } catch (e: any) {
      setError(e?.message || 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string, liked: boolean) => {
    if (!user) { navigate('/login'); return }
    if (liked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
      await notifyPostAuthorOfLike(postId, user.id, actorName)
    }
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: !liked, likes_count: liked ? p.likes_count - 1 : p.likes_count + 1 } : p))
  }

  const handleComment = (postId: string, delta = 1) => {
    setPosts(ps => ps.map(p => p.id === postId
      ? { ...p, comments_count: Math.max(0, p.comments_count + delta) }
      : p))
  }

  const handleDeletePost = async (postId: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Sign in to delete posts.' }
    const { error, count } = await supabase
      .from('posts')
      .delete({ count: 'exact' })
      .eq('id', postId)
      .eq('author_id', user.id)

    if (error) {
      return {
        error: /policy|permission|rls/i.test(error.message)
          ? 'Could not delete — run supabase_post_comment_delete.sql in Supabase.'
          : error.message,
      }
    }
    if (count === 0) {
      return { error: 'Delete failed — you can only delete your own posts.' }
    }
    setPosts(ps => ps.filter(p => p.id !== postId))
    return {}
  }

  return (
    <div className="min-h-full relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-50"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 15% 0%, rgba(20,184,166,0.2), transparent)' }}
      />

      <div className="relative p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0">
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
            >
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-400/90 mb-0.5">
                Pi Social
              </p>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                Opportunity Feed
              </h1>
            </div>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed pl-[52px]">
            An opportunity network — Knowledge, People, Opportunities, Communities, and Twin-aware For you.
          </p>
        </header>

        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 -mx-1 px-1 scrollbar-thin">
          {FEED_STREAMS.map(s => (
            <button
              key={s.id}
              type="button"
              title={s.hint}
              onClick={() => { setActiveStream(s.id); track('feed_stream', { stream: s.id }) }}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                activeStream === s.id
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {user ? (
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-4 sm:p-5 mb-6"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full opacity-20 blur-2xl"
              style={{ background: '#14b8a6' }}
            />
            <div className="relative flex flex-wrap gap-1.5 mb-3">
              {(['knowledge', 'people', 'opportunities', 'communities'] as PostStreamTag[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPostStream(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize border ${
                    postStream === s
                      ? 'border-teal-500/40 bg-teal-500/15 text-teal-100'
                      : 'border-white/10 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <textarea
              value={newPost} onChange={e => setNewPost(e.target.value)}
              placeholder="Share knowledge, people asks, or opportunities…"
              rows={3}
              className="relative w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-teal-500/40 transition-colors resize-none mb-3"
            />
            {imagePreview && (
              <div className="relative mb-3 inline-block max-w-full">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="max-h-56 rounded-xl border border-white/[0.08] object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                  aria-label="Remove photo"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={e => onPickImage(e.target.files?.[0])}
            />
            <div className="relative flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  imageFile
                    ? 'text-teal-300 bg-teal-500/10 border border-teal-500/25'
                    : 'text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
                }`}
              >
                <Image size={14} /> Photo
              </button>
              <button type="button" onClick={handlePost} disabled={posting || (!newPost.trim() && !imageFile)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative overflow-hidden rounded-2xl border border-teal-500/20 p-5 mb-6 text-center"
            style={{ background: 'linear-gradient(160deg, rgba(20,184,166,0.1), rgba(10,14,22,0.9))' }}
          >
            <p className="text-slate-400 text-sm mb-3">Sign in to post and interact with the community.</p>
            <button onClick={() => navigate('/login')}
              className="px-6 py-2 rounded-xl font-bold text-white text-sm hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>Sign In</button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner className="py-16" label="Loading feed…" />
        ) : posts.length === 0 ? (
          <div
            className="rounded-2xl border border-white/[0.07] overflow-hidden"
            style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(10,14,22,0.98))' }}
          >
            <StateMessage
              variant="empty"
              title="No posts yet"
              description="Be the first to share something with the Pi community."
              icon={Sparkles}
            />
          </div>
        ) : visiblePosts.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Nothing in this stream"
            description="Try All, or post with a matching stream tag."
            icon={Sparkles}
          />
        ) : (
          <div className="space-y-3.5">
            {visiblePosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onDeletePost={handleDeletePost}
                actorName={actorName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
