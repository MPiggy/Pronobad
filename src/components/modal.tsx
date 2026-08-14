'use client'

import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * A centered dialog over a dimmed backdrop.
 *
 * Closes on a backdrop click, on Escape, and via the built-in close button —
 * every path a member expects short of a stray tap inside the card itself,
 * which is why the click listener sits on the backdrop and checks
 * `target === currentTarget` rather than relying on bubbling from children.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const headingId = useId()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-sheet p-5 shadow-xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-full p-1.5 text-ink-soft transition-colors active:bg-shuttle/10"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
