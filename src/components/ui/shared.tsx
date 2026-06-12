import { IconCpu, IconKey, IconCloud, IconBox } from './icons'

export type Category = 'Hardware' | 'Software License' | 'Cloud Access' | 'Other'
export type Status = 'Pending' | 'Approved' | 'Rejected'
export type Priority = 'Low' | 'Medium' | 'High'

export interface RequestItem {
  id: string
  requester_id: string
  requester_name?: string
  requester_email?: string
  title: string
  category: Category
  description: string
  priority: Priority
  cost: number
  status: Status
  approver_comment?: string
  approver_id?: string
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'requester' | 'approver'
}

export const CATEGORY_ICON: Record<Category, typeof IconCpu> = {
  Hardware: IconCpu,
  'Software License': IconKey,
  'Cloud Access': IconCloud,
  Other: IconBox,
}

// True when a Supabase error means the tables haven't been created yet
// (schema.sql not applied). PostgREST returns PGRST205 / Postgres 42P01.
export function isMissingSchema(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  const code = e?.code
  const msg = (e?.message || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  )
}

export function money(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

// Deterministic gradient for an avatar based on a seed string
export function avatarGradient(seed: string) {
  const grads = [
    'linear-gradient(135deg, hsl(258 88% 64%), hsl(330 82% 62%))',
    'linear-gradient(135deg, hsl(200 92% 55%), hsl(170 80% 48%))',
    'linear-gradient(135deg, hsl(38 96% 56%), hsl(20 92% 58%))',
    'linear-gradient(135deg, hsl(158 74% 46%), hsl(190 84% 50%))',
    'linear-gradient(135deg, hsl(352 86% 60%), hsl(322 80% 58%))',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return grads[h % grads.length]
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        background: avatarGradient(name),
      }}
    >
      {initials(name)}
    </div>
  )
}

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{status}</span>
}

// Quiet status indicator (dot + label) for the minimal list aesthetic.
export function StatusDot({ status }: { status: Status }) {
  return <span className={`status status-${status.toLowerCase()}`}>{status}</span>
}

// Banner shown when the Supabase tables haven't been created yet.
export function SchemaNotice() {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.85rem',
        padding: '1rem 1.15rem',
        borderRadius: 'var(--r-md)',
        background: 'hsl(var(--amber) / 0.1)',
        border: '1px solid hsl(var(--amber) / 0.3)',
      }}
    >
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'hsl(38 92% 36%)' }}>
          Database not set up yet
        </div>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-2))', marginTop: '0.2rem', lineHeight: 1.5 }}>
          The <code>requests</code> and <code>profiles</code> tables don&apos;t exist in this Supabase project.
          Run <code>schema.sql</code> in the Supabase SQL editor to enable creating and reviewing requests.
        </p>
      </div>
    </div>
  )
}

export function CategoryChip({ category }: { category: Category }) {
  const Ico = CATEGORY_ICON[category]
  return (
    <span className="chip chip-cat">
      <Ico width={13} height={13} />
      {category}
    </span>
  )
}
