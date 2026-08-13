'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'

/**
 * Fixed bottom navigation.
 *
 * A phone app in a gym: thumbs reach the bottom of the screen, not the top.
 * `body` reserves the height in globals.css, so pages never need to pad for it.
 *
 * A client component only because the active tab depends on the current path —
 * the links themselves are ordinary anchors.
 */

type NavItem = {
  // `Route` rather than `string`: typedRoutes is on, so a typo in a nav
  // destination fails the build instead of shipping a dead tab.
  href: Route
  label: string
  icon: string
}

const MEMBER_ITEMS: NavItem[] = [
  { href: '/fixtures', label: 'Rencontres', icon: '🏸' },
  { href: '/leaderboard', label: 'Classement', icon: '🏆' },
  { href: '/profile', label: 'Profil', icon: '👤' },
]

const ADMIN_ITEM: NavItem = { href: '/admin', label: 'Admin', icon: '⚙️' }

export function BottomNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname()
  const items = showAdmin ? [...MEMBER_ITEMS, ADMIN_ITEM] : MEMBER_ITEMS

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 pb-[var(--safe-bottom)] backdrop-blur"
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
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-court-dark' : 'text-ink-soft'
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
