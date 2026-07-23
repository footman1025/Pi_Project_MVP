import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, Message, Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { notifyUserOfMessage } from '../lib/notifications'
import { Send, Search, Loader2, MessageCircle, Smile, Paperclip, FileText, Download, ExternalLink, X } from 'lucide-react'
import UserAvatar from '../components/UserAvatar'
import MessagePicker from '../components/MessagePicker'
import MessageContextMenu, { CopiedToast, type MessageMenuAction } from '../components/MessageContextMenu'
import { encodeSticker, getLargeEmojiContent, isEmojiOnlyMessage } from '../data/stickers'
import {
  uploadMessageFile,
  encodeFileMessage,
  parseFileMessage,
  formatFileSize,
  isImageFile,
} from '../lib/messageFiles'
import {
  encodeReply,
  parseReply,
  getMessagePlainText,
  truncatePreview,
  type ReplyMeta,
} from '../lib/messageReply'

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

  const showCopied = () => {
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 1400)
  }

  const openContextMenu = (e: { clientX: number; clientY: number; preventDefault: () => void }, msg: Message) => {
    e.preventDefault()
    setPickerOpen(false)
    setCtxMenu({ x: e.clientX, y: e.clientY, msg })
  }

  const handleMenuAction = async (action: MessageMenuAction) => {
    if (!ctxMenu) return
    const msg = ctxMenu.msg
    if (action === 'reply') {
      startReply(msg)
      return
    }
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(getMessagePlainText(msg.content))
        showCopied()
      } catch { /* ignore */ }
      setCtxMenu(null)
      return
    }
    if (action === 'copyLink') {
      const file = parseFileMessage(parseReply(msg.content)?.body ?? msg.content)
      if (file?.url) {
        try {
          await navigator.clipboard.writeText(file.url)
          showCopied()
        } catch { /* ignore */ }
      }
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
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
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
                const largeEmoji = getLargeEmojiContent(body)
                const file = parseFileMessage(body)
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 w-full max-w-full min-w-0 box-border ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    onContextMenu={e => openContextMenu(e, msg)}
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
                        <div className={`rounded-2xl overflow-hidden border ${isMe ? 'border-white/10' : 'border-white/10 bg-white/5'}`}
                          style={isMe && !isImageFile(file.type) ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : {}}>
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
                      ) : (
                        <div className={`px-3 sm:px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words [overflow-wrap:anywhere] ${isMe
                          ? 'text-white rounded-br-sm'
                          : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'}`}
                          style={isMe ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : {}}>
                          {body}
                        </div>
                      )}
                      <p className={`text-xs text-slate-600 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 sm:px-4 py-3 border-t border-white/5 flex-shrink-0 relative min-w-0" style={{ background: 'rgba(8,13,26,0.9)' }}>
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
                <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl border border-teal-500/25 bg-teal-500/10">
                  <div className="flex-1 min-w-0 border-l-2 border-teal-400 pl-2.5">
                    <p className="text-teal-300 text-xs font-semibold">Replying to {replyTo.author}</p>
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
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setPickerOpen(o => !o)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    pickerOpen ? 'bg-pi-500/20 text-pi-300' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Emoji & stickers"
                >
                  <Smile size={18} />
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => fileRef.current?.click()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <div className="flex-1 relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-pi-500/50 transition-colors">
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
                    placeholder={replyTo ? `Reply to ${replyTo.author}...` : `Message ${selectedUser.full_name}...`}
                    className="flex-1 bg-transparent px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none min-w-0"
                  />
                </div>
                <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>

            {ctxMenu && (
              <MessageContextMenu
                x={ctxMenu.x}
                y={ctxMenu.y}
                canCopyLink={!!parseFileMessage(parseReply(ctxMenu.msg.content)?.body ?? ctxMenu.msg.content)}
                onAction={handleMenuAction}
                onClose={() => setCtxMenu(null)}
              />
            )}
            <CopiedToast show={copiedToast} />
          </>
        )}
      </div>
    </div>
  )
}
