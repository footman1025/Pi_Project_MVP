import { supabase } from './supabase'
import { absoluteOpportunityUrl, type OpportunityItem } from './opportunities'

/** Known niche seed slugs — solo founders & freelancers (0→1 wedge). */
export const NICHE_SEED_SLUGS = [
  'react-cofounder-for-b2b-saas-mvp',
  'freelance-ui-designer-saas-landing',
  'early-customers-ai-productivity-tool',
  'agency-indie-hacker-partnership',
  'part-time-technical-advisor',
  'freelance-content-writer-devtools',
  'cofounder-freelancer-marketplace',
  'beta-testers-focus-timer-app',
] as const

export type NicheCatalogItem = {
  id: string
  title: string
  slug: string
  category: string
  url: string
}

/** Load seeded niche opportunities for share / Traction proof. */
export async function fetchNicheCatalog(): Promise<NicheCatalogItem[]> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, slug, category')
      .eq('is_active', true)
      .in('slug', [...NICHE_SEED_SLUGS])
      .order('created_at', { ascending: false })

    if (error || !data?.length) return []

    return data
      .filter(r => r.slug)
      .map(r => ({
        id: r.id as string,
        title: r.title as string,
        slug: r.slug as string,
        category: (r.category as string) || 'Job',
        url: absoluteOpportunityUrl({
          id: r.id as string,
          slug: r.slug as string,
        }),
      }))
  } catch {
    return []
  }
}

export function isNicheSeedItem(item: Pick<OpportunityItem, 'slug' | 'aiReason'>): boolean {
  if (item.slug && (NICHE_SEED_SLUGS as readonly string[]).includes(item.slug)) return true
  return /niche seed/i.test(item.aiReason || '')
}
