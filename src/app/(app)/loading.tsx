import { SkeletonCards, SkeletonShell } from '@/components/skeleton'

/**
 * Shown while navigating to a tab, before that page's own Suspense fallback
 * takes over. Keeps the layout's nav mounted and fills the content column so
 * a tab switch shows the shape of the page instead of a blank screen.
 *
 * Deliberately generic — it covers every route under `(app)` that doesn't
 * ship a closer-fitting `loading.tsx` of its own.
 */
export default function Loading() {
  return (
    <SkeletonShell>
      <SkeletonCards count={5} />
    </SkeletonShell>
  )
}
