import { lockState, type LockableMatch } from './locking'

/**
 * What the fixtures tab pulls out of the season's fixture list for its
 * summary cards.
 *
 * Pure functions over a list the page already fetched, with the caller's `now`
 * passed in so every card on the screen agrees on which fixtures are open.
 */

type HomeMatch = LockableMatch & {
  playedAt: Date
  prediction: unknown
}

/** How far ahead the "closing soon" banner looks. */
export const CLOSING_SOON_WINDOW_MS = 48 * 60 * 60 * 1000

/** The most recently played fixture that has an official result. */
export function pickLastResult<T extends HomeMatch>(matches: T[]): T | null {
  return (
    [...matches]
      .filter((match) => match.resultEnteredAt)
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())[0] ?? null
  )
}

/**
 * Open fixtures the member hasn't predicted whose predictions close within
 * `windowMs`, and how long until the first of them closes.
 */
export function unpredictedClosingSoon(
  matches: HomeMatch[],
  now: Date,
  windowMs: number = CLOSING_SOON_WINDOW_MS,
): { count: number; msUntilFirst: number } | null {
  const remaining = matches.flatMap((match) => {
    if (match.prediction) return []

    const state = lockState(match, now)

    return !state.locked && state.msRemaining <= windowMs ? [state.msRemaining] : []
  })

  if (remaining.length === 0) return null

  return { count: remaining.length, msUntilFirst: Math.min(...remaining) }
}
