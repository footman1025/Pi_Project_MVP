type StatusKind = 'live' | 'partial' | 'demo' | 'soon'

const STYLES: Record<StatusKind, string> = {
  live: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',
  partial: 'bg-sky-500/15 border-sky-500/25 text-sky-300',
  demo: 'bg-amber-500/15 border-amber-500/25 text-amber-300',
  soon: 'bg-slate-500/15 border-slate-500/25 text-slate-400',
}

const LABELS: Record<StatusKind, string> = {
  live: 'Live',
  partial: 'Partial',
  demo: 'Demo',
  soon: 'Soon',
}

type Props = {
  kind: StatusKind
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export default function StatusBadge({ kind, label, className = '', size = 'sm' }: Props) {
  const pad = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold leading-none ${STYLES[kind]} ${pad} ${className}`}
    >
      {label ?? LABELS[kind]}
    </span>
  )
}

export type { StatusKind }
