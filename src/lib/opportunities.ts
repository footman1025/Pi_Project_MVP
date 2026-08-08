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
  /** Skills / tags for discovery + Twin fit */
  skills?: string[]
  slug?: string | null
  ownerId?: string | null
  source?: 'platform' | 'member' | string
  isFeatured?: boolean
  featuredUntil?: string | null
  featuredAt?: string | null
  isActive?: boolean
}

export type OpportunitiesResult = {
  items: OpportunityItem[]
  /** true when rows came from Supabase; false when using mock fallback */
  isLive: boolean
}

/** Core create categories (0→1 wedge — keep tight). */
export const CREATE_CATEGORIES = [
  'Job',
  'Service',
  'Co-founder',
  'Partnership',
  'Project',
] as const

export type CreateCategory = (typeof CREATE_CATEGORIES)[number]

/** Hub filter chips — core first, extras only if present in catalog. */
export const HUB_FILTER_CATEGORIES = [
  'All',
  ...CREATE_CATEGORIES,
  'Talent',
  'Funding',
  'Community',
  'Competition',
  'Accelerator',
] as const

export function parseSkills(raw: string | string[] | null | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(s => String(s).trim()).filter(Boolean))].slice(0, 16)
  }
  return [...new Set(
    raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
  )].slice(0, 16)
}

export function formatSkills(skills: string[] | undefined): string {
  return (skills || []).join(', ')
}

export function isRemoteLocation(location?: string | null): boolean {
  if (!location) return false
  return /\bremote\b|worldwide|anywhere|wfh|work from home/i.test(location)
}

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
  skills?: string | string[] | null
  slug?: string | null
  owner_id?: string | null
  source?: string | null
  is_active?: boolean | null
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
    skills: parseSkills(row.skills),
    slug: row.slug || null,
    ownerId: row.owner_id || null,
    source: row.source || (row.owner_id ? 'member' : 'platform'),
    isActive: row.is_active !== false,
    isFeatured: !!row.is_featured,
    featuredUntil: row.featured_until || null,
    featuredAt: row.featured_at || null,
  }
}

const SELECT_HUB =
  'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match, description, location, skills, slug, owner_id, source, is_active'

const SELECT_HUB_NOSKILLS =
  'id, title, subtitle, prize, deadline, category, icon_name, icon_color, color, border, ai_reason, baseline_match, description, location, slug, owner_id, source, is_active'

