/**
 * Animated opportunity-graph visual for the landing hero.
 * No cards, badges, or copy — pure motion as the product metaphor.
 */
export default function HeroOpportunityGraph() {
  const nodes = [
    { id: 'a', cx: 210, cy: 168, r: 11, delay: '0s' },
    { id: 'b', cx: 118, cy: 112, r: 7, delay: '0.4s' },
    { id: 'c', cx: 302, cy: 98, r: 8, delay: '0.8s' },
    { id: 'd', cx: 92, cy: 230, r: 6, delay: '1.1s' },
    { id: 'e', cx: 318, cy: 228, r: 7, delay: '0.6s' },
    { id: 'f', cx: 168, cy: 268, r: 5.5, delay: '1.4s' },
    { id: 'g', cx: 268, cy: 278, r: 5.5, delay: '1.7s' },
    { id: 'h', cx: 210, cy: 72, r: 5, delay: '0.2s' },
  ] as const

  const edges: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
    [1, 3], [2, 4], [5, 6], [1, 7], [2, 7],
  ]

  return (
    <div
      className="relative w-full max-w-[440px] mx-auto aspect-square select-none"
      aria-hidden
    >
      {/* Soft atmosphere */}
      <div
        className="absolute inset-[8%] rounded-full opacity-70 blur-3xl hero-graph-breathe"
        style={{
          background:
            'radial-gradient(circle, rgba(20,184,166,0.35) 0%, rgba(13,148,136,0.12) 45%, transparent 70%)',
        }}
      />

      {/* Orbit rings */}
      <div className="absolute inset-[6%] rounded-full border border-teal-400/10 hero-graph-spin-slow" />
      <div className="absolute inset-[16%] rounded-full border border-dashed border-teal-400/15 hero-graph-spin-rev" />
      <div className="absolute inset-[28%] rounded-full border border-teal-400/[0.07]" />

      <svg
        viewBox="0 0 420 340"
        className="relative w-full h-full drop-shadow-[0_0_40px_rgba(20,184,166,0.15)]"
        fill="none"
      >
        <defs>
          <linearGradient id="heroEdge" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#5eead4" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="heroCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#14b8a6" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.4" />
          </radialGradient>
          <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {edges.map(([i, j], idx) => {
          const a = nodes[i]
          const b = nodes[j]
          return (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.cx}
              y1={a.cy}
              x2={b.cx}
              y2={b.cy}
              stroke="url(#heroEdge)"
              strokeWidth={idx === 0 ? 1.6 : 1.1}
              className="hero-graph-edge"
              style={{ animationDelay: `${idx * 0.12}s` }}
            />
          )
        })}

        {/* Traveling pulse along a few key edges */}
        {[
          { x1: 210, y1: 168, x2: 118, y2: 112, d: '0s' },
          { x1: 210, y1: 168, x2: 302, y2: 98, d: '1.2s' },
          { x1: 210, y1: 168, x2: 318, y2: 228, d: '2.4s' },
        ].map((p, i) => (
          <circle key={`pulse-${i}`} r="2.5" fill="#5eead4" filter="url(#heroGlow)">
            <animateMotion
              dur="3.6s"
              begin={p.d}
              repeatCount="indefinite"
              path={`M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`}
            />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.15;0.85;1"
              dur="3.6s"
              begin={p.d}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={n.id} className="hero-graph-node" style={{ animationDelay: n.delay }}>
            {i === 0 && (
              <circle
                cx={n.cx}
                cy={n.cy}
                r={28}
                fill="rgba(20,184,166,0.12)"
                className="hero-graph-core-ring"
              />
            )}
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r + (i === 0 ? 4 : 2)}
              fill="rgba(20,184,166,0.18)"
            />
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill={i === 0 ? 'url(#heroCore)' : '#14b8a6'}
              filter="url(#heroGlow)"
              opacity={i === 0 ? 1 : 0.85}
            />
            {i === 0 && (
              <text
                x={n.cx}
                y={n.cy + 5}
                textAnchor="middle"
                fill="#061016"
                fontSize="14"
                fontWeight="800"
                fontFamily="Roboto, sans-serif"
              >
                π
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
