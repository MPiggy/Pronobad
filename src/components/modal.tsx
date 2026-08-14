'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * A drawer-style dialog: slides up from the bottom on mobile, scales in on
 * desktop (see the `drawer-*`/`backdrop-*` keyframes in globals.css).
 *
 * Stays mounted for a beat after `onClose` fires so the exit animation can
 * play — the caller still owns whether the modal exists at all (conditional
 * render), this component just delays its own unmount by one animation
 * frame's worth of CSS.
 */
export function Modal({
  title,
  onClose,
  children,
  requestClose,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  /**
   * Bump this (e.g. a counter) to close the modal programmatically — after a
   * successful form submit, say — while still playing the exit animation
   * instead of yanking the modal out immediately.
   */
  requestClose?: number
}) {
  const headingId = useId()
  const [closing, setClosing] = useState(false)
  const lastRequestClose = useRef(requestClose)

  const close = () => setClosing(true)

  useEffect(() => {
    if (requestClose !== undefined && requestClose !== lastRequestClose.current) {
      close()
    }
    lastRequestClose.current = requestClose
  }, [requestClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm sm:items-center sm:p-4 ${
        closing ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      onAnimationEnd={(event) => {
        if (closing && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-sheet p-5 shadow-xl sm:rounded-3xl ${
          closing ? 'animate-drawer-out' : 'animate-drawer-in'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={headingId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
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
