'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import {
  RequestItem,
  UserProfile,
  Category,
  Priority,
  StatusPill,
  StatusDot,
  CATEGORY_ICON,
  isMissingSchema,
  SchemaNotice,
  money,
  shortDate,
} from '@/components/ui/shared'
import { StatusDonut, CategoryBars, TrendBars } from '@/components/ui/charts'
import {
  IconPlus,
  IconX,
  IconInbox,
} from '@/components/ui/icons'

interface Props {
  user: UserProfile
  isDemoMode: boolean
  view: string
  onView: (v: string) => void
}

const CATEGORIES: Category[] = ['Hardware', 'Software License', 'Cloud Access', 'Other']
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High']

export default function RequesterDashboard({ user, isDemoMode, view, onView }: Props) {
  const toast = useToast()
  const supabase = createSupabaseClient()

  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<RequestItem | null>(null)

  // form
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('Hardware')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [cost, setCost] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const defaults = useCallback((): RequestItem[] => [
    {
      id: 'demo-req-1', requester_id: user.id, title: 'Slack Enterprise License', category: 'Software License',
      description: 'Access to the official Slack Enterprise workspace to coordinate with internal product teams.',
      priority: 'Medium', cost: 120, status: 'Approved', approver_comment: 'Approved — license allocated from the IT budget.',
      created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    },
    {
      id: 'demo-req-2', requester_id: user.id, title: 'Dell UltraSharp 27" USB-C Monitor', category: 'Hardware',
      description: 'External monitor to improve productivity while working from home.',
      priority: 'Low', cost: 349.99, status: 'Pending', created_at: new Date(Date.now() - 864e5).toISOString(),
    },
    {
      id: 'demo-req-3', requester_id: user.id, title: 'Production Database Root Access', category: 'Cloud Access',
      description: 'Root PostgreSQL access to run quick diagnostics on the production cluster.',
      priority: 'High', cost: 0, status: 'Rejected',
      approver_comment: 'Denied — policy requires read-only staging access for developer accounts.',
      created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
    },
  ], [user.id])

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    if (isDemoMode) {
      const stored = localStorage.getItem('demo_requests')
      if (stored) {
        const all: RequestItem[] = JSON.parse(stored)
        setRequests(all.filter((r) => r.requester_id === user.id))
      } else {
        const d = defaults()
        localStorage.setItem('demo_requests', JSON.stringify(d))
        setRequests(d)
      }
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('requests').select('*').eq('requester_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      setRequests(data as RequestItem[])
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
  }, [isDemoMode, supabase, user.id, defaults, toast])

  useEffect(() => {
    fetchRequests()
    if (!isDemoMode) {
      const channel = supabase
        .channel('req-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `requester_id=eq.${user.id}` }, () => fetchRequests())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [fetchRequests, isDemoMode, supabase, user.id])

  const resetForm = () => {
    setTitle(''); setCategory('Hardware'); setDescription(''); setPriority('Medium'); setCost('0'); setFormError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!title.trim() || !description.trim()) return setFormError('Please fill out the title and description.')
    const numCost = parseFloat(cost)
    if (isNaN(numCost) || numCost < 0) return setFormError('Cost must be a non-negative number.')

    setSubmitting(true)
    if (isDemoMode) {
      const newReq: RequestItem = {
        id: 'req-' + Math.random().toString(36).slice(2, 11), requester_id: user.id,
        title, category, description, priority, cost: numCost, status: 'Pending', created_at: new Date().toISOString(),
      }
      const stored = localStorage.getItem('demo_requests')
      const all: RequestItem[] = stored ? JSON.parse(stored) : []
      all.unshift(newReq)
      localStorage.setItem('demo_requests', JSON.stringify(all))
      setRequests(all.filter((r) => r.requester_id === user.id))
      setSubmitting(false); setCreating(false); resetForm()
      toast.success('Request submitted', 'Your request is now pending review.')
      return
    }
    try {
      const { error } = await supabase.from('requests').insert({ requester_id: user.id, title, category, description, priority, cost: numCost, status: 'Pending' })
      if (error) throw error
      setCreating(false); resetForm(); fetchRequests()
      toast.success('Request submitted', 'Your request is now pending review.')
    } catch (err) {
      setFormError((err as Error).message || 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalSpend = requests.filter((r) => r.status === 'Approved').reduce((s, r) => s + Number(r.cost), 0)
  const pendingCount = requests.filter((r) => r.status === 'Pending').length
  const approvedCount = requests.filter((r) => r.status === 'Approved').length

  const filtered = view === 'all' ? requests : requests.filter((r) => r.status === view)

  return (
    <div className="flex col gap-4 animate-fade-up">
      {/* Header */}
      <div className="flex justify-between items-center wrap gap-3">
        <div>
          <h1 style={{ fontSize: '1.9rem' }}>Your requests</h1>
          <p className="muted" style={{ marginTop: '0.25rem' }}>Submit, track, and manage your IT asset & access requests.</p>
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => setCreating(true)} disabled={schemaMissing}>
          <IconPlus width={18} height={18} /> New request
        </button>
      </div>

      {schemaMissing && <SchemaNotice />}

      {/* Summary line */}
      {!schemaMissing && (
        <div className="summary">
          <span className="summary-item"><span className="summary-num">{money(totalSpend)}</span> approved spend</span>
          <span className="summary-item"><span className="summary-num">{pendingCount}</span> pending</span>
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
      <div className="flex justify-between items-center wrap gap-2">
        <Segment value={view} onChange={onView} options={['all', 'Pending', 'Approved', 'Rejected']} pendingCount={pendingCount} />
      </div>

      {/* Split: list + detail/form */}
      {loading ? (
        <ListSkeleton />
      ) : schemaMissing ? (
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <span className="muted">Connect your database to see requests here.</span>
        </div>
      ) : (
        <div className="split">
          {/* Left — list */}
          {filtered.length === 0 ? (
            <div className="card"><EmptyState onCreate={() => { setCreating(true); setSelected(null) }} /></div>
          ) : (
            <div className="card split-list rlist">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className={`rrow ${selected?.id === r.id && !creating ? 'is-active' : ''}`}
                  onClick={() => { setSelected(r); setCreating(false) }}
                >
                  <div className="rrow-main">
                    <div className="rrow-title">{r.title}</div>
                    <div className="rrow-sub">{r.category} · {shortDate(r.created_at)}</div>
                  </div>
                  <div className="rrow-meta">
                    <span className="rrow-cost">{money(r.cost)}</span>
                    <StatusDot status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Right — inline form or detail */}
          <div className="card detail">
            {creating ? (
              <CreateForm
                {...{ title, setTitle, category, setCategory, description, setDescription, priority, setPriority, cost, setCost, formError, submitting }}
                onSubmit={submit}
                onCancel={() => { setCreating(false); resetForm() }}
              />
            ) : selected ? (
              <RequestDetail request={selected} />
            ) : (
              <div className="detail-empty">
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: 'var(--grad-brand-soft)', color: 'hsl(var(--primary))' }}>
                  <IconInbox width={26} height={26} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'hsl(var(--text))' }}>Select a request</div>
                  <p className="muted" style={{ marginTop: '0.2rem' }}>Pick one from the list to see its details, or start a new request.</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}><IconPlus width={15} height={15} /> New request</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CreateFormProps {
  title: string; setTitle: (v: string) => void
  category: Category; setCategory: (v: Category) => void
  description: string; setDescription: (v: string) => void
  priority: Priority; setPriority: (v: Priority) => void
  cost: string; setCost: (v: string) => void
  formError: string; submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

function CreateForm(p: CreateFormProps) {
  return (
    <>
      <div className="detail-head flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '1.2rem' }}>New request</h2>
          <p className="muted" style={{ marginTop: '0.15rem' }}>Tell us what you need and why.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={p.onCancel}><IconX width={18} height={18} /></button>
      </div>
      <form onSubmit={p.onSubmit} className="flex col" style={{ flex: 1 }}>
        <div className="detail-body">
          {p.formError && (
            <div style={{ padding: '0.7rem 0.9rem', borderRadius: 'var(--r-md)', background: 'hsl(var(--rose)/0.1)', border: '1px solid hsl(var(--rose)/0.25)', color: 'hsl(352 72% 44%)', fontSize: '0.85rem' }}>{p.formError}</div>
          )}
          <div className="field">
            <label className="label" htmlFor="r-title">Request title</label>
            <input id="r-title" className="input" placeholder="e.g. GitHub Copilot license" value={p.title} onChange={(e) => p.setTitle(e.target.value)} required />
          </div>
          <div className="field">
            <label className="label">Category</label>
            <div className="flex gap-2 wrap">
              {CATEGORIES.map((c) => {
                const Ico = CATEGORY_ICON[c]
                const on = p.category === c
                return (
                  <button key={c} type="button" onClick={() => p.setCategory(c)} className="grow"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 0.7rem', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, minWidth: 'calc(50% - 0.35rem)',
                      background: on ? 'var(--grad-brand-soft)' : 'hsl(var(--surface))',
                      border: `1.5px solid ${on ? 'hsl(var(--primary))' : 'hsl(var(--border-strong))'}`,
                      color: on ? 'hsl(var(--primary-ink))' : 'hsl(var(--text-2))' }}>
                    <Ico width={16} height={16} /> {c}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="field grow">
              <label className="label" htmlFor="r-priority">Priority</label>
              <select id="r-priority" className="select" value={p.priority} onChange={(e) => p.setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((pr) => <option key={pr} value={pr}>{pr}</option>)}
              </select>
            </div>
            <div className="field grow">
              <label className="label" htmlFor="r-cost">Estimated cost ($)</label>
              <input id="r-cost" type="number" step="0.01" className="input" placeholder="0.00" value={p.cost} onChange={(e) => p.setCost(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="r-desc">Business justification</label>
            <textarea id="r-desc" className="textarea" placeholder="Why is this needed for your role?" value={p.description} onChange={(e) => p.setDescription(e.target.value)} required />
          </div>
        </div>
        <div className="detail-foot" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={p.onCancel} disabled={p.submitting}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={p.submitting}>{p.submitting ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </>
  )
}

function RequestDetail({ request }: { request: RequestItem }) {
  const Ico = CATEGORY_ICON[request.category]
  return (
    <>
      <div className="detail-head flex items-center gap-2">
        <div className="stat-ico" style={{ width: 40, height: 40, background: 'var(--grad-brand)' }}><Ico width={19} height={19} /></div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{request.title}</div>
          <div className="muted">{request.category}</div>
        </div>
      </div>
      <div className="detail-body">
        <div><StatusPill status={request.status} /></div>
        <div className="kv-row">
          <div className="kv"><span className="kv-label">Estimated cost</span><span className="kv-value">{money(request.cost)}</span></div>
          <div className="kv"><span className="kv-label">Priority</span><span className={`kv-value prio-${request.priority}`}>{request.priority}</span></div>
          <div className="kv"><span className="kv-label">Submitted</span><span className="kv-value">{shortDate(request.created_at)}</span></div>
        </div>
        <div>
          <div className="kv-label" style={{ marginBottom: '0.4rem' }}>Justification</div>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'hsl(var(--text-2))' }}>{request.description}</p>
        </div>
        {request.approver_comment && (
          <div className="note">
            <div className="kv-label" style={{ marginBottom: '0.3rem' }}>Approver comment</div>
            <span style={{ fontStyle: 'italic' }}>“{request.approver_comment}”</span>
          </div>
        )}
      </div>
    </>
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex col items-center gap-3" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'var(--grad-brand-soft)', color: 'hsl(var(--primary))' }}>
        <IconInbox width={28} height={28} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>Nothing here yet</div>
        <p className="muted" style={{ marginTop: '0.25rem' }}>Create your first request to get started.</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={onCreate}><IconPlus width={16} height={16} /> New request</button>
    </div>
  )
}
