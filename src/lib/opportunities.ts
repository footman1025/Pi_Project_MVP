import { mockOpportunities } from '../data/mockData'
import { supabase } from './supabase'

/** Normalized opportunity shape used by UI + scoring (works for DB or mock). */
export type OpportunityItem = {
  id: string
  title: string
  subtitle: string
  prize: string
  deadline: string
  iconName: string
  iconColor: string
  category: string
  match: number
  color: string
  border: string
  aiReason: string
}

export type OpportunitiesResult = {
  items: OpportunityItem[]
  /** true when rows came from Supabase; false when using mock fallback */
  isLive: boolean
}

type DbRow = {
  id: string
  title: string
  subtitle: string | null
  prize: string | null
  deadline: string | null
  category: string
  icon_name: string | null
  icon_color: string | null
  color: string | null
  border: string | null
  ai_reason: string | null
  baseline_match: number | null
}

function fromMock(): OpportunityItem[] {
  return mockOpportunities.map(o => ({
    id: String(o.id),
    title: o.title,
    subtitle: o.subtitle,
    prize: o.prize,
    deadline: o.deadline,
    iconName: o.iconName,
    iconColor: o.iconColor,
    category: o.category,
    match: o.match,
    color: o.color,
    border: o.border,
    aiReason: o.aiReason,
  }))
}

function fromDb(row: DbRow): OpportunityItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    prize: row.prize || '',
    deadline: row.deadline || 'Open',
    iconName: row.icon_name || 'Briefcase',
    iconColor: row.icon_color || 'from-amber-500 to-orange-600',
    category: row.category,
    match: typeof row.baseline_match === 'number' ? row.baseline_match : 70,
    color: row.color || 'from-amber-500/20 to-orange-500/10',
    border: row.border || 'border-amber-500/30',
    aiReason: row.ai_reason || '',
  }
}

/**
 * Load active opportunities from Supabase.
 * Falls back to mock catalog if the table is missing, empty, or errors.
 */
export async function fetchOpportunities(): Promise<OpportunitiesResult> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(
        'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match',
      )
      .eq('is_active', true)
      .order('baseline_match', { ascending: false })

    if (error || !data?.length) {
      return { items: fromMock(), isLive: false }
    }

    return { items: (data as DbRow[]).map(fromDb), isLive: true }
  } catch {
    return { items: fromMock(), isLive: false }
  }
}
