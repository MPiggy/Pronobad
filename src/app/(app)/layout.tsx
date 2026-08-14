import { Suspense, type ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { TabTransition } from '@/components/tab-transition'

/**
 * Shared shell for every signed-in tab (fixtures, leaderboard, profile,
 * admin): renders the bottom nav here so it persists across tab navigation
 * instead of remounting per page.
 *
 * `TabTransition` and `BottomNav` both read `usePathname()`, which depends on
 * dynamic route params (e.g. `/fixtures/[matchId]`) not known at prerender
 * time — under Cache Components that requires a `<Suspense>` boundary, or the
 * build/dev-server errors with CLIENT_HOOK_DYNAMIC.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <TabTransition>{children}</TabTransition>
      <BottomNav />
    </Suspense>
  )
}
