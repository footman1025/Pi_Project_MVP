import { AlertCircle, Inbox, Loader2, type LucideIcon } from 'lucide-react'

type Variant = 'loading' | 'empty' | 'error'

interface Props {
  variant: Variant
  title: string
  description?: string
  icon?: LucideIcon
  action?: { label: string; onClick: () => void }
  className?: string
}

const defaults: Record<Variant, LucideIcon> = {
  loading: Loader2,
  empty: Inbox,
  error: AlertCircle,
}

export default function StateMessage({
  variant,
  title,
  description,
  icon,
  action,
  className = '',
}: Props) {
  const Icon = icon || defaults[variant]
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
          variant === 'error'
            ? 'bg-red-500/10 text-red-400'
            : variant === 'loading'
              ? 'bg-pi-500/10 text-pi-400'
              : 'bg-white/5 text-slate-400'
        }`}
      >
        <Icon size={26} className={variant === 'loading' ? 'animate-spin' : ''} />
      </div>
      <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
      {description && <p className="text-slate-400 text-sm max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
