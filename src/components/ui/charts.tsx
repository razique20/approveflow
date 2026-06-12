'use client'

import { RequestItem, Status, Category } from './shared'

const STATUS_COLOR: Record<Status, string> = {
  Pending: 'hsl(38 95% 52%)',
  Approved: 'hsl(158 72% 42%)',
  Rejected: 'hsl(352 84% 58%)',
}

const CAT_COLOR: Record<Category, string> = {
  Hardware: 'hsl(245 80% 60%)',
  'Software License': 'hsl(270 80% 62%)',
  'Cloud Access': 'hsl(190 90% 48%)',
  Other: 'hsl(38 95% 52%)',
}

/* ---------- Donut: status mix ---------- */

export function StatusDonut({ requests }: { requests: RequestItem[] }) {
  const order: Status[] = ['Approved', 'Pending', 'Rejected']
  const counts = order.map((s) => ({ s, n: requests.filter((r) => r.status === s).length }))
  const total = requests.length

  const R = 52
  const C = 2 * Math.PI * R
  let offset = 0
  const arcs = counts.map(({ s, n }) => {
    const frac = total ? n / total : 0
    const seg = { s, color: STATUS_COLOR[s], dash: frac * C, gap: C - frac * C, off: offset }
    offset -= frac * C
    return seg
  })

  return (
    <div className="card insight">
      <div className="insight-title">Status mix</div>
      <div className="flex items-center gap-4">
        <svg width="128" height="128" viewBox="0 0 128 128" style={{ flexShrink: 0 }}>
          <circle cx="64" cy="64" r={R} fill="none" stroke="hsl(var(--surface-3))" strokeWidth="16" />
          {total > 0 &&
            arcs.map(({ s, color, dash, gap, off }) =>
              dash > 0 ? (
                <circle
                  key={s}
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth="16"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={off}
                  transform="rotate(-90 64 64)"
                  strokeLinecap="butt"
                />
              ) : null
            )}
          <text x="64" y="60" textAnchor="middle" style={{ font: '800 1.5rem var(--font-display)', fill: 'hsl(var(--text))' }}>
            {total}
          </text>
          <text x="64" y="78" textAnchor="middle" style={{ font: '700 0.62rem var(--font-sans)', fill: 'hsl(var(--text-3))', letterSpacing: '0.05em' }}>
            TOTAL
          </text>
        </svg>
        <div className="flex col gap-2" style={{ flex: 1 }}>
          {counts.map(({ s, n }) => (
            <div key={s} className="legend-item" style={{ justifyContent: 'space-between' }}>
              <span className="flex items-center gap-1">
                <span className="legend-dot" style={{ background: STATUS_COLOR[s], borderRadius: '50%' }} />
                {s}
              </span>
              <span className="legend-val">{n} · {total ? Math.round((n / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Horizontal bars: category breakdown ---------- */

export function CategoryBars({ requests }: { requests: RequestItem[] }) {
  const cats: Category[] = ['Hardware', 'Software License', 'Cloud Access', 'Other']
  const data = cats.map((c) => ({ c, n: requests.filter((r) => r.category === c).length }))
  const max = Math.max(1, ...data.map((d) => d.n))

  return (
    <div className="card insight">
      <div className="insight-title">By category</div>
      <div className="flex col gap-3">
        {data.map(({ c, n }) => (
          <div key={c}>
            <div className="flex justify-between" style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>
              <span className="text-2">{c}</span>
              <span className="legend-val">{n}</span>
            </div>
            <div className="bar-track" style={{ height: 9 }}>
              <div className="bar-seg" style={{ width: `${(n / max) * 100}%`, background: CAT_COLOR[c] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Vertical bars: requests over the last N days ---------- */

export function TrendBars({ requests, days = 14 }: { requests: RequestItem[]; days?: number }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    return { d, n: 0 }
  })
  for (const r of requests) {
    const t = new Date(r.created_at)
    t.setHours(0, 0, 0, 0)
    const idx = buckets.findIndex((b) => b.d.getTime() === t.getTime())
    if (idx >= 0) buckets[idx].n++
  }
  const max = Math.max(1, ...buckets.map((b) => b.n))

  return (
    <div className="card insight">
      <div className="insight-title">Last {days} days</div>
      <div className="flex items-end gap-1" style={{ height: 92 }}>
        {buckets.map((b, i) => (
          <div
            key={i}
            title={`${b.d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${b.n}`}
            style={{
              flex: 1,
              height: `${(b.n / max) * 100}%`,
              minHeight: b.n > 0 ? 6 : 2,
              borderRadius: 'var(--r-sm) var(--r-sm) 3px 3px',
              background: b.n > 0 ? 'var(--grad-brand)' : 'hsl(var(--surface-3))',
              transition: 'height 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
