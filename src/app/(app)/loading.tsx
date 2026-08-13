/**
 * Shown while a tab's data is loading. Keeps the layout's nav mounted and
 * fills the content column so navigation feels instant instead of blocking.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+var(--safe-top))]">
      <div className="mb-6 h-10 w-2/3 animate-pulse rounded-lg bg-sheet" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-line bg-sheet"
          />
        ))}
      </div>
    </main>
  )
}
