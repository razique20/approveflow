'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  RequestItem,
  UserProfile,
  StatusPill,
  StatusDot,
  CategoryChip,
  Avatar,
  isMissingSchema,
  SchemaNotice,
  money,
  shortDate,
} from '@/components/ui/shared'
import { StatusDonut, CategoryBars, TrendBars } from '@/components/ui/charts'
import {
  IconSearch,
  IconInbox,
  IconCheck,
  IconXCircle,
} from '@/components/ui/icons'

interface Props {
  user: UserProfile
  isDemoMode: boolean
  view: string
  onView: (v: string) => void
}

export default function ApproverDashboard({ user, isDemoMode, view, onView }: Props) {
  const toast = useToast()
  const supabase = createSupabaseClient()

  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [selected, setSelected] = useState<RequestItem | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const defaults = useCallback((): RequestItem[] => [
    {
      id: 'demo-req-1', requester_id: 'demo-requester-1', requester_name: 'Alex Smith', requester_email: 'requester@company.com',
      title: 'Slack Enterprise License', category: 'Software License',
      description: 'Access to the official Slack Enterprise workspace to coordinate with internal product teams.',
      priority: 'Medium', cost: 120, status: 'Approved', approver_comment: 'Approved — license allocated from the IT budget.',
      created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    },
    {
      id: 'demo-req-2', requester_id: 'demo-requester-1', requester_name: 'Alex Smith', requester_email: 'requester@company.com',
      title: 'Dell UltraSharp 27" USB-C Monitor', category: 'Hardware',
      description: 'External monitor to improve productivity while working from home.',
      priority: 'Low', cost: 349.99, status: 'Pending', created_at: new Date(Date.now() - 864e5).toISOString(),
    },
    {
      id: 'demo-req-3', requester_id: 'demo-requester-1', requester_name: 'Alex Smith', requester_email: 'requester@company.com',
      title: 'Production Database Root Access', category: 'Cloud Access',
      description: 'Root PostgreSQL access to run quick diagnostics on the production cluster.',
      priority: 'High', cost: 0, status: 'Rejected',
      approver_comment: 'Denied — policy requires read-only staging access for developer accounts.',
      created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    },
  ], [])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    if (isDemoMode) {
      const stored = localStorage.getItem('demo_requests')
      if (stored) setRequests(JSON.parse(stored))
      else {
        const d = defaults()
        localStorage.setItem('demo_requests', JSON.stringify(d))
        setRequests(d)
      }
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`*, profiles:requester_id ( full_name, email )`)
        .order('created_at', { ascending: false })
      if (error) throw error
      setRequests((data || []).map((item: Record<string, unknown>) => ({
        ...(item as unknown as RequestItem),
        requester_name: (item.profiles as { full_name?: string })?.full_name || 'Unknown user',
        requester_email: (item.profiles as { email?: string })?.email || 'unknown@company.com',
      })))
      setSchemaMissing(false)
    } catch (err) {
      if (isMissingSchema(err)) {
        setSchemaMissing(true)
        setRequests([])
      } else {
        toast.error('Could not load requests', (err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }, [isDemoMode, supabase, defaults, toast])

  useEffect(() => {
    fetchRequests()
    if (!isDemoMode) {
      const channel = supabase
        .channel('approver-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetchRequests())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [fetchRequests, isDemoMode, supabase])

  const decide = async (status: 'Approved' | 'Rejected') => {
    if (!selected) return
    setSubmitting(true)
    if (isDemoMode) {
      const stored = localStorage.getItem('demo_requests')
      let all: RequestItem[] = stored ? JSON.parse(stored) : []
      all = all.map((r) => r.id === selected.id ? { ...r, status, approver_comment: comment.trim() || undefined, approver_id: user.id } : r)
      localStorage.setItem('demo_requests', JSON.stringify(all))
      setRequests(all)
      setSelected(null); setComment(''); setSubmitting(false)
      toast.success(`Request ${status.toLowerCase()}`, `${selected.title} was ${status.toLowerCase()}.`)
      return
    }
    try {
      const { error } = await supabase.from('requests').update({
        status, approver_comment: comment.trim() || null, approver_id: user.id, updated_at: new Date().toISOString(),
      }).eq('id', selected.id)
      if (error) throw error
      setSelected(null); setComment(''); fetchRequests()
      toast.success(`Request ${status.toLowerCase()}`, `${selected.title} was ${status.toLowerCase()}.`)
    } catch (err) {
      toast.error('Update failed', (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'Pending').length
  const approvedCount = requests.filter((r) => r.status === 'Approved').length
  const pendingValue = requests.filter((r) => r.status === 'Pending').reduce((s, r) => s + Number(r.cost), 0)

  const filtered = requests.filter((r) => {
    const matchStatus = view === 'all' || r.status === view
    const q = search.toLowerCase()
    const matchSearch = !q || (r.requester_name || '').toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const openReview = (r: RequestItem) => { setSelected(r); setComment('') }

  return (
    <div className="flex col gap-4 animate-fade-up">
      <div>
        <h1 style={{ fontSize: '1.9rem' }}>Review console</h1>
        <p className="muted" style={{ marginTop: '0.25rem' }}>Evaluate employee requests, allocate budget, and manage access.</p>
      </div>

      {schemaMissing && <SchemaNotice />}

      {/* Summary line */}
      {!schemaMissing && (
        <div className="summary">
          <span className="summary-item"><span className="summary-num">{pendingCount}</span> pending</span>
          <span className="summary-item"><span className="summary-num">{money(pendingValue)}</span> pending budget</span>
          <span className="summary-item"><span className="summary-num">{approvedCount}</span> approved</span>
        </div>
      )}

      {/* Charts */}
      {!schemaMissing && !loading && requests.length > 0 && (
        <div className="charts-grid stagger">
          <StatusDonut requests={requests} />
          <CategoryBars requests={requests} />
          <TrendBars requests={requests} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center wrap gap-3">
        <div className="flex items-center gap-2 grow" style={{ position: 'relative', maxWidth: 360 }}>
          <IconSearch width={17} height={17} style={{ position: 'absolute', left: 12, color: 'hsl(var(--text-3))' }} />
          <input className="input" placeholder="Search requester, title…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.3rem' }} />
        </div>
        <Segment value={view} onChange={onView} options={['all', 'Pending', 'Approved', 'Rejected']} pendingCount={pendingCount} />
      </div>

      {/* Split: list + review */}
      {loading ? (
        <ListSkeleton />
      ) : schemaMissing ? (
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <span className="muted">Connect your database to review requests here.</span>
        </div>
      ) : (
        <div className="split">
          {/* Left — list */}
          {filtered.length === 0 ? (
            <div className="card"><EmptyState /></div>
          ) : (
            <div className="card split-list rlist">
              {filtered.map((r) => (
                <div key={r.id} className={`rrow ${selected?.id === r.id ? 'is-active' : ''}`} onClick={() => openReview(r)}>
                  <Avatar name={r.requester_name || 'User'} size={36} />
                  <div className="rrow-main">
                    <div className="rrow-title">{r.title}</div>
                    <div className="rrow-sub">{r.requester_name} · {r.category}</div>
                  </div>
                  <div className="rrow-meta">
                    <span className="rrow-cost">{money(r.cost)}</span>
                    <StatusDot status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right — review panel */}
          <div className="card detail">
            {selected ? (
              <>
                <div className="detail-head flex items-center gap-2">
                  <Avatar name={selected.requester_name || 'User'} size={40} />
                  <div>
                    <div style={{ fontWeight: 800 }}>{selected.requester_name}</div>
                    <div className="muted">{selected.requester_email}</div>
                  </div>
                </div>
                <div className="detail-body">
                  <div className="flex items-center gap-2 wrap">
                    <CategoryChip category={selected.category} />
                    <StatusPill status={selected.status} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem' }}>{selected.title}</h3>
                  <div className="kv-row">
                    <div className="kv"><span className="kv-label">Estimated cost</span><span className="kv-value">{money(selected.cost)}</span></div>
                    <div className="kv"><span className="kv-label">Priority</span><span className={`kv-value prio-${selected.priority}`}>{selected.priority}</span></div>
                    <div className="kv"><span className="kv-label">Submitted</span><span className="kv-value">{shortDate(selected.created_at)}</span></div>
                  </div>
                  <div>
                    <div className="kv-label" style={{ marginBottom: '0.4rem' }}>Justification</div>
                    <div className="note" style={{ borderLeft: 'none', whiteSpace: 'pre-wrap' }}>{selected.description}</div>
                  </div>
                  {selected.status === 'Pending' ? (
                    <div className="field">
                      <label className="label" htmlFor="review-comment">Decision note (optional)</label>
                      <textarea id="review-comment" className="textarea" placeholder="Explain the allocation, budget limits, or reason for rejection…" value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>
                  ) : selected.approver_comment && (
                    <div className="note">
                      <div className="kv-label" style={{ marginBottom: '0.3rem' }}>Decision note</div>
                      <span style={{ fontStyle: 'italic' }}>“{selected.approver_comment}”</span>
                    </div>
                  )}
                </div>
                {selected.status === 'Pending' && (
                  <div className="detail-foot">
                    <button type="button" className="btn btn-danger grow" onClick={() => decide('Rejected')} disabled={submitting}>
                      <IconXCircle width={17} height={17} /> Reject
                    </button>
                    <button type="button" className="btn btn-success grow" onClick={() => decide('Approved')} disabled={submitting}>
                      <IconCheck width={17} height={17} /> Approve
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="detail-empty">
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--grad-brand-soft)', color: 'hsl(var(--primary))' }}>
                  <IconInbox width={26} height={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'hsl(var(--text))' }}>Select a request</div>
                  <p className="muted" style={{ marginTop: '0.2rem' }}>Pick a request from the list to review and decide.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Segment({ value, onChange, options, pendingCount }: { value: string; onChange: (v: string) => void; options: string[]; pendingCount: number }) {
  return (
    <div className="segment">
      {options.map((o) => (
        <button key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>
          {o === 'all' ? 'All' : o}{o === 'Pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
        </button>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="card flex col" style={{ padding: '0.5rem 0' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ padding: '1rem 1.35rem' }}>
          <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '25%' }} />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex col items-center gap-3" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--grad-brand-soft)', color: 'hsl(var(--primary))' }}>
        <IconInbox width={28} height={28} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>All clear</div>
        <p className="muted" style={{ marginTop: '0.25rem' }}>No requests match this filter right now.</p>
      </div>
    </div>
  )
}
