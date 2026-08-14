'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2 } from 'lucide-react'

type Toast = { id: number; message: string }

const ToastContext = createContext<((message: string) => void) | null>(null)

/** Milliseconds a toast stays fully visible before it starts sliding out. */
const VISIBLE_MS = 2200
/** Must match `.animate-toast-out`'s duration in globals.css. */
const EXIT_MS = 150

/**
 * App-wide toast host. One provider at the root, mounted once — every page
 * calls `useToast()` rather than rendering its own stack, so a toast fired
 * from inside a modal still shows after the modal unmounts.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [leavingIds, setLeavingIds] = useState<Set<number>>(new Set())
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message }])

    setTimeout(() => {
      setLeavingIds((current) => new Set(current).add(id))
    }, VISIBLE_MS)

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      setLeavingIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }, VISIBLE_MS + EXIT_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+var(--safe-bottom))] z-[60] flex flex-col items-center gap-2 px-5">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-full bg-shuttle-text px-4 py-2.5 text-sm font-medium text-ink shadow-lg ${
              leavingIds.has(toast.id) ? 'animate-toast-out' : 'animate-toast-in'
            }`}
          >
            <CheckCircle2 aria-hidden className="size-4 shrink-0 text-win" />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** Fires a toast from anywhere under `ToastProvider`. */
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return showToast
}
