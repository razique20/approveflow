'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { IconCheckCircle, IconXCircle, IconBolt } from './icons'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastApi {
  push: (kind: ToastKind, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const KIND_ICON = {
  success: IconCheckCircle,
  error: IconXCircle,
  info: IconBolt,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, kind, title, message }])
      setTimeout(() => remove(id), 4200)
    },
    [remove]
  )

  const api: ToastApi = {
    push,
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
    info: (t, m) => push('info', t, m),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-region">
        {toasts.map((t) => {
          const Ico = KIND_ICON[t.kind]
          return (
            <div key={t.id} className={`toast toast-${t.kind}`} role="status" onClick={() => remove(t.id)}>
              <Ico className="toast-ico" />
              <div style={{ flex: 1 }}>
                <div className="toast-title">{t.title}</div>
                {t.message && <div className="toast-msg">{t.message}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
