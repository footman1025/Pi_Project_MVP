import { Bot, Sparkles, Zap } from 'lucide-react'
import type { DigitalTwin } from '../lib/digitalTwin'

interface Props {
  twin: DigitalTwin
  name?: string
  compact?: boolean
}

export default function DigitalTwinCard({ twin, name, compact }: Props) {
  return (
    <div
      className="rounded-3xl border border-teal-500/25 overflow-hidden"
      style={{ background: 'linear-gradient(145deg, rgba(20,184,166,0.12), rgba(8,13,26,0.9))' }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            <Bot size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-teal-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} /> AI Digital Twin
            </p>
            <h3 className="text-white font-bold text-lg leading-tight">
              {name ? `${name}'s intelligence layer` : 'Your intelligence layer'}
            </h3>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed mb-5">{twin.summary}</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {twin.personality.map(p => (
            <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              {p}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          {twin.traits.map(t => (
            <div key={t.label} className="rounded-xl bg-black/25 border border-white/5 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{t.label}</p>
              <p className="text-white text-sm font-semibold truncate">{t.value}</p>
            </div>
          ))}
        </div>

        {!compact && (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Twin can act on your behalf</p>
            <div className="space-y-2 mb-5">
              {twin.actions.map(a => (
                <div key={a.title} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                  <Zap size={14} className="text-teal-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white text-sm font-semibold">{a.title}</p>
                    <p className="text-slate-500 text-xs leading-relaxed">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="grid grid-cols-4 gap-2">
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
                  className="h-full rounded-full"
                  style={{ width: `${val}%`, background: 'linear-gradient(90deg, #14b8a6, #5eead4)' }}
                />
              </div>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="text-xs text-teal-300 font-bold">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
