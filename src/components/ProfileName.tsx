import { useNavigate } from 'react-router-dom'
import { profilePath } from '../lib/urls'

type Props = {
  name?: string | null
  username?: string | null
  from?: string
  className?: string
  children?: React.ReactNode
}

/** Clickable display name → `/p/{username}` when username exists */
export default function ProfileName({ name, username, from, className = '', children }: Props) {
  const navigate = useNavigate()
  const path = profilePath(username)
  const label = children ?? name ?? username ?? 'Member'

  if (!path) {
    return <span className={className}>{label}</span>
  }

  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        e.preventDefault()
        navigate(path, from ? { state: { from } } : undefined)
      }}
      className={`text-left hover:text-pi-300 transition-colors cursor-pointer ${className}`}
      title={`View @${username}`}
    >
      {label}
    </button>
  )
}
