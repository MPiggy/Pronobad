import { Suspense, type ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'

/**
 * Shared shell for every signed-in tab (fixtures, leaderboard, profile,
 * admin): renders the bottom nav here so it persists across tab navigation
 * instead of remounting per page.
 *
 * Switching tabs shows the incoming page's skeleton (see `@/components/skeleton`
 * and each page's Suspense fallback) rather than animating — the content is
 * fetched per tab, so a transition would only ever animate an empty box.
 *
 * `BottomNav` reads `usePathname()`, which depends on dynamic route params
 * (e.g. `/fixtures/[matchId]`) not known at prerender time — under Cache
 * Components that requires a `<Suspense>` boundary, or the build/dev-server
 * errors with CLIENT_HOOK_DYNAMIC.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      {children}
      <BottomNav />
    </Suspense>
  )
}
