import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, Building2, MapPin, ArrowLeft, Radar } from 'lucide-react'
import { investorSearchPresets, runInvestorSearch } from '../data/investorDemo'
import { track } from '../lib/analytics'

export default function InvestorDashboardPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState(investorSearchPresets[0])
  const [submitted, setSubmitted] = useState(investorSearchPresets[0])

  const results = useMemo(() => runInvestorSearch(submitted), [submitted])

  const run = (q: string) => {
    const next = q.trim() || investorSearchPresets[0]
    setQuery(next)
    setSubmitted(next)
    track('investor_search', { q: next })
  }

  return (
    <div className="min-h-screen" style={{ background: '#06090f' }}>
      <nav className="sticky top-0 z-40 border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3"
        style={{ background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => navigate('/demo')} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>π</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Investor Intelligence</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Demo dashboard · strategic deal flow</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/transparency')}
          className="ml-auto text-xs text-slate-400 hover:text-teal-300 transition-colors hidden sm:inline mr-2"
        >
          What’s live
        </button>
        <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 font-semibold">
          Demo · not live deal flow
        </span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Radar size={20} className="text-teal-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Search the opportunity graph</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Investors become customers. Query the Pi graph for founders, traction, technology fit, and contact paths —
            the intelligence layer behind human opportunity.
          </p>
        </div>

        <form
          onSubmit={e => { e.preventDefault(); run(query) }}
          className="flex gap-2 mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 focus-within:border-teal-500/40"
        >
          <div className="flex items-center pl-3 text-slate-500">
            <Search size={16} />
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-2.5 min-w-0"
            placeholder="Find AI robotics startups in Europe raising €500k"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-8">
          {investorSearchPresets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => run(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                submitted === p
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-200'
                  : 'border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Showing {results.length} graph hits for “{submitted}”
        </p>

        <div className="space-y-4">
          {results.map(h => (
            <div
              key={h.name}
              className="rounded-2xl border border-white/8 p-5"
              style={{ background: 'linear-gradient(145deg, rgba(15,23,42,0.85), rgba(8,13,26,0.95))' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                  <Building2 size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-white font-bold text-lg">{h.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{h.stage}</span>
                    <span className="ml-auto text-teal-300 text-sm font-extrabold flex items-center gap-1">
                      <Sparkles size={14} /> {h.match}% match
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mb-3">
                    <MapPin size={12} /> {h.geography} · {h.sector} · Raising {h.raising}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                    <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-500 font-bold">Founders</p>
                      <p className="text-slate-200">{h.founders}</p>
                    </div>
                    <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-500 font-bold">Traction</p>
                      <p className="text-slate-200">{h.traction}</p>
                    </div>
                    <div className="rounded-xl bg-black/25 border border-white/5 px-3 py-2 sm:col-span-2">
                      <p className="text-[10px] uppercase text-slate-500 font-bold">Technology</p>
                      <p className="text-slate-200">{h.tech}</p>
                    </div>
                  </div>
                  <p className="text-xs text-teal-200/90 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
                    <span className="font-semibold">Contact path:</span> {h.contactPath}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          Demo data for investor storytelling · live deal flow connects to Pi’s verified human graph as the network grows
        </p>
      </div>
    </div>
  )
}
