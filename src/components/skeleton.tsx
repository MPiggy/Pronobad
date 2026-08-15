/**
 * Loading placeholders shown while a tab's data streams in.
 *
 * Tab switches used to slide the incoming page in, but every page fetches its
 * own data behind a `<Suspense>` boundary — so the slide only ever animated an
 * empty box and was over before the content landed. These skeletons take its
 * place: each mirrors the shape of the page it stands in for, so the layout
 * doesn't jump when the real rows arrive.
 *
 * Server components — nothing here is interactive, and they render inside
 * Suspense fallbacks that must be available during prerender.
 */

/** One shimmering block. `className` sets its size and shape. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-sheet/10 ${className}`} />
}

/**
 * The `PageShell` header in placeholder form: logo square, title bar, and an
 * optional second line for pages that render a subtitle (the season name).
 */
export function SkeletonHeader({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <header className="mb-6 flex items-start gap-3">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-7 w-40" />
        {subtitle && <Skeleton className="mt-2 h-4 w-24" />}
      </div>
    </header>
  )
}

/**
 * The content column `PageShell` renders into, so a fallback lines up with the
 * page it replaces down to the horizontal padding.
 */
export function SkeletonShell({
  children,
  subtitle = true,
}: {
  children: React.ReactNode
  subtitle?: boolean
}) {
  return (
    <main
      // Announced rather than silent: the page is empty until data lands, and
      // a screen reader should hear that it is loading, not nothing at all.
      role="status"
      aria-busy="true"
      aria-label="Chargement en cours"
      className="mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+var(--safe-top))]"
    >
      <SkeletonHeader subtitle={subtitle} />
      {children}
    </main>
  )
}

/** Stand-in for a list of `rounded-2xl` cards — the shape most tabs render. */
export function SkeletonCards({
  count = 5,
  className = 'h-16',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${className} rounded-2xl`} />
      ))}
    </div>
  )
}
