'use client'

import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

/**
 * Bottom-nav order — the same list `BottomNav` renders, duplicated rather
 * than imported so this stays a plain array usable outside any component.
 * Determines which direction a tab switch slides: moving right along the bar
 * slides the new page in from the right, and back gives the mirror.
 */
const TAB_ORDER = ['/fixtures', '/leaderboard', '/profile', '/admin']

function tabIndex(pathname: string): number {
  return TAB_ORDER.findIndex(
    (tab) => pathname === tab || pathname.startsWith(`${tab}/`),
  )
}

/**
 * Replays each tab's content with a short directional slide so switching
 * tabs reads as moving across a strip instead of a hard cut — mirroring the
 * bottom nav's left-to-right order.
 *
 * Keyed on pathname so React remounts (and thus re-triggers the animation
 * class) on every navigation. Direction comes from comparing this render's
 * tab index against the previous one, stored in state and adjusted inline
 * during render (React's documented pattern for "derive from a prop change"
 * — a ref can't be read or written during render under the compiler).
 */
export function TabTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const index = tabIndex(pathname)

  const [previous, setPrevious] = useState({ pathname, index })

  let direction: 'left' | 'right' = 'right'
  if (pathname !== previous.pathname) {
    if (index !== -1 && previous.index !== -1 && index < previous.index) {
      direction = 'left'
    }
    setPrevious({ pathname, index })
  }

  return (
    <div
      key={pathname}
      className={direction === 'right' ? 'animate-tab-from-right' : 'animate-tab-from-left'}
    >
      {children}
    </div>
  )
}
