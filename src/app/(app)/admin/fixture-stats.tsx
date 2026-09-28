import { explainRule, ScoringRule } from '@/lib/scoring/rules'
import { percentages, summarizePredictions } from '@/lib/predictions/stats'
import { formatPoints, formatScore } from '@/lib/format'
import type { AdminFixture } from './fixture-card'

/**
 * How the members bet on one fixture: the outcome split, the popular scores,
 * and who predicted what — the body of the admin card's stats modal.
 *
 * Admin-only by construction: the predictions it reads are loaded by the
 * admin page, which 403s anyone but a superadmin. Member-facing reads never
 * select other members' predictions (see src/lib/predictions/queries.ts).
 */

// Home and away are the two poles of a diverging scale, a draw its neutral
// middle. Checked with the dataviz palette validator against the modal's
// `sheet` surface; the legend carries each share as text, so no reading
// depends on telling the colors apart.
const OUTCOME_COLORS = {
  home: '#c28a2e',
  draw: '#b3aca1',
  away: '#2f86b3',
} as const

function formatAverage(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/40 px-2 py-2.5 text-center">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function Heading({ children }: { children: string }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
      {children}
    </h3>
  )
}

export function FixtureStats({ fixture }: { fixture: AdminFixture }) {
  const { bets } = fixture
  const stats = summarizePredictions(bets)
  const hasResult = fixture.homeScore !== null && fixture.awayScore !== null

  if (stats.total === 0) {
    return (
      <p className="rounded-xl border border-line/40 px-4 py-3 text-sm text-ink-soft">
        Aucun pronostic sur cette rencontre pour l’instant.
      </p>
    )
  }

  const outcomeRows = [
    { key: 'home', label: `Victoire ${fixture.homeTeamName}`, count: stats.outcomes.home },
    { key: 'draw', label: 'Match nul', count: stats.outcomes.draw },
    { key: 'away', label: `Victoire ${fixture.awayTeamName}`, count: stats.outcomes.away },
  ] as const
  const shares = percentages(outcomeRows.map((row) => row.count))

  const topCount = stats.topScores[0]?.count ?? 1
  const isResult = (homeScore: number, awayScore: number) =>
    homeScore === fixture.homeScore && awayScore === fixture.awayScore

  // Once scored, the best predictions lead; before that, alphabetical is the
  // only order that doesn't imply a ranking.
  const sortedBets = [...bets].sort(
    (a, b) =>
      (hasResult ? (b.score?.points ?? 0) - (a.score?.points ?? 0) : 0) ||
      a.userName.localeCompare(b.userName, 'fr'),
  )

  return (
    <div className="space-y-6">
      {fixture.status === 'upcoming' && (
        <p className="rounded-xl border border-pending/40 bg-pending/10 px-3 py-2.5 text-xs leading-relaxed text-ink">
          Les pronostics sont encore ouverts : ces chiffres peuvent changer
          jusqu’à la clôture.
        </p>
      )}

      <dl className="grid grid-cols-3 gap-2">
        <Tile label="Pronostics" value={String(stats.total)} />
        <Tile
          label="Score moyen"
          value={
            stats.average
              ? `${formatAverage(stats.average.homeScore)}-${formatAverage(stats.average.awayScore)}`
              : '—'
          }
        />
        {hasResult ? (
          <Tile label="Points" value={String(stats.pointsAwarded)} />
        ) : (
          <Tile
            label="Favori"
            value={
              stats.topScores[0]
                ? formatScore(stats.topScores[0].homeScore, stats.topScores[0].awayScore)
                : '—'
            }
          />
        )}
      </dl>

      <section>
        <Heading>Tendance</Heading>
        <div
          className="flex h-3 gap-0.5 overflow-hidden rounded"
          role="img"
          aria-label={outcomeRows
            .map((row, index) => `${row.label} : ${shares[index]} %`)
            .join(', ')}
        >
          {outcomeRows.map(
            (row, index) =>
              row.count > 0 && (
                <div
                  key={row.key}
                  title={`${row.label} — ${row.count} (${shares[index]} %)`}
                  className="h-full"
                  style={{
                    width: `${(row.count / stats.total) * 100}%`,
                    backgroundColor: OUTCOME_COLORS[row.key],
                  }}
                />
              ),
          )}
        </div>
        <ul className="mt-3 space-y-1.5">
          {outcomeRows.map((row, index) => (
            <li key={row.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: OUTCOME_COLORS[row.key] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{row.label}</span>
              <span className="shrink-0 tabular-nums text-ink-soft">{row.count}</span>
              <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-ink">
                {shares[index]} %
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Heading>Scores les plus joués</Heading>
        <ul className="space-y-1.5">
          {stats.topScores.map((entry) => {
            const matchesResult = hasResult && isResult(entry.homeScore, entry.awayScore)

            return (
              <li
                key={`${entry.homeScore}-${entry.awayScore}`}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-10 shrink-0 font-semibold tabular-nums text-ink">
                  {formatScore(entry.homeScore, entry.awayScore)}
                </span>
                <span className="h-2 min-w-0 flex-1">
                  <span
                    className="block h-full rounded-r bg-court-dark"
                    style={{ width: `${(entry.count / topCount) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right tabular-nums text-ink-soft">
                  {entry.count}
                </span>
                {matchesResult && (
                  <span className="shrink-0 rounded-full bg-win/15 px-2 py-0.5 text-[11px] font-semibold text-win-dark">
                    Résultat
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {hasResult && (
        <section>
          <Heading>Bilan</Heading>
          <dl className="grid grid-cols-3 gap-2">
            <Tile label={explainRule(ScoringRule.ExactScore)} value={String(stats.rules.exact)} />
            <Tile
              label={explainRule(ScoringRule.CorrectOutcome)}
              value={String(stats.rules.outcome)}
            />
            <Tile label="Manqués" value={String(stats.rules.wrong)} />
          </dl>
        </section>
      )}

      <section>
        <Heading>Pronostics des membres</Heading>
        <ul className="divide-y divide-line/30 rounded-xl border border-line/40">
          {sortedBets.map((bet) => (
            <li key={bet.userId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-ink">{bet.userName}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">
                {formatScore(bet.homeScore, bet.awayScore)}
              </span>
              {bet.score && (
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-soft">
                  {formatPoints(bet.score.points)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
