import { mockOpportunities } from '../data/mockData'
import { supabase } from './supabase'
import { track } from './analytics'
import { friendlyNetworkError, isOnline } from './messagingReliability'
import { isFeaturedActive } from './opportunityFeatured'

/** Normalized opportunity shape used by UI + scoring (works for DB, mock, or local). */
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
  description?: string
  location?: string
  slug?: string | null
  ownerId?: string | null
  source?: 'platform' | 'member' | string
  isFeatured?: boolean
  featuredUntil?: string | null
  featuredAt?: string | null
}

export type OpportunitiesResult = {
  items: OpportunityItem[]
  /** true when rows came from Supabase; false when using mock fallback */
  isLive: boolean
}

export const CREATE_CATEGORIES = [
  'Job',
  'Service',
  'Partnership',
  'Co-founder',
  'Talent',
  'Project',
  'Funding',
  'Community',
  'Competition',
  'Accelerator',
] as const

export type CreateCategory = (typeof CREATE_CATEGORIES)[number]

const LOCAL_KEY = 'pi_user_opportunities_v1'

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
  description?: string | null
  location?: string | null
  slug?: string | null
  owner_id?: string | null
  source?: string | null
  is_featured?: boolean | null
  featured_until?: string | null
  featured_at?: string | null
}