const SELECT_FULL =
  `${SELECT_HUB}, is_featured, featured_until, featured_at`

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
    let data: DbRow[] | null = null
    let error: { message: string } | null = null

    const full = await supabase
      .from('opportunities')
      .select(SELECT_FULL)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (full.error && /is_featured|featured_until|featured_at|column|schema cache/i.test(full.error.message)) {
      const hub = await supabase
        .from('opportunities')
        .select(SELECT_HUB)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (hub.error && /skills|column|schema cache/i.test(hub.error.message)) {
        const noskills = await supabase
          .from('opportunities')
          .select(SELECT_HUB_NOSKILLS)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        data = noskills.data as DbRow[] | null
        error = noskills.error
      } else {
        data = hub.data as DbRow[] | null
        error = hub.error
      }
    } else {
      data = full.data as DbRow[] | null
      error = full.error
    }

    if (error) {
      // Older schema without hub columns
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
      items: sortFeaturedFirst(mergeUnique(data.map(fromDb), local)),
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

  const selectActive = async (col: 'slug' | 'id', value: string) => {
    const res = await supabase
      .from('opportunities')
      .select(SELECT_HUB)
      .eq('is_active', true)
      .eq(col, value)
      .maybeSingle()
    if (res.error && /skills|column|schema cache/i.test(res.error.message)) {
      return supabase
        .from('opportunities')
        .select(SELECT_HUB_NOSKILLS)
        .eq('is_active', true)
        .eq(col, value)
        .maybeSingle()
    }
    return res
  }

  try {
    for (const slug of trySlugs) {
      const bySlug = await selectActive('slug', slug)
      if (!bySlug.error && bySlug.data) {
        return { item: fromDb(bySlug.data as DbRow), isLive: true }
      }
    }

    // Legacy rows still stored as title-xxxxx — match by cleaned base prefix
    if (cleaned !== key || trySlugs.length) {
      const { data: prefixRows } = await supabase
        .from('opportunities')
        .select(SELECT_HUB)
        .eq('is_active', true)
        .like('slug', `${cleaned}-%`)
        .limit(8)
      const match = (prefixRows as DbRow[] | null)?.find(row => {
        const s = row.slug || ''
        return s === cleaned || stripLegacySlugSuffix(s) === cleaned
      })
      if (match) return { item: fromDb(match), isLive: true }
    }

    const byId = await selectActive('id', key)
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

function validateOpportunityInput(input: {
  ownerId: string
  title: string
  description?: string
  category?: string
}) {
  const title = input.title.trim().slice(0, 120)
  if (!input.ownerId) return { ok: false as const, error: 'Sign in to manage opportunities.' }
  if (title.length < 4) return { ok: false as const, error: 'Title needs at least 4 characters.' }
  if (!(input.category || '').trim()) return { ok: false as const, error: 'Pick a category.' }
  if (!isOnline()) {
    return {
      ok: false as const,
      error: 'You’re offline. Reconnect, then try again so the listing stays live and public.',
    }
  }
  return { ok: true as const, title }
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
  skills?: string | string[]
}): Promise<
  | { ok: true; item: OpportunityItem; source: 'supabase' }
  | { ok: false; error: string }
> {
  const checked = validateOpportunityInput(input)
  if (!checked.ok) return checked
  const title = checked.title

  const category = input.category || 'Job'
  const style = styleFor(category)
  const slug = await allocateUniqueSlug(title)
  const description = (input.description || '').trim().slice(0, 2000)
  const subtitle = (input.subtitle || description.slice(0, 100) || category).trim().slice(0, 160)
  const prize = (input.prize || 'Open').trim().slice(0, 80)
  const deadline = (input.deadline || 'Open').trim().slice(0, 80)
  const location = (input.location || '').trim().slice(0, 120)
  const skills = parseSkills(input.skills)
  const skillsText = formatSkills(skills) || null
  const aiReason = skills.length
    ? `Member-posted ${category.toLowerCase()} · skills: ${skills.slice(0, 6).join(', ')}`
    : `Member-posted ${category.toLowerCase()} opportunity on Pi Opportunity Hub.`

  const baseRow = {
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
  }

  try {
    let { data, error } = await supabase
      .from('opportunities')
      .insert({ ...baseRow, skills: skillsText })
      .select(SELECT_HUB)
      .maybeSingle()

    if (error && /skills|column|schema cache/i.test(error.message)) {
      const retry = await supabase
        .from('opportunities')
        .insert(baseRow)
        .select(SELECT_HUB_NOSKILLS)
        .maybeSingle()
      data = retry.data as typeof data
      error = retry.error
    }

    if (error) {
      const msg = error.message || ''
      if (/owner_id|slug|description|location|source|schema cache/i.test(msg) && /column|could not find|schema/i.test(msg)) {
        return {
          ok: false,
          error: 'Database missing Opportunity Hub columns. Run supabase_opportunities_hub.sql, then retry.',
        }
      }
      if (/policy|permission|row-level security|rls/i.test(msg)) {
        return {
          ok: false,
          error: 'Could not publish (permissions). Confirm you’re signed in.',
        }
      }
      return { ok: false, error: friendlyNetworkError(error, msg) }
    }

    if (!data) {
      return { ok: false, error: 'Publish failed — no row returned.' }
    }

    const item = fromDb({ ...(data as DbRow), skills: skillsText })
    pushLocal(item)
    track('opportunity_create', {
      category,
      local: false,
      live: true,
      id: item.id,
      slug: item.slug || null,
      skills: skills.length,
    })
    return { ok: true, item, source: 'supabase' }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not publish opportunity') }
  }
}

/** Owner updates an existing listing (keeps slug unless title changes and slug empty). */
export async function updateOpportunity(input: {
  id: string
  ownerId: string
  title: string
  category: string
  subtitle?: string
  description?: string
  prize?: string
  deadline?: string
  location?: string
  skills?: string | string[]
}): Promise<
  | { ok: true; item: OpportunityItem }
  | { ok: false; error: string }
> {
  const checked = validateOpportunityInput(input)
  if (!checked.ok) return checked
  if (!input.id) return { ok: false, error: 'Missing opportunity id.' }

  const title = checked.title
  const category = input.category || 'Job'
  const style = styleFor(category)
  const description = (input.description || '').trim().slice(0, 2000)
  const subtitle = (input.subtitle || description.slice(0, 100) || category).trim().slice(0, 160)
  const prize = (input.prize || 'Open').trim().slice(0, 80)
  const deadline = (input.deadline || 'Open').trim().slice(0, 80)
  const location = (input.location || '').trim().slice(0, 120)
  const skills = parseSkills(input.skills)
  const skillsText = formatSkills(skills) || null

  const patch: Record<string, unknown> = {
    title,
    subtitle,
    prize,
    deadline,
    category,
    icon_name: style.iconName,
    icon_color: style.iconColor,
    color: style.color,
    border: style.border,
    description: description || null,
    location: location || null,
    skills: skillsText,
    ai_reason: skills.length
      ? `Member-posted ${category.toLowerCase()} · skills: ${skills.slice(0, 6).join(', ')}`
      : `Member-posted ${category.toLowerCase()} opportunity on Pi Opportunity Hub.`,
  }

  try {
    let { data, error } = await supabase
      .from('opportunities')
      .update(patch)
      .eq('id', input.id)
      .eq('owner_id', input.ownerId)
      .select(SELECT_HUB)
      .maybeSingle()

    if (error && /skills|column|schema cache/i.test(error.message)) {
      const noSkills = { ...patch }
      delete noSkills.skills
      const retry = await supabase
        .from('opportunities')
        .update(noSkills)
        .eq('id', input.id)
        .eq('owner_id', input.ownerId)
        .select(SELECT_HUB_NOSKILLS)
        .maybeSingle()
      data = retry.data as typeof data
      error = retry.error
    }

    if (error) {
      return { ok: false, error: friendlyNetworkError(error, error.message) }
    }
    if (!data) {
      return { ok: false, error: 'Update failed — you may not own this listing.' }
    }

    const item = fromDb({ ...(data as DbRow), skills: skillsText })
    pushLocal(item)
    track('opportunity_update', { id: item.id, category })
    return { ok: true, item }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not update opportunity') }
  }
}

/**
 * Soft-delete: owner unpublishes listing (is_active = false).
 * Public page and hub catalog hide it; owner keeps the row.
 */
export async function deactivateOpportunity(
  id: string,
  ownerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id || !ownerId) return { ok: false, error: 'Sign in as the owner to delete.' }
  if (!isOnline()) return { ok: false, error: 'You’re offline. Reconnect, then delete.' }

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .update({ is_active: false })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('id')
      .maybeSingle()

    if (error) return { ok: false, error: friendlyNetworkError(error, error.message) }
    if (!data) return { ok: false, error: 'Delete failed — you may not own this listing.' }

    try {
      const all = readLocal().filter(o => o.id !== id)
      writeLocal(all)
    } catch {
      /* ignore */
    }

    track('opportunity_delete', { id, outcome: 'unpublished' })
    track('opportunity_outcome', { id, outcome: 'closed', source: 'owner_delete' })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: friendlyNetworkError(err, 'Could not delete opportunity') }
  }
}

/** Owner marks a conversation/outcome on an applicant (measurable 0→1 end). */
export function trackOpportunityOutcome(input: {
  opportunityId: string
  applicantId?: string
  outcome: 'connected' | 'hired' | 'passed' | 'closed'
}) {
  track('opportunity_outcome', {
    id: input.opportunityId,
    applicant_id: input.applicantId || null,
    outcome: input.outcome,
  })
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
