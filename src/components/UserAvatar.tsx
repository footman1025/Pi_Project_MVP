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
  const letter = avatarInitial(name)
  const style = {
    width: size,
    height: size,
    background: url ? undefined : avatarGradient(id || name || letter),
  }

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Avatar'}
        className={`${rounded} object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`${rounded} flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{ ...style, fontSize: Math.max(12, size * 0.38) }}
    >
      {letter}
    </div>
  )
}
