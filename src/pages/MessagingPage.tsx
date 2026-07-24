import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, Message, Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { notifyUserOfMessage } from '../lib/notifications'
import { Send, Search, Loader2, MessageCircle, Smile, Paperclip, FileText, Download, ExternalLink, X, Pin, Forward, Trash2, Copy } from 'lucide-react'
import UserAvatar from '../components/UserAvatar'
import MessagePicker from '../components/MessagePicker'
import MessageContextMenu, { CopiedToast, type MessageMenuAction } from '../components/MessageContextMenu'
import MediaCaptureButtons from '../components/MediaCaptureButtons'
import VoiceMessageBubble from '../components/VoiceMessageBubble'
import { encodeSticker, getLargeEmojiContent, isEmojiOnlyMessage } from '../data/stickers'
import {
  uploadMessageFile,
  encodeFileMessage,
  parseFileMessage,
  formatFileSize,
  isImageFile,
  isAudioFile,
  isVideoFile,
} from '../lib/messageFiles'
import {
  encodeReply,
  parseReply,
  getMessagePlainText,
  truncatePreview,
  type ReplyMeta,
} from '../lib/messageReply'
import {
  getReactions,
  toggleReaction,
  getPinnedMessageId,
  setPinnedMessageId,
} from '../lib/messageExtras'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function MessagingPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [replyTo, setReplyTo] = useState<(ReplyMeta & { senderId: string }) | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; msg: Message } | null>(null)
  const [copiedToast, setCopiedToast] = useState(false)
  const [toastLabel, setToastLabel] = useState('Copied')
  const [reactionTick, setReactionTick] = useState(0)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const openedFromQuery = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Deep-link: /messages?u=<userId> opens that chat (from notifications / Message shortcuts)
  useEffect(() => {
    if (!user || loading) return
    const targetId = searchParams.get('u')
    if (!targetId || targetId === user.id) return
    if (openedFromQuery.current === targetId && selectedUser?.id === targetId) return

    let cancelled = false
    const open = async () => {
      const existing = conversations.find(c => c.id === targetId)
      let profileToOpen: Profile | null = existing || null
      if (!profileToOpen) {
        const { data } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle()
        if (cancelled || !data) return
        profileToOpen = data
      }
      if (!profileToOpen || cancelled) return
      openedFromQuery.current = targetId
      await selectConversation(profileToOpen)
      // Clear query so back/refresh doesn't re-force the same open awkwardly
      setSearchParams({}, { replace: true })
    }
    open()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, searchParams, conversations])

  const fetchConversations = async () => {
    if (!user) return
    // Get unique users this user has messaged with
    const { data: sent } = await supabase
      .from('messages')
      .select('receiver_id')
      .eq('sender_id', user.id)
    const { data: received } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user.id)

    const ids = new Set([
      ...(sent || []).map((m: any) => m.receiver_id),
      ...(received || []).map((m: any) => m.sender_id),
    ])
    ids.delete(user.id)

    if (ids.size > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(ids))
      setConversations(data || [])
    } else {
      setConversations([])
    }
    setLoading(false)
  }

  const markMessageNotificationsRead = async (fromUserId: string) => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('actor_id', fromUserId)
      .eq('type', 'message')
      .eq('is_read', false)
    window.dispatchEvent(new CustomEvent('pi:notifications-read'))
  }

  const selectConversation = async (p: Profile) => {
    setSelectedUser(p)
    setPickerOpen(false)
    setReplyTo(null)
    setCtxMenu(null)
    setSelectMode(false)
    setSelectedIds(new Set())
    setForwardMsg(null)
    if (user) setPinnedId(getPinnedMessageId(user.id, p.id))
    await fetchMessages(p.id)
    // Mark messages as read
    if (user) {
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('sender_id', p.id)
        .eq('receiver_id', user.id)
      await markMessageNotificationsRead(p.id)
    }
  }

  const sendMediaFile = async (file: File) => {
    if (!user || !selectedUser) return
    setUploadError('')
    setPickerOpen(false)
    setSending(true)
    try {
      const attached = await uploadMessageFile(user.id, selectedUser.id, file)
      await insertMessage(withReply(encodeFileMessage(attached)))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recording'
      setUploadError(msg)
      throw err
    } finally {
      setSending(false)
    }
  }

  const fetchMessages = async (otherId: string) => {
    if (!user) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  // Realtime messages — dedupe by id so own sends aren't shown twice
  useEffect(() => {
    if (!user || !selectedUser) return
    const channel = supabase
      .channel(`messages:${user.id}:${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if ((msg.sender_id === user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === user.id)) {
          setMessages(m => (m.some(x => x.id === msg.id) ? m : [...m, msg]))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, selectedUser])

  const insertMessage = async (content: string) => {
    if (!content.trim() || !user || !selectedUser) return
    const msg = { sender_id: user.id, receiver_id: selectedUser.id, content: content.trim() }
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) {
      setMessages(m => (m.some(x => x.id === data.id) ? m : [...m, data]))
      const actorName = profile?.full_name || user.email?.split('@')[0] || 'Someone'
      await notifyUserOfMessage(selectedUser.id, user.id, actorName)
    }
    if (!conversations.find(c => c.id === selectedUser.id)) {
      setConversations(c => [selectedUser, ...c])
    }
  }

  const withReply = (content: string) => {
    if (!replyTo) return content
    const wrapped = encodeReply(
      { id: replyTo.id, author: replyTo.author, preview: replyTo.preview },
      content,
    )
    setReplyTo(null)
    return wrapped
  }

  const sendContent = async (content: string) => {
    if (!content.trim()) return
    setSending(true)
    try {
      await insertMessage(withReply(content))
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async () => {
    if (!newMsg.trim()) return
    let content = newMsg.trim()
    // Plain emoji-only sends render as large stickers
    if (isEmojiOnlyMessage(content)) {
      content = encodeSticker(content)
    }
    setNewMsg('')
    await sendContent(content)
  }

  const startReply = useCallback((msg: Message) => {
    if (!user || !selectedUser) return
    const isMe = msg.sender_id === user.id
    const author = isMe
      ? (profile?.full_name || 'You')
      : (selectedUser.full_name || 'User')
    setReplyTo({
      id: msg.id,
      author,
      preview: truncatePreview(getMessagePlainText(msg.content)),
      senderId: msg.sender_id,
    })
    setCtxMenu(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [user, selectedUser, profile])

  const showToast = (label = 'Copied') => {
    setToastLabel(label)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 1400)
  }

  const openContextMenu = (e: { clientX: number; clientY: number; preventDefault: () => void }, msg: Message) => {
    e.preventDefault()
    if (selectMode) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(msg.id)) next.delete(msg.id)
        else next.add(msg.id)
        return next
      })
      return
    }
    setPickerOpen(false)
    setCtxMenu({ x: e.clientX, y: e.clientY, msg })
  }

  const deleteMessage = async (msg: Message) => {
    if (!user || msg.sender_id !== user.id) return
    const { error } = await supabase.from('messages').delete().eq('id', msg.id).eq('sender_id', user.id)
    if (error) {
      // Fallback soft-delete if delete policy not applied yet
      await supabase.from('messages').update({ content: '[[deleted]]' }).eq('id', msg.id).eq('sender_id', user.id)
      setMessages(m => m.map(x => x.id === msg.id ? { ...x, content: '[[deleted]]' } : x))
    } else {
      setMessages(m => m.filter(x => x.id !== msg.id))
    }
    if (pinnedId === msg.id && selectedUser) {
      setPinnedMessageId(user.id, selectedUser.id, null)
      setPinnedId(null)
    }
    showToast('Deleted')
  }

  const forwardToUser = async (peer: Profile, msg: Message) => {
    if (!user) return
    const text = getMessagePlainText(msg.content)
    const body = text.startsWith('📎') || parseFileMessage(parseReply(msg.content)?.body ?? msg.content)
      ? (parseReply(msg.content)?.body ?? msg.content)
      : `↪️ Forwarded:\n${text}`
    const row = { sender_id: user.id, receiver_id: peer.id, content: body }
    const { data } = await supabase.from('messages').insert(row).select().single()
    if (peer.id === selectedUser?.id && data) {
      setMessages(m => (m.some(x => x.id === data.id) ? m : [...m, data]))
    }
    if (!conversations.find(c => c.id === peer.id)) {
      setConversations(c => [peer, ...c])
    }
    const actorName = profile?.full_name || user.email?.split('@')[0] || 'Someone'
    await notifyUserOfMessage(peer.id, user.id, actorName)
    setForwardMsg(null)
    showToast('Forwarded')
  }

  const handleMenuAction = async (action: MessageMenuAction) => {
    if (!ctxMenu || !user) return
    const msg = ctxMenu.msg

    if (typeof action === 'object' && action.type === 'react') {
      toggleReaction(msg.id, action.emoji)
      setReactionTick(t => t + 1)
      setCtxMenu(null)
      return
    }

    if (action === 'reply') {
      startReply(msg)
      return
    }
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(getMessagePlainText(msg.content))
        showToast('Copied')
      } catch { /* ignore */ }
      setCtxMenu(null)
      return
    }
    if (action === 'copyLink') {
      const file = parseFileMessage(parseReply(msg.content)?.body ?? msg.content)
      if (file?.url) {
        try {
          await navigator.clipboard.writeText(file.url)
          showToast('Link copied')
        } catch { /* ignore */ }
      }
      setCtxMenu(null)
      return
    }
    if (action === 'pin' && selectedUser) {
      const next = pinnedId === msg.id ? null : msg.id
      setPinnedMessageId(user.id, selectedUser.id, next)
      setPinnedId(next)
      showToast(next ? 'Pinned' : 'Unpinned')
      setCtxMenu(null)
      return
    }
    if (action === 'forward') {
      setForwardMsg(msg)
      setCtxMenu(null)
      return
    }
    if (action === 'select') {
      setSelectMode(true)
      setSelectedIds(new Set([msg.id]))
      setCtxMenu(null)
      return
    }
    if (action === 'delete') {
      await deleteMessage(msg)
      setCtxMenu(null)
      return
    }
    setCtxMenu(null)
  }

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const pinnedMessage = pinnedId ? messages.find(m => m.id === pinnedId) : null

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (el) {
      const start = el.selectionStart ?? newMsg.length
      const end = el.selectionEnd ?? newMsg.length
      const next = newMsg.slice(0, start) + emoji + newMsg.slice(end)
      setNewMsg(next)
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + emoji.length
        el.setSelectionRange(pos, pos)
      })
    } else {
      setNewMsg(m => m + emoji)
    }
  }

  const sendSticker = async (emoji: string) => {
    setPickerOpen(false)
    await sendContent(encodeSticker(emoji))
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user || !selectedUser) return
    setUploadError('')
    setPickerOpen(false)
    setSending(true)
    try {
      const attached = await uploadMessageFile(user.id, selectedUser.id, file)
      await insertMessage(withReply(encodeFileMessage(attached)))
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to send file')
    } finally {
      setSending(false)
    }
  }

  const searchUsers = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', `%${q}%`)
      .neq('id', user?.id || '')
      .limit(8)
    setSearchResults(data || [])
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6">
        <MessageCircle size={48} className="text-pi-400 mb-4" />
        <h2 className="font-display text-2xl font-extrabold text-white mb-2">Sign in to message</h2>
        <p className="text-slate-400 text-sm mb-6">Connect and chat with other Pi members.</p>
        <button onClick={() => navigate('/login')}
          className="px-8 py-3 rounded-xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>Sign In</button>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden min-w-0 w-full max-w-full h-[calc(100dvh-8.5rem)] lg:h-[calc(100vh-4rem)]">
      {/* Left: Conversations */}
      <div className={`flex flex-col border-r border-white/5 min-w-0 ${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}
        style={{ background: 'rgba(8,13,26,0.8)' }}>
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white mb-3">Messages</h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people to message..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Search results */}
          {searchQuery && (
            <div className="p-2 border-b border-white/5">
              <p className="text-xs text-slate-500 px-2 py-1 uppercase tracking-wider font-semibold">People</p>
              {searching ? (
                <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-pi-400" /></div>
              ) : searchResults.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-3">No users found</p>
              ) : (
                searchResults.map(p => (
                  <button key={p.id} onClick={() => { setSearchQuery(''); selectConversation(p) }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left">
                    <UserAvatar url={p.avatar_url} name={p.full_name} id={p.id} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{p.full_name}</p>
                      <p className="text-slate-500 text-xs truncate">{p.role || 'Pi Member'}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Conversations */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-pi-400" /></div>
          ) : conversations.length === 0 && !searchQuery ? (
            <div className="text-center py-12 px-4">
              <MessageCircle size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No conversations yet.</p>
              <p className="text-slate-600 text-xs mt-1">Search for people to start chatting.</p>
            </div>
          ) : (
            conversations.map(c => (
              <button key={c.id} onClick={() => selectConversation(c)}
                className={`flex items-center gap-3 w-full px-4 py-3 transition-all text-left ${selectedUser?.id === c.id ? 'bg-pi-500/10 border-r-2 border-pi-500' : 'hover:bg-white/5'}`}>
                <UserAvatar url={c.avatar_url} name={c.full_name} id={c.id} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{c.full_name}</p>
                  <p className="text-slate-500 text-xs truncate">{c.role || 'Pi Member'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <div className={`flex-1 flex flex-col min-w-0 max-w-full overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <MessageCircle size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg font-semibold">Select a conversation</p>
            <p className="text-slate-600 text-sm">or search for someone to message</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-4 border-b border-white/5 flex-shrink-0 min-w-0"
              style={{ background: 'rgba(14,20,25,0.8)' }}>
              <button onClick={() => setSelectedUser(null)} className="md:hidden text-slate-400 hover:text-white mr-1 flex-shrink-0">←</button>
              <UserAvatar
                url={selectedUser.avatar_url}
                name={selectedUser.full_name}
                id={selectedUser.id}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm truncate">{selectedUser.full_name}</p>
                <p className="text-slate-500 text-xs truncate">{selectedUser.role || 'Pi Member'}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs text-emerald-400 hidden xs:inline sm:inline">Online</span>
              </div>
            </div>

            {pinnedMessage && (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`msg-${pinnedMessage.id}`)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }}
                className="flex items-center gap-2 px-3 sm:px-5 py-2 border-b border-teal-500/20 bg-teal-500/10 text-left w-full min-w-0"
              >
                <Pin size={14} className="text-teal-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider">Pinned message</p>
                  <p className="text-xs text-slate-300 truncate">{getMessagePlainText(pinnedMessage.content)}</p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    if (!user || !selectedUser) return
                    setPinnedMessageId(user.id, selectedUser.id, null)
                    setPinnedId(null)
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10"
                  aria-label="Unpin"
                >
                  <X size={14} />
                </button>
              </button>
            )}

            {selectMode && (
              <div className="flex items-center gap-2 px-3 sm:px-5 py-2 border-b border-white/10 bg-white/[0.03]">
                <p className="text-xs text-slate-300 flex-1">{selectedIds.size} selected</p>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={async () => {
                    const texts = messages.filter(m => selectedIds.has(m.id)).map(m => getMessagePlainText(m.content))
                    try {
                      await navigator.clipboard.writeText(texts.join('\n\n'))
                      showToast('Copied')
                    } catch { /* ignore */ }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
                  title="Copy"
                >
                  <Copy size={15} />
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size !== 1}
                  onClick={() => {
                    const msg = messages.find(m => selectedIds.has(m.id))
                    if (msg) setForwardMsg(msg)
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
                  title="Forward"
                >
                  <Forward size={15} />
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={async () => {
                    const mine = messages.filter(m => selectedIds.has(m.id) && m.sender_id === user.id)
                    for (const m of mine) await deleteMessage(m)
                    setSelectMode(false)
                    setSelectedIds(new Set())
                  }}
                  className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }}
                  className="px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 sm:px-5 py-4 space-y-3 min-w-0 w-full box-border">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No messages yet. Say hello! 👋</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user.id
                const replyParsed = parseReply(msg.content)
                const body = replyParsed?.body ?? msg.content
                const isDeleted = body === '[[deleted]]'
                const largeEmoji = isDeleted ? null : getLargeEmojiContent(body)
                const file = isDeleted ? null : parseFileMessage(body)
                const reactions = getReactions(msg.id)
                void reactionTick
                const isSelected = selectedIds.has(msg.id)
                return (
                  <div
                    id={`msg-${msg.id}`}
                    key={msg.id}
                    className={`flex items-end gap-1.5 w-full max-w-full min-w-0 box-border ${isMe ? 'flex-row-reverse' : 'flex-row'} ${
                      isSelected ? 'bg-teal-500/10 rounded-xl px-1 py-0.5' : ''
                    }`}
                    onContextMenu={e => openContextMenu(e, msg)}
                    onClick={() => {
                      if (!selectMode) return
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(msg.id)) next.delete(msg.id)
                        else next.add(msg.id)
                        return next
                      })
                    }}
                    onTouchStart={e => {
                      const touch = e.touches[0]
                      clearLongPress()
                      longPressTimer.current = setTimeout(() => {
                        openContextMenu(
                          { clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} },
                          msg,
                        )
                      }, 480)
                    }}
                    onTouchEnd={clearLongPress}
                    onTouchMove={clearLongPress}
                  >
                    {selectMode && (
                      <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center self-center ${
                        isSelected ? 'bg-teal-500 border-teal-400' : 'border-white/30'
                      }`}>
                        {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                      </div>
                    )}
                    <div className="shrink-0 self-end">
                      <UserAvatar
                        url={isMe ? profile?.avatar_url : selectedUser.avatar_url}
                        name={isMe ? profile?.full_name : selectedUser.full_name}
                        id={isMe ? user.id : selectedUser.id}
                        size={24}
                        rounded="rounded-lg"
                      />
                    </div>
                    <div className="min-w-0 max-w-[calc(100%-2.75rem)] sm:max-w-[72%] overflow-hidden">
                      {isDeleted ? (
                        <div className={`px-3 py-2 rounded-2xl text-sm italic ${isMe ? 'text-white/70 bg-teal-700/50' : 'text-slate-500 bg-white/5 border border-white/10'}`}>
                          Message deleted
                        </div>
                      ) : (
                        <>
                      {replyParsed && (
                        <div
                          className={`mb-1 px-2.5 py-1.5 rounded-xl border-l-2 text-[11px] leading-snug ${
                            isMe
                              ? 'border-white/50 bg-black/20 text-white/80'
                              : 'border-teal-400/60 bg-white/5 text-slate-400'
                          }`}
                        >
                          <p className={`font-semibold mb-0.5 ${isMe ? 'text-white' : 'text-teal-300'}`}>
                            {replyParsed.meta.author}
                          </p>
                          <p className="truncate">{replyParsed.meta.preview}</p>
                        </div>
                      )}
                      {largeEmoji ? (
                        <div
                          className={`leading-none select-none ${isMe ? 'text-right' : 'text-left'}`}
                          style={{ fontSize: 'clamp(2rem, 10vw, 3.5rem)' }}
                          title="Sticker"
                        >
                          {largeEmoji}
                        </div>
                      ) : file ? (
                        isAudioFile(file.type) ? (
                          <VoiceMessageBubble url={file.url} size={file.size} isMe={isMe} />
                        ) : (
                        <div className={`rounded-2xl overflow-hidden border ${isMe ? 'border-white/10' : 'border-white/10 bg-white/5'}`}
                          style={isMe && !isImageFile(file.type) && !isVideoFile(file.type) ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : {}}>
                          {isImageFile(file.type) ? (
                            <a href={file.url} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={file.url}
                                alt={file.name}
                                className="max-w-full max-h-64 object-cover block"
                              />
                              <div className={`flex items-center gap-2 px-3 py-2 text-xs ${isMe ? 'bg-teal-700/80 text-white' : 'bg-white/5 text-slate-300'}`}>
                                <ExternalLink size={12} />
                                <span className="truncate">{file.name}</span>
                              </div>
                            </a>
                          ) : isVideoFile(file.type) ? (
                            <div className="bg-black/40">
                              <video
                                controls
                                playsInline
                                preload="metadata"
                                src={file.url}
                                className="w-full max-h-64 object-contain bg-black"
                              />
                              <div className={`flex items-center gap-2 px-3 py-2 text-xs ${isMe ? 'bg-teal-700/80 text-white' : 'bg-white/5 text-slate-300'}`}>
                                <span className="truncate">Video · {formatFileSize(file.size)}</span>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              download={file.name}
                              className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${isMe ? 'text-white' : 'text-slate-200'}`}
                            >
                              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-white/20' : 'bg-white/10'}`}>
                                <FileText size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{file.name}</p>
                                <p className={`text-xs ${isMe ? 'text-white/70' : 'text-slate-500'}`}>{formatFileSize(file.size)}</p>
                              </div>
                              <Download size={16} className="flex-shrink-0 opacity-80" />
                            </a>
                          )}
                        </div>
                        )
                      ) : (
                        <div className={`px-3 sm:px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words [overflow-wrap:anywhere] ${isMe
                          ? 'text-white rounded-br-sm'
                          : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'}`}
                          style={isMe ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : {}}>
                          {body}
                        </div>
                      )}
                        </>
                      )}
                      {reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {reactions.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                toggleReaction(msg.id, emoji)
                                setReactionTick(t => t + 1)
                              }}
                              className="px-1.5 py-0.5 rounded-full text-sm bg-white/10 border border-white/10 hover:bg-white/15"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className={`text-xs text-slate-600 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {pinnedId === msg.id && <Pin size={10} className="inline text-teal-500 mr-1" />}
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-2 sm:px-4 py-3 border-t border-white/5 flex-shrink-0 relative min-w-0 w-full max-w-full box-border" style={{ background: 'rgba(8,13,26,0.9)' }}>
              <MessagePicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onEmoji={insertEmoji}
                onSticker={sendSticker}
              />
              {uploadError && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {uploadError}
                </div>
              )}
              {replyTo && (
                <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl border border-teal-500/25 bg-teal-500/10 min-w-0">
                  <div className="flex-1 min-w-0 border-l-2 border-teal-400 pl-2.5">
                    <p className="text-teal-300 text-xs font-semibold truncate">Replying to {replyTo.author}</p>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{replyTo.preview}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 flex-shrink-0"
                    aria-label="Cancel reply"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.json,audio/*,video/mp4,video/webm"
                onChange={handleFilePick}
              />
              <div className="flex gap-1.5 sm:gap-2 items-center w-full max-w-full min-w-0">
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setPickerOpen(o => !o)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    pickerOpen ? 'bg-pi-500/20 text-pi-300' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Emoji & stickers"
                  aria-expanded={pickerOpen}
                  aria-label="Emoji and stickers"
                >
                  <Smile size={18} />
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => fileRef.current?.click()}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <MediaCaptureButtons
                  disabled={sending}
                  onCaptured={sendMediaFile}
                  onError={msg => setUploadError(msg)}
                />
                <div className="flex-1 min-w-0 relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-pi-500/50 transition-colors overflow-hidden">
                  <input
                    ref={inputRef}
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                      if (e.key === 'Escape' && replyTo) setReplyTo(null)
                    }}
                    onFocus={() => setPickerOpen(false)}
                    placeholder={replyTo ? `Reply…` : `Message…`}
                    className="w-full min-w-0 bg-transparent px-3 sm:px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={sending || !newMsg.trim()}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  aria-label="Send message"
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>

            {ctxMenu && (
              <MessageContextMenu
                x={ctxMenu.x}
                y={ctxMenu.y}
                isMe={ctxMenu.msg.sender_id === user.id}
                canDelete={ctxMenu.msg.sender_id === user.id}
                canCopyLink={!!parseFileMessage(parseReply(ctxMenu.msg.content)?.body ?? ctxMenu.msg.content)}
                onAction={handleMenuAction}
                onClose={() => setCtxMenu(null)}
              />
            )}
            {forwardMsg && (
              <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-black/70 p-4">
                <div
                  className="w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, #12182b, #0a0f1c)' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <p className="text-white text-sm font-semibold">Forward to…</p>
                    <button type="button" onClick={() => setForwardMsg(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {conversations.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-8">No conversations yet</p>
                    ) : (
                      conversations.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => forwardToUser(c, forwardMsg)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-white/5 text-left"
                        >
                          <UserAvatar url={c.avatar_url} name={c.full_name} id={c.id} size={36} />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{c.full_name}</p>
                            <p className="text-slate-500 text-xs truncate">{c.role || 'Pi Member'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            <CopiedToast show={copiedToast} label={toastLabel} />
          </>
        )}
      </div>
    </div>
  )
}
