'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { Swords, Trophy, User, Settings, type LucideIcon } from 'lucide-react'

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
  icon: LucideIcon
}

const MEMBER_ITEMS: NavItem[] = [
  { href: '/fixtures', label: 'Rencontres', icon: Swords },
  { href: '/leaderboard', label: 'Classement', icon: Trophy },
  { href: '/profile', label: 'Profil', icon: User },
]

const ADMIN_ITEM: NavItem = { href: '/admin', label: 'Admin', icon: Settings }

export function BottomNav({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname()
  const items = showAdmin ? [...MEMBER_ITEMS, ADMIN_ITEM] : MEMBER_ITEMS

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line/40 bg-shuttle/95 pb-[var(--safe-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md">
        {items.map((item) => {
          // Sub-pages keep their section highlighted: /fixtures/abc is still
          // "Rencontres". Exact match alone would leave the bar blank there.
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-court' : 'text-shuttle-text-soft'
                }`}
              >
                <Icon
                  aria-hidden
                  className="size-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
