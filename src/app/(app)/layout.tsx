import type { ReactNode } from 'react'
import { getActor } from '@/lib/auth/guards'
import { BottomNav } from '@/components/bottom-nav'

/**
 * Shared shell for every signed-in tab (fixtures, leaderboard, profile,
 * admin): resolves the actor once and renders the bottom nav here so it
 * persists across tab navigation instead of remounting per page.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const actor = await getActor()

  return (
    <>
      {children}
      <BottomNav showAdmin={actor.isSuperadmin} />
    </>
  )
}