const STYLE_BY_CATEGORY: Record<string, { iconName: string; iconColor: string; color: string; border: string }> = {
  Job: { iconName: 'Briefcase', iconColor: 'from-teal-500 to-pi-600', color: 'from-teal-500/20 to-cyan-500/10', border: 'border-teal-500/30' },
  Service: { iconName: 'Sparkles', iconColor: 'from-amber-500 to-orange-600', color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30' },
  Partnership: { iconName: 'Link2', iconColor: 'from-cyan-500 to-blue-600', color: 'from-cyan-500/20 to-blue-500/10', border: 'border-cyan-500/30' },
  'Co-founder': { iconName: 'UserRoundPlus', iconColor: 'from-cyan-500 to-teal-600', color: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/30' },
  Talent: { iconName: 'Palette', iconColor: 'from-pink-500 to-rose-600', color: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/30' },
  Project: { iconName: 'Rocket', iconColor: 'from-violet-500 to-purple-600', color: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/30' },
  Funding: { iconName: 'Banknote', iconColor: 'from-emerald-500 to-teal-600', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30' },
  Community: { iconName: 'Globe2', iconColor: 'from-pi-500 to-teal-600', color: 'from-pi-500/20 to-violet-500/10', border: 'border-pi-500/30' },
  Competition: { iconName: 'Trophy', iconColor: 'from-yellow-500 to-amber-600', color: 'from-yellow-500/20 to-amber-500/10', border: 'border-yellow-500/30' },
  Accelerator: { iconName: 'Rocket', iconColor: 'from-teal-500 to-pi-600', color: 'from-pi-500/20 to-teal-500/10', border: 'border-pi-500/30' },
}

function styleFor(category: string) {
  return STYLE_BY_CATEGORY[category] || STYLE_BY_CATEGORY.Job
}

/** Clean SEO slug from title — no random suffix (e.g. the-opportunity-for-everyone). */
export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'opportunity'
}

/** Strip legacy random suffix like -167ud from older URLs. */
export function stripLegacySlugSuffix(slug: string): string {
  const s = slug.trim()
  // Random suffix was 5 base36 chars: -[a-z0-9]{5}
  const stripped = s.replace(/-[a-z0-9]{4,6}$/i, '')
  return stripped || s
}

/** Reserve a unique clean slug; only append -2, -3… on collision. */
async function allocateUniqueSlug(base: string): Promise<string> {
  const root = slugifyTitle(base)
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`
    const { data, error } = await supabase
      .from('opportunities')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error && /column|schema|does not exist/i.test(error.message)) {
      return candidate
    }
    if (!data) return candidate
  }
  return `${root}-${Date.now().toString(36)}`
}

function readLocal(): OpportunityItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') as OpportunityItem[]
  } catch {
    return []
  }
}

function writeLocal(items: OpportunityItem[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 80)))
  } catch {
    /* ignore */
  }
}

function pushLocal(item: OpportunityItem) {
  const all = readLocal().filter(o => o.id !== item.id)
  all.unshift(item)
  writeLocal(all)
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
    source: 'platform',
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
    description: row.description || '',
    location: row.location || '',
    slug: row.slug || null,
    ownerId: row.owner_id || null,
    source: row.source || (row.owner_id ? 'member' : 'platform'),
    isFeatured: !!row.is_featured,
    featuredUntil: row.featured_until || null,
    featuredAt: row.featured_at || null,
  }
}

const SELECT_COLS =
  'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match, description, location, slug, owner_id, source, is_featured, featured_until, featured_at'

/**
 * Load active opportunities from Supabase.
 * Merges member-created local listings; falls back to mock if DB empty/errors.
 * Featured (active) listings are sorted to the top.
 */
export async function fetchOpportunities(): Promise<OpportunitiesResult> {
  const local = readLocal().filter(o => o.source === 'member')
  const sortFeaturedFirst = (items: OpportunityItem[]) =>
    [...items].sort((a, b) => {
      const af = isFeaturedActive(a) ? 1 : 0
      const bf = isFeaturedActive(b) ? 1 : 0
      if (bf !== af) return bf - af
      return 0
    })

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select(SELECT_COLS)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      // Older schema without hub/featured columns
      if (/column|schema cache/i.test(error.message)) {
        const legacy = await supabase
          .from('opportunities')
          .select(
            'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match, description, location, slug, owner_id, source',
          )
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        if (!legacy.error && legacy.data?.length) {
          const items = sortFeaturedFirst(mergeUnique((legacy.data as DbRow[]).map(fromDb), local))
          return { items, isLive: true }
        }
        const bare = await supabase
          .from('opportunities')
          .select(
            'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match',
          )
          .eq('is_active', true)
          .order('baseline_match', { ascending: false })
        if (!bare.error && bare.data?.length) {
          return {
            items: sortFeaturedFirst(mergeUnique((bare.data as DbRow[]).map(fromDb), local)),
            isLive: true,
          }
        }
      }
      return { items: sortFeaturedFirst(mergeUnique(fromMock(), local)), isLive: false }
    }

    if (!data?.length) {
      return { items: sortFeaturedFirst(mergeUnique(fromMock(), local)), isLive: false }
    }

    return {
      items: sortFeaturedFirst(mergeUnique((data as DbRow[]).map(fromDb), local)),
      isLive: true,
    }
  } catch {
    return { items: sortFeaturedFirst(mergeUnique(fromMock(), local)), isLive: false }
  }
}

function mergeUnique(primary: OpportunityItem[], extra: OpportunityItem[]): OpportunityItem[] {
  const seen = new Set(primary.map(o => o.id))
  const out = [...primary]
  for (const o of extra) {
    if (!seen.has(o.id)) {
      out.unshift(o)
      seen.add(o.id)
    }
  }
  return out
}

export async function fetchOpportunityBySlugOrId(
  slugOrId: string,
): Promise<{ item: OpportunityItem | null; isLive: boolean }> {
  const key = slugOrId.trim()
  if (!key) return { item: null, isLive: false }

  const local = readLocal().find(o => o.slug === key || o.id === key)
  const trySlugs = [key]
  const cleaned = stripLegacySlugSuffix(key)
  if (cleaned !== key) trySlugs.push(cleaned)

  try {
    for (const slug of trySlugs) {
      const bySlug = await supabase
        .from('opportunities')
        .select(SELECT_COLS)
        .eq('is_active', true)
        .eq('slug', slug)
        .maybeSingle()
      if (!bySlug.error && bySlug.data) {
        return { item: fromDb(bySlug.data as DbRow), isLive: true }
      }
    }

    // Legacy rows still stored as title-xxxxx — match by cleaned base prefix
    if (cleaned !== key || trySlugs.length) {
      const { data: prefixRows } = await supabase
        .from('opportunities')
        .select(SELECT_COLS)
        .eq('is_active', true)
        .like('slug', `${cleaned}-%`)
        .limit(8)
      const match = (prefixRows as DbRow[] | null)?.find(row => {
        const s = row.slug || ''
        return s === cleaned || stripLegacySlugSuffix(s) === cleaned
      })
      if (match) return { item: fromDb(match), isLive: true }
    }

    const byId = await supabase
      .from('opportunities')
      .select(SELECT_COLS)
      .eq('id', key)
      .eq('is_active', true)
      .maybeSingle()
    if (!byId.error && byId.data) {
      return { item: fromDb(byId.data as DbRow), isLive: true }
    }
  } catch {
    /* fall through */
  }

  if (local) return { item: local, isLive: false }

  const mock = fromMock().find(o => o.id === key)
  return { item: mock || null, isLive: false }
}

export async function createOpportunity(input: {
  ownerId: string
  title: string
  category: string
  subtitle?: string
  description?: string
  prize?: string
  deadline?: string
  location?: string
}): Promise<
  | { ok: true; item: OpportunityItem; source: 'supabase' }
  | { ok: false; error: string }
> {
  const title = input.title.trim().slice(0, 120)
  if (title.length < 4) return { ok: false, error: 'Title needs at least 4 characters.' }
  if (!input.ownerId) return { ok: false, error: 'Sign in to create an opportunity.' }
  if (!isOnline()) {
    return { ok: false, error: 'You’re offline. Reconnect, then publish so the listing is live and public.' }
  }

  const category = input.category || 'Job'
  const style = styleFor(category)
  const slug = await allocateUniqueSlug(title)
  const description = (input.description || '').trim().slice(0, 2000)
  const subtitle = (input.subtitle || description.slice(0, 100) || category).trim().slice(0, 160)
  const prize = (input.prize || 'Open').trim().slice(0, 80)
  const deadline = (input.deadline || 'Open').trim().slice(0, 80)
  const location = (input.location || '').trim().slice(0, 120)
  const aiReason = `Member-posted ${category.toLowerCase()} opportunity on Pi Opportunity Hub.`

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        title,
        subtitle,
        prize,
        deadline,
        category,
        icon_name: style.iconName,
        icon_color: style.iconColor,
        color: style.color,
        border: style.border,
        ai_reason: aiReason,
        baseline_match: 72,
        is_active: true,
        owner_id: input.ownerId,
        slug,
        description: description || null,
        location: location || null,
        source: 'member',
      })
      .select(SELECT_COLS)
      .maybeSingle()

    if (error) {
      if (/owner_id|slug|description|source|schema cache|column/i.test(error.message)) {
        return {
          ok: false,
          error:
            'Database not ready for Opportunity Hub. Run supabase_opportunities.sql then supabase_opportunities_hub.sql in Supabase.',
        }
      }
      if (/policy|permission|row-level security|rls/i.test(error.message)) {
        return {
          ok: false,
          error:
            'Could not publish (permissions). Confirm you’re signed in and supabase_opportunities_hub.sql policies are applied.',
        }
      }
      return { ok: false, error: friendlyNetworkError(error, error.message) }
    }

    if (!data) {
      return { ok: false, error: 'Publish failed — no row returned. Check Supabase opportunities table.' }
    }

    const item = fromDb(data as DbRow)
    pushLocal(item)
    track('opportunity_create', {
      category,
      local: false,
      live: true,
      id: item.id,
      slug: item.slug || null,
    })
    return { ok: true, item, source: 'supabase' }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not publish opportunity') }
  }
}

export function opportunityPublicPath(item: Pick<OpportunityItem, 'slug' | 'id'>): string {
  const raw = (item.slug || '').trim()
  const clean = raw ? stripLegacySlugSuffix(raw) : ''
  const slug = clean || raw || item.id
  return `/o/${encodeURIComponent(slug)}`
}

export function absoluteOpportunityUrl(item: Pick<OpportunityItem, 'slug' | 'id'>): string {
  const origin =
    (typeof window !== 'undefined' && window.location.origin) ||
    'https://pi-project-mvp.vercel.app'
  return `${origin}${opportunityPublicPath(item)}`
}
