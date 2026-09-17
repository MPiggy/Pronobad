import { z } from 'zod'

/**
 * The validation shared by every place a fixture score is typed in — a member's
 * prediction and an admin's official result.
 *
 * Defined once because the two must agree: a rule that let an admin enter a
 * result no member could ever have predicted would make that fixture
 * unwinnable, and the mismatch would only show up in production.
 *
 * An interclub fixture is played over a fixed number of individual rubbers, and
 * every rubber produces exactly one winner — there are no draws inside a
 * rubber. So the rubber count is *both* bounds at once: neither side can exceed
 * it, and the two scores must add up to it exactly. Six rubbers means 6-0, 5-1,
 * 4-2, 3-3, 2-4, 1-5 or 0-6; 5-2 is not a low-scoring fixture, it is an
 * impossible one.
 *
 * How many rubbers are played differs by format, so the count is a setting: the
 * competition default lives in `AppSettings.maxScore`, and a fixture overrides
 * it with `Match.maxScore`. Nothing here reads either — callers resolve the
 * value and pass it in, which keeps this module pure and testable.
 */

/**
 * The rubber count used when neither the fixture nor the competition setting
 * says otherwise. 8 — the standard French interclub fixture.
 */
export const DEFAULT_MAX_SCORE = 8

/**
 * Bounds on the setting itself.
 *
 * A fixture of 0 rubbers would have no valid score at all, and an unbounded one
 * would let a typo turn the score inputs into free-text fields.
 */
export const MIN_MAX_SCORE = 1
export const MAX_MAX_SCORE = 50

/**
 * The rubber count in force for one fixture: its own override, else the
 * competition default.
 */
export function resolveMaxScore(
  matchMaxScore: number | null | undefined,
  defaultMaxScore: number,
): number {
  return matchMaxScore ?? defaultMaxScore
}

/** One side's score, for a fixture played over `maxScore` rubbers. */
export function scoreFieldFor(maxScore: number) {
  return z.coerce
    .number({ message: 'Indiquez un score.' })
    .int({ message: 'Le score doit être un nombre entier.' })
    .min(0, { message: 'Un score ne peut pas être négatif.' })
    .max(maxScore, { message: `Un score ne peut pas dépasser ${maxScore}.` })
}

/** Whether a scoreline is one the fixture could actually have produced. */
export function isPossibleScore(
  homeScore: number,
  awayScore: number,
  maxScore: number,
): boolean {
  return homeScore + awayScore === maxScore
}

/** Every scoreline a fixture of `maxScore` rubbers can end on, home side first. */
export function possibleScores(
  maxScore: number,
): { homeScore: number; awayScore: number }[] {
  return Array.from({ length: maxScore + 1 }, (_, homeScore) => ({
    homeScore,
    awayScore: maxScore - homeScore,
  }))
}

/** The message shown when the two scores do not add up to the rubber count. */
export function explainImpossibleScore(maxScore: number): string {
  const away = Math.floor(maxScore / 2)

  return `Les deux scores doivent totaliser ${maxScore} rencontre${
    maxScore > 1 ? 's' : ''
  } jouée${maxScore > 1 ? 's' : ''} (ex. ${maxScore - away}-${away}).`
}

/**
 * Adds the sum rule to a schema carrying `homeScore` and `awayScore`.
 *
 * A refinement rather than something folded into the fields themselves,
 * because it is a rule *about the pair*: neither field can judge it alone.
 * Each side being in range proves nothing on its own — 2-2 passes that check
 * and is still not a possible result of a 6-rubber fixture.
 */
export function withPossibleScore<
  T extends z.ZodType<{ homeScore: number; awayScore: number }>,
>(schema: T, maxScore: number) {
  return schema.refine(
    ({ homeScore, awayScore }) =>
      isPossibleScore(homeScore, awayScore, maxScore),
    { message: explainImpossibleScore(maxScore) },
  )
}

/** Validation for the setting that produces the rubber count. */
export const maxScoreField = z.coerce
  .number({ message: 'Indiquez un nombre de rencontres.' })
  .int({ message: 'Le nombre de rencontres doit être un entier.' })
  .min(MIN_MAX_SCORE, {
    message: `Une rencontre se joue en ${MIN_MAX_SCORE} match minimum.`,
  })
  .max(MAX_MAX_SCORE, {
    message: `Le nombre de matchs ne peut pas dépasser ${MAX_MAX_SCORE}.`,
  })

/**
 * The per-fixture override: the same rule, or empty to inherit the competition
 * default. An empty input posts `""`, which has to mean "inherit" rather than
 * "zero rubbers" — `z.coerce.number()` would read it as 0 and reject it.
 */
export const optionalMaxScoreField = z
  .union([z.literal(''), maxScoreField])
  .transform((value) => (value === '' ? null : value))
