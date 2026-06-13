'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import {
  IconBolt,
  IconShield,
  IconArrowRight,
  IconInbox,
  IconWallet,
} from '@/components/ui/icons'

// Shared password for the pre-seeded demo/test accounts (requester + approver).
const TEST_PASSWORD = 'Demo!2026'
const TEST_ACCOUNTS = [
  { email: 'requester@company.com', name: 'Alex Smith', role: 'requester' as const, label: 'Alex · Requester', emoji: '👤' },
  { email: 'approver@company.com', name: 'Jane Doe', role: 'approver' as const, label: 'Jane · Approver', emoji: '🔑' },
]

function AuthScreen() {
  const router = useRouter()
  const toast = useToast()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'requester' | 'approver'>('requester')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(true)
  const [ready, setReady] = useState(false)

  const supabase = createSupabaseClient()

  const prefill = (account: (typeof TEST_ACCOUNTS)[number]) => {
    setIsSignUp(false)
    setEmail(account.email)
    setPassword(TEST_PASSWORD)
    setError('')
  }

  useEffect(() => {
    const hasKeys =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    setIsDemoMode(!hasKeys)

    if (hasKeys) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) router.push('/dashboard')
        else setReady(true)
      })
    } else {
      if (localStorage.getItem('demo_user')) router.push('/dashboard')
      else setReady(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishDemo = (user: object) => {
    localStorage.setItem('demo_user', JSON.stringify(user))
    router.push('/dashboard')
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isDemoMode) {
      try {
        if (isSignUp) {
          const newUser = {
            id: 'demo-' + Math.random().toString(36).slice(2, 11),
            email,
            full_name: fullName || email.split('@')[0],
            role,
          }
          const profiles = JSON.parse(localStorage.getItem('demo_profiles') || '[]')
          if (profiles.some((p: { email: string }) => p.email === email)) {
            throw new Error('An account with this email already exists.')
          }
          profiles.push(newUser)
          localStorage.setItem('demo_profiles', JSON.stringify(profiles))
          toast.success('Welcome aboard!', 'Your demo account is ready.')
          finishDemo(newUser)
        } else {
          const profiles = JSON.parse(localStorage.getItem('demo_profiles') || '[]')
          let user = profiles.find((p: { email: string }) => p.email === email)
          if (!user) {
            if (email === 'requester@company.com') user = { id: 'demo-requester-1', email, full_name: 'Alex Smith', role: 'requester' }
            else if (email === 'approver@company.com') user = { id: 'demo-approver-1', email, full_name: 'Jane Doe', role: 'approver' }
            else throw new Error('No account found. Try a quick login or sign up first.')
          }
          finishDemo(user)
        }
      } catch (err) {
        setError((err as Error).message)
        setLoading(false)
      }
      return
    }

    // Supabase mode
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        })
        if (signUpError) throw signUpError
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, full_name: fullName, role })
        }
        if (data.session) {
          router.push('/dashboard')
        } else {
          toast.success('Account created', 'Confirm your email, then sign in.')
          setIsSignUp(false)
          setLoading(false)
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.push('/dashboard')
      }
    } catch (err) {
      setError((err as Error).message || 'Authentication failed.')
      setLoading(false)
    }
  }

  const quickLogin = (emailStr: string) => {
    setLoading(true)
    const user =
      emailStr === 'approver@company.com'
        ? { id: 'demo-approver-1', email: emailStr, full_name: 'Jane Doe', role: 'approver' }
        : { id: 'demo-requester-1', email: emailStr, full_name: 'Alex Smith', role: 'requester' }
    setTimeout(() => finishDemo(user), 350)
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,0.95fr)' }}>
      {/* Left — brand / marketing panel */}
      <aside className="auth-hero">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#fff' }}>
            ApproveFlow
          </span>
        </div>

        <div style={{ maxWidth: 460 }} className="animate-fade-up">
          <h1 style={{ fontSize: '2.7rem', color: '#fff', lineHeight: 1.08 }}>
            Requests in.
            <br />
            Decisions out.
            <br />
            <span style={{ opacity: 0.85 }}>Zero friction.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '1.05rem', marginTop: '1.1rem', lineHeight: 1.6 }}>
            The unified portal for IT asset, software, and access requests — submit, track, and approve in one vivid workspace.
          </p>

          <div className="flex col gap-3" style={{ marginTop: '2.25rem' }}>
            <HeroFeature icon={IconInbox} title="One inbox for everything" desc="Hardware, licenses, and cloud access in a single queue." />
            <HeroFeature icon={IconWallet} title="Budget at a glance" desc="See pending spend and approved totals instantly." />
            <HeroFeature icon={IconShield} title="Clear accountability" desc="Every decision carries a reviewer and a reason." />
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} ApproveFlow · Internal IT portal
        </div>
      </aside>

      {/* Right — form */}
      <main style={{ display: 'grid', placeItems: 'center', padding: '2.5rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade-up">
          <div
            className="flex items-center gap-1"
            style={{
              alignSelf: 'flex-start',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--r-pill)',
              marginBottom: '1.5rem',
              background: isDemoMode ? 'hsl(var(--amber) / 0.14)' : 'hsl(var(--emerald) / 0.14)',
              color: isDemoMode ? 'hsl(38 92% 38%)' : 'hsl(158 72% 32%)',
            }}
          >
            {isDemoMode ? <IconBolt width={14} height={14} /> : <IconShield width={14} height={14} />}
            {isDemoMode ? 'Offline demo mode' : 'Connected to Supabase'}
          </div>

          <h2 style={{ fontSize: '1.85rem' }}>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted" style={{ marginTop: '0.35rem' }}>
            {isSignUp ? 'Set up your workspace in seconds.' : 'Sign in to pick up where you left off.'}
          </p>

          {!isSignUp && (
            <div style={{ marginTop: '1.5rem' }}>
              <div className="label" style={{ marginBottom: '0.5rem' }}>
                {isDemoMode ? 'Quick login' : 'Prefill a test account'}
              </div>
              <div className="flex gap-2">
                {TEST_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    className="btn btn-secondary grow"
                    disabled={loading}
                    onClick={() => (isDemoMode ? quickLogin(acc.email) : prefill(acc))}
                  >
                    {acc.emoji} {acc.label}
                  </button>
                ))}
              </div>
              {!isDemoMode && (
                <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                  Fills the form below — press Sign in to continue.
                </p>
              )}
              <div className="flex items-center gap-2" style={{ margin: '1.25rem 0 0.25rem', color: 'hsl(var(--text-3))', fontSize: '0.75rem', fontWeight: 600 }}>
                <hr className="divider grow" />
                OR USE EMAIL
                <hr className="divider grow" />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--r-md)',
                background: 'hsl(var(--rose) / 0.1)',
                border: '1px solid hsl(var(--rose) / 0.25)',
                color: 'hsl(352 72% 44%)',
                fontSize: '0.86rem',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex col gap-3" style={{ marginTop: '1.5rem' }}>
            {isSignUp && (
              <div className="field">
                <label className="label" htmlFor="full-name">Full name</label>
                <input id="full-name" className="input" placeholder="Alex Smith" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}

            <div className="field">
              <label className="label" htmlFor="email-input">Email address</label>
              <input id="email-input" type="email" className="input" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="field">
              <label className="label" htmlFor="password-input">Password</label>
              <input id="password-input" type="password" className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required={!isDemoMode} />
            </div>

            {isSignUp && (
              <div className="field">
                <label className="label">I am a…</label>
                <div className="flex gap-2">
                  <RolePick label="Requester" desc="I request assets & access" active={role === 'requester'} onClick={() => setRole('requester')} />
                  <RolePick label="Approver" desc="I review & decide" active={role === 'approver'} onClick={() => setRole('approver')} />
                </div>
              </div>
            )}

            <button id="auth-submit-btn" type="submit" className="btn btn-primary btn-lg w-full" style={{ marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
              {!loading && <IconArrowRight width={18} height={18} />}
            </button>
          </form>

          <p className="muted" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, color: 'hsl(var(--primary))' }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </main>

      <style jsx>{`
        .auth-hero {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem;
          overflow: hidden;
          background:
            radial-gradient(700px 400px at 80% 10%, hsl(330 82% 62% / 0.55), transparent 60%),
            radial-gradient(600px 500px at 10% 90%, hsl(190 90% 55% / 0.4), transparent 55%),
            linear-gradient(150deg, hsl(258 80% 56%), hsl(280 78% 48%));
        }
        @media (max-width: 900px) {
          .auth-hero { display: none; }
        }
      `}</style>
    </div>
  )
}

