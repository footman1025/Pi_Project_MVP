import { Bot, Sparkles, Zap, Target, Network } from 'lucide-react'
import type { DigitalTwin } from '../lib/digitalTwin'

interface Props {
  twin: DigitalTwin
  name?: string
  compact?: boolean
}

export default function DigitalTwinCard({ twin, name, compact }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
      style={{ background: 'linear-gradient(160deg, rgba(18,28,40,0.95), rgba(8,14,22,0.98))' }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-12 w-40 h-40 rounded-full opacity-30 blur-3xl"
        style={{ background: '#14b8a6' }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <Bot size={20} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-teal-400/90 text-[10px] font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 mb-1">
              <Sparkles size={11} /> Digital Twin
            </p>
            <h3 className="text-white font-bold text-base sm:text-lg leading-tight">
              {name ? `${name}'s intelligence layer` : 'Your intelligence layer'}
            </h3>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-5">{twin.summary}</p>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {twin.personality.map(p => (
            <span
              key={p}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-200/90"
            >
              {p}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {twin.traits.map(t => (
            <div
              key={t.label}
              className="rounded-xl bg-black/30 border border-white/[0.06] px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-0.5">
                {t.label}
              </p>
              <p className="text-white text-sm font-semibold truncate">{t.value}</p>
            </div>
          ))}
        </div>

        {!compact && (
          <>
            <div className="flex items-center gap-2 mb-2.5">
              <Zap size={13} className="text-teal-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">
                Twin can act on your behalf
              </p>
            </div>
            <div className="space-y-2 mb-5">
              {twin.actions.map(a => (
                <div
                  key={a.title}
                  className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">{a.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center gap-2 mb-3">
          <Network size={13} className="text-teal-400" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Signal strength</p>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {(
            [
              ['Skills', twin.graph.skills],
              ['Goals', twin.graph.goals],
              ['Experience', twin.graph.experience],
              ['Ready', twin.graph.networkReady],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className="text-center">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${val}%`,
                    background: 'linear-gradient(90deg, #0d9488, #2dd4bf)',
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-xs text-teal-300 font-bold tabular-nums">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
