'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { Swords, Trophy, User, type LucideIcon } from 'lucide-react'

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

const LEFT_ITEMS: NavItem[] = [
  { href: '/leaderboard', label: 'Classement', icon: Trophy },
]

const CENTER_ITEM: NavItem = { href: '/fixtures', label: 'Rencontres', icon: Swords }

const RIGHT_ITEMS: NavItem[] = [{ href: '/profile', label: 'Profil', icon: User }]

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function BottomNav() {
  const pathname = usePathname()
  const centerActive = isItemActive(pathname, CENTER_ITEM.href)

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line/40 bg-shuttle/95 pb-[var(--safe-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md items-end">
        {LEFT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isItemActive(pathname, item.href)} />
        ))}

        <li className="flex-1">
          <Link
            href={CENTER_ITEM.href}
            aria-current={centerActive ? 'page' : undefined}
            className={`mx-auto -mt-4 flex size-16 flex-col items-center justify-center gap-0.5 rounded-full border-4 border-shuttle text-xs font-semibold shadow-lg transition-colors ${
              centerActive
                ? 'bg-court text-ink shadow-court/30'
                : 'bg-court/90 text-ink shadow-court/20'
            }`}
          >
            <Swords aria-hidden className="size-6" strokeWidth={centerActive ? 2.5 : 2} />
          </Link>
        </li>

        {RIGHT_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={isItemActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon

  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
          active ? 'text-court' : 'text-shuttle-text-soft'
        }`}
      >
        <Icon aria-hidden className="size-5" strokeWidth={active ? 2.5 : 2} />
        {item.label}
      </Link>
    </li>
  )
}