function HeroFeature({ icon: Ico, title, desc }: { icon: typeof IconInbox; title: string; desc: string }) {
  return (
    <div className="flex gap-2 items-center">
      <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.16)', color: '#fff', flexShrink: 0 }}>
        <Ico width={20} height={20} />
      </div>
      <div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
        <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.84rem' }}>{desc}</div>
      </div>
    </div>
  )
}

function RolePick({ label, desc, active, onClick }: { label: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grow"
      style={{
        textAlign: 'left',
        padding: '0.75rem 0.9rem',
        borderRadius: 'var(--r-md)',
        cursor: 'pointer',
        background: active ? 'var(--grad-brand-soft)' : 'hsl(var(--surface))',
        border: `1.5px solid ${active ? 'hsl(var(--primary))' : 'hsl(var(--border-strong))'}`,
        boxShadow: active ? '0 0 0 4px hsl(var(--primary) / 0.12)' : 'none',
        transition: 'all 0.16s ease',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: active ? 'hsl(var(--primary-ink))' : 'hsl(var(--text))' }}>{label}</div>
      <div style={{ fontSize: '0.74rem', color: 'hsl(var(--text-3))' }}>{desc}</div>
    </button>
  )
}

export default function Home() {
  return (
    <ToastProvider>
      <AuthScreen />
    </ToastProvider>
  )
}
