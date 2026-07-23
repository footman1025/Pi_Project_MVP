import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Message, Profile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { notifyUserOfMessage } from '../lib/notifications'
import { Send, Search, Loader2, MessageCircle } from 'lucide-react'

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
  const [conversations, setConversations] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    fetchConversations()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    }
    setLoading(false)
  }

  const selectConversation = async (p: Profile) => {
    setSelectedUser(p)
    await fetchMessages(p.id)
    // Mark messages as read
    if (user) {
      await supabase.from('messages')
        .update({ is_read: true })
        .eq('sender_id', p.id)
        .eq('receiver_id', user.id)
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

  // Realtime messages
  useEffect(() => {
    if (!user || !selectedUser) return
    const channel = supabase
      .channel(`messages:${user.id}:${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if ((msg.sender_id === user.id && msg.receiver_id === selectedUser.id) ||
            (msg.sender_id === selectedUser.id && msg.receiver_id === user.id)) {
          setMessages(m => [...m, msg])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, selectedUser])

  const sendMessage = async () => {
    if (!newMsg.trim() || !user || !selectedUser) return
    setSending(true)
    const msg = { sender_id: user.id, receiver_id: selectedUser.id, content: newMsg.trim() }
    const { data } = await supabase.from('messages').insert(msg).select().single()
    if (data) {
      setMessages(m => [...m, data])
      const actorName = profile?.full_name || user.email?.split('@')[0] || 'Someone'
      await notifyUserOfMessage(selectedUser.id, user.id, actorName)
    }
    setNewMsg('')
    setSending(false)
    // Add to conversations if not there
    if (!conversations.find(c => c.id === selectedUser.id)) {
      setConversations(c => [selectedUser, ...c])
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
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left: Conversations */}
      <div className={`flex flex-col border-r border-white/5 ${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}
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
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                      {p.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {c.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
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
      <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
          <div className="flex flex-col items-center justify-center flex-1">
            <MessageCircle size={48} className="text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg font-semibold">Select a conversation</p>
            <p className="text-slate-600 text-sm">or search for someone to message</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 flex-shrink-0"
              style={{ background: 'rgba(14,20,25,0.8)' }}>
              <button onClick={() => setSelectedUser(null)} className="md:hidden text-slate-400 hover:text-white mr-1">←</button>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                {selectedUser.full_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selectedUser.full_name}</p>
                <p className="text-slate-500 text-xs">{selectedUser.role || 'Pi Member'}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs text-emerald-400">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No messages yet. Say hello! 👋</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end"
                        style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                        {selectedUser.full_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`max-w-[72%]`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                        ? 'text-white rounded-br-sm'
                        : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'}`}
                        style={isMe ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)' } : {}}>
                        {msg.content}
                      </div>
                      <p className={`text-xs text-slate-600 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/5 flex-shrink-0" style={{ background: 'rgba(8,13,26,0.9)' }}>
              <div className="flex gap-2">
                <input
                  value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={`Message ${selectedUser.full_name}...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-pi-500/50 transition-colors"
                />
                <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-105 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
