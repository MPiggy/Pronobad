import { formatRank } from '@/lib/format'

/**
 * The member's season at a glance: position, points, and how many fixtures
 * they have predicted so far.
 *
 * A member who hasn't scored yet has no leaderboard row, so `rank` is null
 * rather than a made-up last place.
 */
export function SeasonStats({
  rank,
  rankedCount,
  points,
  predictedCount,
  matchCount,
}: {
  rank: number | null
  rankedCount: number
  points: number
  predictedCount: number
  matchCount: number
}) {
  const stats = [
    {
      label: 'Classement',
      value: rank === null ? '—' : formatRank(rank),
      detail: rank === null ? null : `/ ${rankedCount}`,
    },
    { label: 'Points', value: String(points), detail: null },
    { label: 'Pronostics', value: String(predictedCount), detail: `/ ${matchCount}` },
  ]

  return (
    <dl className="grid grid-cols-3 gap-2">
      {stats.map(({ label, value, detail }) => (
        <div
          key={label}
          className="rounded-2xl border border-line/60 bg-shuttle-text/5 px-3 py-3 text-center"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-shuttle-text-soft">
            {label}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-shuttle-text">
            {value}
            {detail && (
              <span className="ml-1 text-xs font-normal text-shuttle-text-soft">{detail}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
