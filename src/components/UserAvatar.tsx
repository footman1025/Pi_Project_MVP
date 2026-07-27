import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { avatarGradient, avatarInitial } from '../lib/avatar'

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

/** Shows profile photo when available, otherwise initial on a colored background. */
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
  const letter = avatarInitial(name)
  const canOpen = !!username?.trim()

  useEffect(() => {
    setBroken(false)
  }, [url])

  const openProfile = (e: React.MouseEvent) => {
    if (!canOpen) return
    e.stopPropagation()
    e.preventDefault()
    navigate(`/p/${username!.trim()}`, from ? { state: { from } } : undefined)
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
      aria-label={`Open ${name || username}'s profile`}
      title={`View @${username}`}
    >
      {inner}
    </button>
  )
}
