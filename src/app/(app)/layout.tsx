import type { ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'
import { TabTransition } from '@/components/tab-transition'

/**
 * Shared shell for every signed-in tab (fixtures, leaderboard, profile,
 * admin): renders the bottom nav here so it persists across tab navigation
 * instead of remounting per page.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TabTransition>{children}</TabTransition>
      <BottomNav />
    </>
  )
}
