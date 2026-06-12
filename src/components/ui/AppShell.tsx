'use client'

import { Avatar, UserProfile } from './shared'
import { IconInbox, IconShield, IconLogout, IconSwap, IconBolt } from './icons'

interface NavItem {
  key: string
  label: string
  icon: typeof IconInbox
}

interface AppShellProps {
  user: UserProfile
  isDemoMode: boolean
  nav: NavItem[]
  active: string
  onNavigate: (key: string) => void
  onLogout: () => void
  onToggleRole?: () => void
  children: React.ReactNode
}

export default function AppShell({
  user,
  isDemoMode,
  nav,
  active,
  onNavigate,
  onLogout,
  onToggleRole,
  children,
}: AppShellProps) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div style={{ padding: '0.25rem 0.5rem 1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            ApproveFlow
          </div>
          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-3))', fontWeight: 600 }}>
            {user.role === 'approver' ? 'Approver workspace' : 'Requester workspace'}
          </div>
        </div>

        <nav className="flex col gap-1" style={{ flex: 1 }}>
          {nav.map((item) => {
            const Ico = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${active === item.key ? 'active' : ''}`}
                onClick={() => onNavigate(item.key)}
              >
                <Ico className="nav-ico" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {isDemoMode && (
          <div
            style={{
              margin: '0.5rem 0.25rem',
              padding: '0.85rem',
              borderRadius: 'var(--r-md)',
              background: 'var(--grad-brand-soft)',
              border: '1px solid hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-1" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--primary-ink))' }}>
              <IconBolt width={14} height={14} /> Demo mode
            </div>
            <div style={{ fontSize: '0.74rem', color: 'hsl(var(--text-3))', marginTop: '0.2rem', lineHeight: 1.4 }}>
              Data is stored locally in your browser.
            </div>
            {onToggleRole && (
              <button type="button" className="btn btn-secondary btn-sm w-full" style={{ marginTop: '0.6rem' }} onClick={onToggleRole}>
                <IconSwap width={15} height={15} />
                Switch to {user.role === 'requester' ? 'Approver' : 'Requester'}
              </button>
            )}
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="grow flex items-center gap-2">
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--text-3))' }}>
              {user.role === 'approver' ? (
                <span className="flex items-center gap-1"><IconShield width={14} height={14} /> Review console</span>
              ) : (
                <span className="flex items-center gap-1"><IconInbox width={14} height={14} /> My requests</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>{user.full_name}</div>
              <div style={{ fontSize: '0.74rem', color: 'hsl(var(--text-3))' }}>{user.email}</div>
            </div>
            <Avatar name={user.full_name} size={40} />
            <button type="button" className="btn btn-ghost btn-icon" onClick={onLogout} title="Log out" aria-label="Log out">
              <IconLogout width={18} height={18} />
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  )
}
