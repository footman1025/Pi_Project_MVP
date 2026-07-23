import { Loader2 } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = { sm: 16, md: 24, lg: 36 }

export default function LoadingSpinner({ size = 'md', label, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 size={sizes[size]} className="animate-spin text-pi-400" />
      {label && <p className="text-slate-400 text-sm">{label}</p>}
    </div>
  )
}
