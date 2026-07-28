import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { avatarGradient, avatarInitial } from '../lib/avatar'
import { profilePath } from '../lib/urls'
import { supabase } from '../lib/supabase'

const usernameCache = new Map<string, string>()

interface Props {
  url?: string | null
  name?: string | null
  id?: string | null
  /** When set, tap opens `/p/{username}` */
  username?: string | null
  /** Optional `location.state.from` for Back on profile */
  from?: string
  size?: number
  className?: string
  rounded?: string
}

/** Shows profile photo when available, otherwise initial. Tap opens account when username (or resolvable id) exists. */
export default function UserAvatar({
  url,
  name,
  id,
  username,
  from,
  size = 40,
  className = '',
  rounded = 'rounded-xl',
}: Props) {
  const navigate = useNavigate()
  const [broken, setBroken] = useState(false)
  const [resolvedUser, setResolvedUser] = useState<string | null>(username?.trim() || null)
  const letter = avatarInitial(name)

  useEffect(() => {
    setBroken(false)
  }, [url])

  useEffect(() => {
    const direct = username?.trim() || null
    if (direct) {
      setResolvedUser(direct)
      if (id) usernameCache.set(id, direct)
      return
    }
    if (!id) {
      setResolvedUser(null)
      return
    }
    const cached = usernameCache.get(id)
    if (cached) {
      setResolvedUser(cached)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('username')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        const u = data?.username?.trim() || null
        if (u) usernameCache.set(id, u)
        setResolvedUser(u)
      })
    return () => { cancelled = true }
  }, [username, id])

  const path = profilePath(resolvedUser)
  const canOpen = !!path

  const openProfile = (e: React.MouseEvent) => {
    if (!path) return
    e.stopPropagation()
    e.preventDefault()
    navigate(path, from ? { state: { from } } : undefined)
  }

  const showImg = !!url && !broken
  const interactive = canOpen
    ? `cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-pi-500/40 transition-all ${rounded}`
    : rounded

  const inner = showImg ? (
    <img
      key={url!}
      src={url!}
      alt={name || 'Avatar'}
      className={`${rounded} object-cover flex-shrink-0 bg-white/5 w-full h-full ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  ) : (
    <div
      className={`${rounded} flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        background: avatarGradient(id || name || letter),
        fontSize: Math.max(12, size * 0.38),
      }}
    >
      {letter}
    </div>
  )

  if (!canOpen) return inner

  return (
    <button
      type="button"
      onClick={openProfile}
      className={`flex-shrink-0 p-0 border-0 bg-transparent ${interactive}`}
      style={{ width: size, height: size }}
      aria-label={`Open ${name || resolvedUser}'s profile`}
      title={`View @${resolvedUser}`}
    >
      {inner}
    </button>
  )
}
