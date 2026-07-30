/** Central SEO catalog + document-head helpers for Pi Phase 1. */

export const SITE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL
    ? String(import.meta.env.VITE_PUBLIC_APP_URL)
    : 'https://pi-project-mvp.vercel.app'
).replace(/\/$/, '')

export const DEFAULT_OG_IMAGE = `${SITE_URL}/pi-logo-512.png`

export type SeoPage = {
  path: string
  title: string
  description: string
  /** index,follow vs noindex for private app screens */
  robots?: string
  ogType?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/** Public / marketing pages — indexed */
export const SEO_PAGES: Record<string, SeoPage> = {
  '/': {
    path: '/',
    title: 'Pi (π) – One Platform. Infinite Opportunities.',
    description:
      'Pi is an AI-native ecosystem for human connection, Digital Twin matching, communities, and opportunities. Connect. Learn. Build. Create. Earn. Grow.',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Pi',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description:
        'AI-native opportunity ecosystem with Digital Twin, matching, communities, and investor-ready experience.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  },
  '/features': {
    path: '/features',
    title: 'Pi Features – AI Twin, Matching, Communities & More',
    description:
      'Explore Pi’s product: Pi AI, Digital Twin, matching, communities, opportunities, messaging, creator economy, and Investor Demo — what each solves and who it helps.',
  },
  '/demo': {
    path: '/demo',
    title: 'Investor Demo – See Pi in 5 Minutes | Pi',
    description:
      'Walk through Pi’s Investor Demo: why Pi exists, Digital Twin storytelling, ranked matches, opportunities, and honest Live vs Demo labeling.',
  },
  '/investor': {
    path: '/investor',
    title: 'Investor Dashboard – Vision, Twin, Metrics & Roadmap | Pi',
    description:
      'Company-level investor view of Pi: product vision, Digital Twin narrative, metrics maturity, roadmap, architecture, AI capabilities, and Demo opportunity graph.',
  },
  '/connect': {
    path: '/connect',
    title: 'Meet Pi AI – Contact & Partnership | Pi',
    description:
      'Every visitor meets Pi AI first. Understand intent, explore the product, then Speak with a Human — handoff with full conversation context.',
  },
  '/transparency': {
    path: '/transparency',
    title: 'Engineering Transparency – What’s Live on Pi',
    description:
      'Honest Live / Partial / Demo / Soon status for Pi’s MVP — investor-grade transparency without inflated claims.',
  },
  '/trust': {
    path: '/trust',
    title: 'Trust, Safety & Truth Guarantee | Pi',
    description:
      'Pi’s Trust & Safety principles, Truth Guarantee, and trust-based monetization — privacy-first architecture with honest maturity labeling.',
  },
  '/grow': {
    path: '/grow',
    title: 'Grow Pi – Invites, Partnerships & Strategic Discussions',
    description:
      'Phase 3 market expansion: invite users into the live graph, explore partnerships, and prepare for strategic investor discussions without rushing undervalued deals.',
  },
  '/partners': {
    path: '/partners',
    title: 'Partner with Pi – Integrations & Ecosystem',
    description:
      'Partnership types for Pi: product integration, distribution, ecosystem, and enterprise pilots — routed through Meet Pi AI with full context.',
  },
  '/discuss': {
    path: '/discuss',
    title: 'Strategic Investor Discussions – Prep Room | Pi',
    description:
      'Prepare for strategic conversations with Demo, Transparency, and Traction. Value-first timing — not early undervalued deals.',
  },
  '/invite': {
    path: '/invite',
    title: 'You’re invited to Pi',
    description:
      'Join Pi via invite — AI-native Digital Twin, matching, communities, and opportunities.',
  },
  '/login': {
    path: '/login',
    title: 'Sign in to Pi',
    description: 'Sign in to your Pi account.',
    robots: 'noindex, follow',
  },
  '/signup': {
    path: '/signup',
    title: 'Create your Pi account',
    description: 'Join Pi — build your Digital Twin and start matching with people and opportunities.',
    robots: 'noindex, follow',
  },
  '/forgot-password': {
    path: '/forgot-password',
    title: 'Reset password | Pi',
    description: 'Reset your Pi account password.',
    robots: 'noindex, follow',
  },
  '/reset-password': {
    path: '/reset-password',
    title: 'Set new password | Pi',
    description: 'Set a new password for your Pi account.',
    robots: 'noindex, follow',
  },
  '/onboarding': {
    path: '/onboarding',
    title: 'Onboarding | Pi',
    description: 'Set up your Pi profile and Digital Twin signals.',
    robots: 'noindex, follow',
  },
}

/** In-app screens — prefer noindex (auth-gated) */
const APP_NOINDEX: SeoPage = {
  path: '',
  title: 'Pi',
  description: 'Pi — AI-native opportunity ecosystem.',
  robots: 'noindex, nofollow',
}

export const APP_SEO: Record<string, Partial<SeoPage>> = {
  '/dashboard': { title: 'Dashboard | Pi' },
  '/feed': { title: 'Opportunity Feed | Pi' },
  '/experience': { title: 'Experience (UGE) | Pi' },
  '/trust': { title: 'Trust & Safety | Pi' },
  '/match': { title: 'Matching | Pi' },
  '/opportunities': { title: 'Opportunities | Pi' },
  '/creators': { title: 'Creators | Pi' },
  '/professionals': { title: 'Professionals | Pi' },
  '/communities': { title: 'Communities | Pi' },
  '/messages': { title: 'Messages | Pi' },
  '/notifications': { title: 'Notifications | Pi' },
  '/twin': { title: 'Digital Twin | Pi' },
  '/traction': { title: 'Traction | Pi' },
  '/handoffs': { title: 'Handoffs | Pi' },
  '/search': { title: 'Search | Pi' },
  '/vision': { title: 'Vision | Pi' },
  '/profile/edit': { title: 'Edit profile | Pi' },
}

export type FeatureSeo = {
  slug: string
  name: string
  problem: string
  who: string
  whyDifferent: string
  title: string
  description: string
  ctaPath: string
  ctaLabel: string
}

export const FEATURE_SEO: FeatureSeo[] = [
  {
    slug: 'pi-ai',
    name: 'Pi AI',
    problem: 'Most platforms bury support in forms. Visitors repeat themselves and lose context.',
    who: 'Investors, partners, enterprise, talent, press, and community members making first contact.',
    whyDifferent: 'Pi AI greets first, understands intent, guides the product, then hands off to a human with full conversation context.',
    title: 'Pi AI – First Contact That Understands Intent | Pi',
    description:
      'Meet Pi AI: AI-first Contact & Partnership. Intent routing, product guidance, and Speak with a Human handoffs with full context.',
    ctaPath: '/connect',
    ctaLabel: 'Meet Pi AI',
  },
  {
    slug: 'digital-twin',
    name: 'Digital Twin',
    problem: 'Traditional profiles are static resumes. They don’t turn skills and goals into action.',
    who: 'Builders, founders, professionals, and creators who want intros and opportunities that fit.',
    whyDifferent: 'Pi builds a Digital Twin from profile signals that ranks people and opportunities — with reasons you can audit.',
    title: 'Digital Twin – AI Representation of Skills & Goals | Pi',
    description:
      'Pi Digital Twin turns skills, goals, and experience into ranked matches and opportunity fit — AI at the center, not a chat gadget.',
    ctaPath: '/twin',
    ctaLabel: 'Open Digital Twin',
  },
  {
    slug: 'matching',
    name: 'Matching System',
    problem: 'Networking is random. People miss the collaborators who would accelerate their goals.',
    who: 'Founders seeking co-founders, talent, mentors, investors, and peers.',
    whyDifferent: 'Ranked matching with explicit “why” reasons from Twin signals — honest empty states, no fake social proof.',
    title: 'AI Matching System – Ranked Intros with Reasons | Pi',
    description:
      'Pi matching ranks who accelerates your goals using Digital Twin signals, with transparent match reasons.',
    ctaPath: '/match',
    ctaLabel: 'Explore matching',
  },
  {
    slug: 'communities',
    name: 'Communities',
    problem: 'Generic groups don’t map to your goals. Discovery feels noisy and irrelevant.',
    who: 'Members who want twin-ranked hubs around skills, industries, and ambitions.',
    whyDifferent: 'Communities are twin-scored from your interests and goals — join, post, and grow inside one ecosystem.',
    title: 'Communities – Twin-Ranked Hubs | Pi',
    description:
      'Join Pi communities ranked by your Digital Twin. Live posts, joins, and discovery tied to real profile signals.',
    ctaPath: '/communities',
    ctaLabel: 'Browse communities',
  },
  {
    slug: 'opportunities',
    name: 'Opportunities',
    problem: 'Jobs, funding, and projects live in scattered feeds with no personal fit signal.',
    who: 'People hunting roles, capital, collaborations, and projects that match their Twin.',
    whyDifferent: 'Opportunity catalog scored against your Twin — interest tracking now, marketplace apply later.',
    title: 'Opportunities – Twin Fit-Scored Catalog | Pi',
    description:
      'Discover opportunities on Pi with fit scores from your Digital Twin — roles, capital, and collaborations in one place.',
    ctaPath: '/opportunities',
    ctaLabel: 'View opportunities',
  },
  {
    slug: 'messaging',
    name: 'Messaging',
    problem: 'Intros die without a fast, private channel to continue the conversation.',
    who: 'Matched members who need realtime DMs after a connection.',
    whyDifferent: 'Realtime messaging inside Pi with alerts (push / optional email) so momentum doesn’t drop.',
    title: 'Messaging – Realtime Conversations on Pi',
    description:
      'Message matches and collaborators on Pi with realtime DMs and notification alerts across devices.',
    ctaPath: '/messages',
    ctaLabel: 'Open messages',
  },
  {
    slug: 'creators',
    name: 'Creator & User Economy',
    problem: 'Creators and professionals juggle multiple tools for audience, booking, and growth.',
    who: 'Creators, coaches, and professionals building distribution inside one platform.',
    whyDifferent: 'Live member discovery today; tips, courses, and booking planned as monetization matures.',
    title: 'Creator & Professional Economy | Pi',
    description:
      'Discover creators and professionals on Pi. Message and connect now; tips, courses, and booking on the roadmap.',
    ctaPath: '/creators',
    ctaLabel: 'Explore creators',
  },
  {
    slug: 'investor-demo',
    name: 'Investor Demo',
    problem: 'Investors get slide decks disconnected from the real product.',
    who: 'Investors, partners, and advisors evaluating Pi with confidence.',
    whyDifferent: 'A scripted walkthrough plus company investor view with honest Live vs Demo labeling.',
    title: 'Investor Demo & Company View | Pi',
    description:
      'Present Pi with confidence: Investor Demo walkthrough and company dashboard covering vision, Twin, metrics, and roadmap.',
    ctaPath: '/demo',
    ctaLabel: 'Open Investor Demo',
  },
  {
    slug: 'social-feed',
    name: 'Pi Social Feed',
    problem: 'Attention feeds optimize for time-on-app, not opportunity or trust.',
    who: 'Builders, creators, professionals, and communities seeking meaningful next steps.',
    whyDifferent: 'Five streams — Knowledge, People, Opportunities, Communities, For you — with reputation signals and opportunity actions.',
    title: 'Pi Social – Opportunity Network Feed | Pi',
    description:
      'Pi Social is an opportunity network: stream-aware feed, Twin ranking, collaborate actions, and trust signals — not a vanity timeline.',
    ctaPath: '/feed',
    ctaLabel: 'Open Opportunity Feed',
  },
  {
    slug: 'universal-experience',
    name: 'Universal Generational Experience',
    problem: 'Most platforms design for one age group and force everyone else to adapt.',
    who: 'People from teens to older adults who want technology that adapts to them.',
    whyDifferent: 'UGE preferences for text, density, contrast, motion, simplified nav, and life-stage hints — AI that grows with every person.',
    title: 'Universal Generational Experience (UGE) | Pi',
    description:
      'Pi adapts to every generation: accessibility, simplified navigation, and personalization that evolves with each user’s life stage.',
    ctaPath: '/experience',
    ctaLabel: 'Open Experience settings',
  },
  {
    slug: 'trust-safety',
    name: 'Trust & Safety',
    problem: 'Platforms bolt on safety after scale — users and regulators pay the price.',
    who: 'Users, enterprises, investors, and partners who need privacy-first compliance readiness.',
    whyDifferent: 'Truth Guarantee + trust-based monetization: report tooling now; moderation, E2E, verification, and transparency reports on the roadmap.',
    title: 'Trust, Safety & Truth Guarantee | Pi',
    description:
      'How Pi protects users: Trust & Safety by design, Truth Guarantee, and monetization only when we add real trust value.',
    ctaPath: '/trust',
    ctaLabel: 'Read Trust & Safety',
  },
]

export function featureBySlug(slug: string) {
  return FEATURE_SEO.find(f => f.slug === slug) || null
}

export function resolveSeo(pathname: string): SeoPage {
  if (pathname.startsWith('/features/')) {
    const slug = pathname.replace('/features/', '').split('/')[0]
    const f = featureBySlug(slug)
    if (f) {
      return {
        path: `/features/${f.slug}`,
        title: f.title,
        description: f.description,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: f.name,
          description: f.description,
          url: `${SITE_URL}/features/${f.slug}`,
          isPartOf: { '@type': 'WebSite', name: 'Pi', url: SITE_URL },
        },
      }
    }
  }

  if (SEO_PAGES[pathname]) return SEO_PAGES[pathname]

  if (pathname.startsWith('/p/')) {
    return {
      path: pathname,
      title: 'Profile | Pi',
      description: 'Public Pi member profile.',
      robots: 'index, follow',
    }
  }

  const app = APP_SEO[pathname]
  if (app) {
    return {
      ...APP_NOINDEX,
      path: pathname,
      title: app.title || 'Pi',
      description: app.description || APP_NOINDEX.description,
      robots: 'noindex, nofollow',
    }
  }

  return {
    path: pathname,
    title: 'Pi (π) – One Platform. Infinite Opportunities.',
    description: SEO_PAGES['/'].description,
    robots: pathname.startsWith('/') ? 'index, follow' : 'noindex, follow',
  }
}

export function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

export function applyDocumentSeo(page: SeoPage) {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const url = `${origin}${page.path === '/' ? '' : page.path}`
  const robots = page.robots || 'index, follow'
  const ogType = page.ogType || 'website'

  document.title = page.title
  setMeta('name', 'description', page.description)
  setMeta('name', 'robots', robots)
  setMeta('property', 'og:title', page.title)
  setMeta('property', 'og:description', page.description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:type', ogType)
  setMeta('property', 'og:image', DEFAULT_OG_IMAGE)
  setMeta('property', 'og:site_name', 'Pi')
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', page.title)
  setMeta('name', 'twitter:description', page.description)
  setMeta('name', 'twitter:image', DEFAULT_OG_IMAGE)

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url

  const id = 'pi-page-jsonld'
  let script = document.getElementById(id) as HTMLScriptElement | null
  if (page.jsonLd) {
    if (!script) {
      script = document.createElement('script')
      script.id = id
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(page.jsonLd)
  } else if (script) {
    script.remove()
  }
}
