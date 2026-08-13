'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Fixed bottom navigation.
 *
 * A phone app in a gym: thumbs reach the bottom of the screen, not the top.
 * `body` reserves the height in globals.css, so pages never need to pad for it.
 *
 * Icons are inline strokes rather than emoji — emoji render differently on
 * every platform, carry their own colour, and cannot inherit the active state.
 *
 * A client component only because the active tab depends on the current path.
 */

type NavItem = {
  // `Route` rather than `string`: typedRoutes is on, so a typo in a nav
  // destination fails the build instead of shipping a dead tab.
  href: Route
  label: string
  icon: ReactNode
}

/** Shared stroke geometry, so every icon reads at the same visual weight. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {children}
    </svg>
  )
}

const MEMBER_ITEMS: NavItem[] = [
  {
    href: '/fixtures',
    label: 'Rencontres',
    // A calendar: the fixture list is a schedule before it is anything else.
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </Icon>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Classement',
    // Ranked bars rather than a trophy — the page is a table, not a prize.
    icon: (
      <Icon>
        <path d="M5 20V10M12 20V4M19 20v-7" />
      </Icon>
    ),
  },
  {
    href: '/profile',
    label: 'Profil',
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
      </Icon>
    ),
  },
]

const ADMIN_ITEM: NavItem = {
  href: '/admin',
  label: 'Admin',
  icon: (
    <Icon>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </Icon>
  ),
}

export function BottomNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname()
  const items = showAdmin ? [...MEMBER_ITEMS, ADMIN_ITEM] : MEMBER_ITEMS

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-sheet/95 pb-[var(--safe-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md">
        {items.map((item) => {
          // Sub-pages keep their section highlighted: /fixtures/abc is still
          // "Rencontres". Exact match alone would leave the bar blank there.
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {/* Active tab is marked by a rule at the top edge, echoing the
                    edge-markers used on the sheets. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-b bg-court"
                  />
                )}
                {item.icon}
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
