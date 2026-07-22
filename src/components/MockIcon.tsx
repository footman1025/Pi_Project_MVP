import {
  Trophy, Banknote, Globe2, UserRoundPlus, Palette, Rocket,
  Bot, Sparkles, Link2, PenTool, TrendingUp, HeartPulse, Music,
  LucideProps
} from 'lucide-react'

const icons: Record<string, React.FC<LucideProps>> = {
  Trophy,
  Banknote,
  Globe2,
  UserRoundPlus,
  Palette,
  Rocket,
  Bot,
  Sparkles,
  Link2,
  PenTool,
  TrendingUp,
  HeartPulse,
  Music,
}

interface Props {
  name: string
  size?: number
  className?: string
}

export default function MockIcon({ name, size = 18, className = 'text-white' }: Props) {
  const Icon = icons[name]
  if (!Icon) return <span className={className}>●</span>
  return <Icon size={size} className={className} />
}
