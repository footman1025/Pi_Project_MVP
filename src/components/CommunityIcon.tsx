import {
  Bot, Boxes, Briefcase, Camera, Cpu, Globe2, HeartPulse, Music2,
  Palette, Rocket, Sparkles, TrendingUp, UsersRound, type LucideIcon,
} from 'lucide-react'

const NAME_RULES: Array<{ test: RegExp; Icon: LucideIcon }> = [
  { test: /\bai\b|artificial|founders?\s*hub|digital\s*twin/i, Icon: Bot },
  { test: /startup|global\s*startup|entrepreneur/i, Icon: Rocket },
  { test: /creator|economy\s*lab|influencer/i, Icon: Sparkles },
  { test: /web3|crypto|blockchain|defi/i, Icon: Boxes },
  { test: /design|systems?\s*guild|ui|ux/i, Icon: Palette },
  { test: /venture|capital|investor|vc\b|finance/i, Icon: TrendingUp },
  { test: /health|medtech|bio|clinical/i, Icon: HeartPulse },
  { test: /music|audio|sound|production/i, Icon: Music2 },
  { test: /network|community|hub|forum/i, Icon: Globe2 },
]

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Technology: Cpu,
  Business: Briefcase,
  Creator: Camera,
  Design: Palette,
  Finance: TrendingUp,
  Health: HeartPulse,
  Music: Music2,
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Technology: 'from-teal-400 via-pi-500 to-cyan-700',
  Business: 'from-sky-400 via-blue-500 to-indigo-700',
  Creator: 'from-fuchsia-400 via-pink-500 to-rose-700',
  Design: 'from-amber-300 via-orange-500 to-orange-700',
  Finance: 'from-lime-300 via-emerald-500 to-green-700',
  Health: 'from-rose-400 via-red-500 to-pink-700',
  Music: 'from-violet-400 via-teal-500 to-slate-800',
}

function resolveIcon(name?: string | null, category?: string | null): LucideIcon {
  const n = name || ''
  for (const rule of NAME_RULES) {
    if (rule.test.test(n)) return rule.Icon
  }
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category]
  return UsersRound
}

function resolveGradient(category?: string | null): string {
  if (category && CATEGORY_GRADIENTS[category]) return CATEGORY_GRADIENTS[category]
  return 'from-teal-400 via-pi-500 to-cyan-700'
}

type Size = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<Size, { box: string; icon: number }> = {
  sm: { box: 'w-8 h-8 rounded-xl', icon: 15 },
  md: { box: 'w-12 h-12 rounded-2xl', icon: 22 },
  lg: { box: 'w-14 h-14 rounded-2xl', icon: 26 },
}

type Props = {
  name?: string | null
  category?: string | null
  size?: Size
  className?: string
}

/** Modern Lucide community avatar — ignores DB emoji icons. */
export default function CommunityIcon({ name, category, size = 'md', className = '' }: Props) {
  const Icon = resolveIcon(name, category)
  const gradient = resolveGradient(category)
  const s = SIZE_MAP[size]

  return (
    <div
      className={`relative ${s.box} flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg shadow-black/25 ${className}`}
      aria-hidden
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.35),transparent_55%)]" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/25" />
      <Icon
        size={s.icon}
        strokeWidth={1.75}
        className="relative text-white drop-shadow-sm"
      />
    </div>
  )
}
