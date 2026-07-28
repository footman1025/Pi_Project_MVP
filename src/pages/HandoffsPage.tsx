import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Inbox, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CONNECT_TEAMS, ConnectTeam } from '../lib/connectAgent'
import StatusBadge from '../components/StatusBadge'
import { track } from '../lib/analytics'

type Handoff = {
  id: string
  team: ConnectTeam
  visitor_name: string | null
  visitor_email: string | null
  visitor_org: string | null
  intent: string | null
  summary: string
  status: 'new' | 'claimed' | 'closed'
  created_at: string
}

export default function HandoffsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Handoff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | ConnectTeam>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    let q = supabase
      .from('contact_handoffs')
      .select('id, team, visitor_name, visitor_email, visitor_org, intent, summary, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (filter !== 'all') q = q.eq('team', filter)
    const { data, error: err } = await q
    setLoading(false)
    if (err) {
      setError(
        err.message.includes('does not exist')
          ? 'Run supabase_contact_handoffs.sql in Supabase, then refresh.'
          : err.message,
      )
      setRows([])
      return
    }
    setRows((data || []) as Handoff[])
  }, [filter])

  useEffect(() => {
    track('handoffs_view')
    void load()
  }, [load])

  const setStatus = async (id: string, status: Handoff['status']) => {
    await supabase.from('contact_handoffs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setRows(r => r.map(x => (x.id === id ? { ...x, status } : x)))
  }

  const teamLabel = (id: string) => CONNECT_TEAMS.find(t => t.id === id)?.label || id

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Inbox size={22} className="text-teal-400" />
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Handoffs inbox</h1>
          <StatusBadge kind="live" label="AI → human context" size="md" />
        </div>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Conversations started with Pi AI on /connect, summarized and routed so humans continue with context.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border ${
            filter === 'all' ? 'border-teal-500/40 bg-teal-500/15 text-teal-200' : 'border-white/10 text-slate-400'
          }`}
        >
          All
        </button>
        {CONNECT_TEAMS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              filter === t.id ? 'border-teal-500/40 bg-teal-500/15 text-teal-200' : 'border-white/10 text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-300 border border-white/10 px-3 py-1.5 rounded-lg"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 text-sm text-amber-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin text-pi-400" /> Loading handoffs…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          No handoffs yet. Visitors submit from <button type="button" className="text-teal-300" onClick={() => navigate('/connect')}>/connect</button>.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(h => (
            <div
              key={h.id}
              className="p-4 rounded-2xl border border-white/8"
              style={{ background: 'linear-gradient(145deg, rgba(14,20,25,0.7), rgba(8,13,26,0.9))' }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold text-teal-300">{teamLabel(h.team)}</span>
                <StatusBadge
                  kind={h.status === 'new' ? 'live' : h.status === 'claimed' ? 'partial' : 'soon'}
                  label={h.status}
                />
                <span className="text-[11px] text-slate-600 ml-auto">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-white text-sm font-semibold mb-0.5">
                {h.visitor_name || 'Visitor'}
                {h.visitor_email ? (
                  <span className="text-slate-400 font-normal"> · {h.visitor_email}</span>
                ) : null}
              </p>
              {h.visitor_org && <p className="text-slate-500 text-xs mb-2">{h.visitor_org}</p>}
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-black/20 border border-white/5 rounded-xl p-3 mb-3">
                {h.summary}
              </pre>
              <div className="flex flex-wrap gap-2">
                {h.status === 'new' && (
                  <button
                    type="button"
                    onClick={() => void setStatus(h.id, 'claimed')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
                  >
                    Claim
                  </button>
                )}
                {h.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => void setStatus(h.id, 'closed')}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-300 border border-white/10"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
