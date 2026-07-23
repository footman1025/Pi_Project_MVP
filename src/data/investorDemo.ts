/** Investor-facing Phase 1 demo data — AI Digital Twin, matching why, opportunities, investor search */

export type TwinTrait = { label: string; value: string }
export type TwinAction = { title: string; detail: string }

export type DemoMatch = {
  name: string
  role: string
  location: string
  match: number
  why: string[]
  accelerate: string
}

export type DemoOpportunity = {
  title: string
  type: string
  prize: string
  match: number
  why: string
  path: string
}

export type InvestorHit = {
  name: string
  stage: string
  sector: string
  geography: string
  raising: string
  traction: string
  tech: string
  match: number
  founders: string
  contactPath: string
}

export const sarahDemo = {
  name: 'Sarah Chen',
  title: 'AI Researcher · Founder',
  tagline: 'Building multimodal AI for scientific discovery',
  location: 'Berlin, Europe',
  username: 'sarah_chen_ai',
  avatar: 'S',
  skills: ['Machine Learning', 'Multimodal AI', 'Python', 'Research', 'Fundraising'],
  goals: ['Raise seed round', 'Find technical co-founder', 'Publish applied research'],
  interests: ['Artificial Intelligence', 'Health Tech', 'Startups'],
  experience: [
    { title: 'Research Scientist', company: 'Max Planck Institute', years: '2021–2024' },
    { title: 'ML Engineer', company: 'DeepMind Intern', years: '2020' },
  ],
  twin: {
    summary:
      'Sarah’s AI Digital Twin represents a research-driven founder with deep multimodal ML expertise, European network density, and a clear seed-stage fundraising goal. Pi Intelligence prioritizes complementary technical co-founders, sector-aligned angels, and grant/accelerator paths that amplify scientific credibility.',
    personality: ['Analytical', 'Mission-driven', 'Collaborative', 'High agency'],
    ambitions: ['Category-defining AI lab', 'Bridge academia ↔ industry', 'Global research network'],
    actions: [
      {
        title: 'Introduce to 3 seed investors',
        detail: 'Matched on AI × Europe × prior scientific SaaS investments.',
      },
      {
        title: 'Recommend technical co-founder',
        detail: 'Full-stack + MLOps profile complementary to her research depth.',
      },
      {
        title: 'Surface EU grant track',
        detail: 'Horizon-aligned AI health discovery calls with >90% fit.',
      },
    ] as TwinAction[],
    traits: [
      { label: 'Domain', value: 'Multimodal AI / Science' },
      { label: 'Stage', value: 'Pre-seed → Seed' },
      { label: 'Geography', value: 'EU · Berlin hub' },
      { label: 'Network mode', value: 'Investors + builders' },
    ] as TwinTrait[],
  },
  careerPath: [
    'Publish applied multimodal paper',
    'Ship research prototype to 3 labs',
    'Close €500k seed with strategic angels',
    'Hire MLOps co-founder',
    'Enter EU deep-tech accelerator',
  ],
  earningPotential: {
    year1: '€0–40k (research grants + advisory)',
    year3: '€180k–400k (founder salary + equity upside)',
    note: 'Pi Economy projection based on deep-tech founder trajectories in EU AI.',
  },
}

export const sarahMatches: DemoMatch[] = [
  {
    name: 'Elena Vogt',
    role: 'Angel Investor · Deep Tech',
    location: 'Munich',
    match: 97,
    why: [
      'Invested in 4 EU AI research spinouts',
      'Thesis matches multimodal + science tooling',
      'Can open Max Planck / Fraunhofer intros',
    ],
    accelerate: 'Shortens fundraising cycle by connecting Sarah to operators who already underwrite scientific AI risk.',
  },
  {
    name: 'Marcus Hale',
    role: 'MLOps / Platform Engineer',
    location: 'Amsterdam',
    match: 94,
    why: [
      'Complementary to research-heavy founder profile',
      'Built production ML platforms at scale',
      'Shared goal: applied AI products',
    ],
    accelerate: 'Turns research prototypes into investor-ready product infrastructure.',
  },
  {
    name: 'Priya Nair',
    role: 'Health Tech Founder',
    location: 'London',
    match: 91,
    why: [
      'Needs multimodal models for diagnostics',
      'Aligned EU regulatory path',
      'Partnership > competition fit',
    ],
    accelerate: 'Creates an early lighthouse customer and clinical validation path.',
  },
  {
    name: 'Jonah Berg',
    role: 'Research Mentor',
    location: 'Zurich',
    match: 88,
    why: [
      'Former lab lead in multimodal learning',
      'Strong publication + grant coaching',
      'Career path alignment for Sarah',
    ],
    accelerate: 'Improves grant win-rate and scientific narrative for investors.',
  },
  {
    name: 'Aya Okonkwo',
    role: 'Community Lead · AI Founders Hub',
    location: 'Remote EU',
    match: 86,
    why: [
      'Distribution into EU AI founder network',
      'Warm intros to operators and angels',
      'High engagement community',
    ],
    accelerate: 'Amplifies Sarah’s visibility inside the exact buyer/investor graph she needs.',
  },
]

