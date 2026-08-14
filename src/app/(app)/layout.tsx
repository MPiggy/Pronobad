import { Suspense, type ReactNode } from 'react'
import { getActor } from '@/lib/auth/guards'
import { BottomNav } from '@/components/bottom-nav'
import { TabTransition } from '@/components/tab-transition'

/**
 * Shared shell for every signed-in tab (fixtures, leaderboard, profile,
 * admin): resolves the actor once and renders the bottom nav here so it
 * persists across tab navigation instead of remounting per page.
 *
 * The actor check reads the session cookie, so it — and everything beneath
 * it, including each page's own runtime reads — is request-bound. Suspense
 * here is what lets Next.js still prerender a static app shell (the `<html>`/
 * `<body>` chrome) instead of making the whole route tree dynamic.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Gated>{children}</Gated>
    </Suspense>
  )
}

async function Gated({ children }: { children: ReactNode }) {
  const actor = await getActor()

  return (
    <>
      <TabTransition>{children}</TabTransition>
      <BottomNav showAdmin={actor.isSuperadmin} />
    </>
  )
}
