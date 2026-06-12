'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ToastProvider } from '@/components/ui/Toast'
import AppShell from '@/components/ui/AppShell'
import { IconInbox, IconClock, IconCheckCircle, IconXCircle } from '@/components/ui/icons'
import { UserProfile } from '@/components/ui/shared'
import RequesterDashboard from '@/components/RequesterDashboard'
import ApproverDashboard from '@/components/ApproverDashboard'

function DashboardInner() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [view, setView] = useState('all')
  const supabase = createSupabaseClient()

  useEffect(() => {
    const hasKeys =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    setIsDemoMode(!hasKeys)

    const run = async () => {
      if (hasKeys) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return router.push('/')
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('id', session.user.id)
            .single()
          setUser(
            (profile as UserProfile) ?? {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'Team Member',
              role: (session.user.user_metadata?.role as 'requester' | 'approver') || 'requester',
            }
          )
        } catch {
          return router.push('/')
        }
      } else {
        const demo = localStorage.getItem('demo_user')
        if (!demo) return router.push('/')
        setUser(JSON.parse(demo))
      }
      setLoading(false)
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    if (isDemoMode) localStorage.removeItem('demo_user')
    else await supabase.auth.signOut()
    router.push('/')
  }

  const toggleRole = () => {
    if (!user || !isDemoMode) return
    const next = user.role === 'requester' ? 'approver' : 'requester'
    const updated: UserProfile = {
      ...user,
      role: next,
      full_name: next === 'approver' ? 'Jane Doe' : 'Alex Smith',
      email: next === 'approver' ? 'approver@company.com' : 'requester@company.com',
    }
    localStorage.setItem('demo_user', JSON.stringify(updated))
    setUser(updated)
    setView('all')
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', gap: '1rem' }}>
        <div className="flex col items-center gap-3">
          <div className="spinner" />
          <p className="muted">Loading your workspace…</p>
        </div>
      </div>
    )
  }

  const nav = [
    { key: 'all', label: 'All requests', icon: IconInbox },
    { key: 'Pending', label: user.role === 'approver' ? 'Needs review' : 'Pending', icon: IconClock },
    { key: 'Approved', label: 'Approved', icon: IconCheckCircle },
    { key: 'Rejected', label: 'Rejected', icon: IconXCircle },
  ]

  return (
    <AppShell
      user={user}
      isDemoMode={isDemoMode}
      nav={nav}
      active={view}
      onNavigate={setView}
      onLogout={handleLogout}
      onToggleRole={toggleRole}
    >
      {user.role === 'requester' ? (
        <RequesterDashboard user={user} isDemoMode={isDemoMode} view={view} onView={setView} />
      ) : (
        <ApproverDashboard user={user} isDemoMode={isDemoMode} view={view} onView={setView} />
      )}
    </AppShell>
  )
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  )
}
