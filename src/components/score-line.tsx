/**
 * The scoreline, set as the typographic centrepiece.
 *
 * Every screen in this app resolves to two integers, so the numerals carry the
 * weight that a display typeface would carry elsewhere. Set in tabular figures
 * with the separator held at a fixed width, so a column of scorelines aligns
 * on the dash down the whole list.
 */

export function ScoreLine({
  home,
  away,
  size = 'md',
  tone = 'ink',
}: {
  home: number
  away: number
  size?: 'sm' | 'md' | 'lg'
  tone?: 'ink' | 'soft'
}) {
  const sizes = {
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-4xl',
  } as const

  return (
    <span
      className={`num inline-flex items-baseline font-semibold ${sizes[size]} ${
        tone === 'soft' ? 'text-ink-soft' : 'text-ink'
      }`}
    >
      <span className="min-w-[1.25ch] text-right">{home}</span>
      <span
        aria-hidden
        className="mx-1.5 font-normal text-ink-faint"
      >
        –
      </span>
      <span className="min-w-[1.25ch]">{away}</span>
    </span>
  )
}

/**
 * Predicted and actual scorelines side by side under shared labels.
 *
 * The comparison is the whole point of the app — "I said 6–2, it finished
 * 5–3" — so the two are set in one aligned grid rather than in separate rows
 * a reader has to mentally join.
 */
export function ScoreComparison({
  prediction,
  result,
}: {
  prediction: { home: number; away: number } | null
  result: { home: number; away: number } | null
}) {
  return (
    <dl className="flex items-end gap-6">
      <div>
        <dt className="eyebrow mb-1">Pronostic</dt>
        <dd>
          {prediction ? (
            <ScoreLine home={prediction.home} away={prediction.away} />
          ) : (
            <span className="num text-2xl font-semibold text-ink-faint">—</span>
          )}
        </dd>
      </div>

      <div>
        <dt className="eyebrow mb-1">Résultat</dt>
        <dd>
          {result ? (
            <ScoreLine home={result.home} away={result.away} />
          ) : (
            <span className="num text-2xl font-semibold text-ink-faint">—</span>
          )}
        </dd>
      </div>
    </dl>
  )
}
