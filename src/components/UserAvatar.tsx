import { useEffect, useState } from 'react'
import { avatarGradient, avatarInitial } from '../lib/avatar'

interface Props {
  url?: string | null
  name?: string | null
  id?: string | null
  size?: number
  className?: string
  rounded?: string
}

/** Shows profile photo when available, otherwise initial on a colored background. */
export default function UserAvatar({
  url,
  name,
  id,
  size = 40,
  className = '',
  rounded = 'rounded-xl',
}: Props) {
  const [broken, setBroken] = useState(false)
  const letter = avatarInitial(name)

  // Reset error state whenever the photo URL changes
  useEffect(() => {
    setBroken(false)
  }, [url])

  const showImg = !!url && !broken

  if (showImg) {
    return (
      <img
        key={url!}
        src={url!}
        alt={name || 'Avatar'}
        className={`${rounded} object-cover flex-shrink-0 bg-white/5 ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    )
  }

  return (
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
}