export const sarahOpportunities: DemoOpportunity[] = [
  {
    title: 'EU Deep Tech Seed Syndicate',
    type: 'Funding',
    prize: '€400k–€750k',
    match: 96,
    why: 'Fits her AI × science profile, Berlin base, and pre-seed traction narrative.',
    path: 'Pi Twin → Investor Dashboard shortlist → warm intro via Elena Vogt',
  },
  {
    title: 'Horizon AI for Discovery Grant',
    type: 'Grant',
    prize: '€250k',
    match: 93,
    why: 'Research credentials + multimodal science use-case score in top band.',
    path: 'Career Graph → grant template → mentor review with Jonah Berg',
  },
  {
    title: 'Applied AI Accelerator (Europe)',
    type: 'Accelerator',
    prize: 'Equity + lab access',
    match: 90,
    why: 'Accelerates prototype → product transition with MLOps talent density.',
    path: 'Opportunity Hub apply · Pi prepares founder pack automatically',
  },
  {
    title: 'Scientific SaaS Design Partner Program',
    type: 'Partnership',
    prize: '3 pilot labs',
    match: 87,
    why: 'Creates traction proof investors ask for before writing €500k checks.',
    path: 'Match to Priya Nair + university lab graph',
  },
]

export const investorSearchPresets = [
  'Find AI robotics startups in Europe raising €500k',
  'Multimodal AI founders in Berlin pre-seed',
  'Health tech AI with scientific founders',
  'EU deep-tech angels investing in research spinouts',
]

export const investorHits: Record<string, InvestorHit[]> = {
  default: [
    {
      name: 'NovaForge Robotics',
      stage: 'Pre-seed',
      sector: 'AI Robotics',
      geography: 'Europe · Munich',
      raising: '€500k',
      traction: '2 industrial pilots · LOIs €180k',
      tech: 'Vision-language control for warehouse bots',
      match: 94,
      founders: 'Lena Krüger (ex-BMW AI) · Tomáš Novak (robotics PhD)',
      contactPath: 'Pi Twin intro via AI Founders Hub · 2 mutual operators',
    },
    {
      name: 'Helix Multimodal',
      stage: 'Seed',
      sector: 'Scientific AI',
      geography: 'Europe · Berlin',
      raising: '€600k',
      traction: '3 research lab deployments',
      tech: 'Multimodal models for discovery workflows',
      match: 92,
      founders: 'Sarah Chen (AI researcher) · TBD technical co-founder',
      contactPath: 'Direct via Sarah Digital Twin · Investor Dashboard',
    },
    {
      name: 'Orbit Assist',
      stage: 'Pre-seed',
      sector: 'AI Infrastructure',
      geography: 'Europe · Amsterdam',
      raising: '€450k',
      traction: 'MRR €12k · 40 research teams',
      tech: 'MLOps for academic → production pipelines',
      match: 88,
      founders: 'Marcus Hale · Ana Ruiz',
      contactPath: 'Skill graph overlap with MLOps demand · warm path ready',
    },
  ],
}

export function runInvestorSearch(query: string): InvestorHit[] {
  const q = query.toLowerCase()
  const base = investorHits.default
  return base
    .map(h => {
      let score = h.match
      if (q.includes('europe') && /europe/i.test(h.geography)) score += 2
      if (q.includes('robot') && /robot/i.test(h.sector + h.tech)) score += 3
      if (q.includes('500') && h.raising.includes('500')) score += 2
      if (q.includes('berlin') && /berlin/i.test(h.geography)) score += 3
      if (q.includes('health') && /health|scientific|discovery/i.test(h.sector + h.tech)) score += 2
      if (q.includes('multimodal') && /multimodal/i.test(h.tech + h.sector)) score += 3
      return { ...h, match: Math.min(99, score) }
    })
    .sort((a, b) => b.match - a.match)
}
