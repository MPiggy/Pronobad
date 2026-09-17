import { z } from 'zod'

/**
 * The validation shared by every place a fixture score is typed in — a member's
 * prediction and an admin's official result.
 *
 * Defined once because the two must agree: a cap that let an admin enter a
 * result no member could ever have predicted would make that fixture
 * unwinnable, and the mismatch would only show up in production.
 *
 * An interclub fixture is played over a fixed number of rubbers, so scores are
 * small non-negative integers. How many rubbers differs between formats, so the
 * cap is an admin setting (`AppSettings.maxScore`) rather than a constant —
 * `scoreFieldFor` takes it as an argument so this module stays pure and
 * database-free, and callers load the current value before parsing.
 */

/**
 * The cap used when no setting has been saved yet.
 *
 * 8 — the rubber count of a standard French interclub fixture.
 */
export const DEFAULT_MAX_SCORE = 8

/**
 * Bounds on the setting itself.
 *
 * A cap of 0 would make every fixture a forced 0-0, and an unbounded one would
 * let a typo turn the score inputs into free-text fields.
 */
export const MIN_MAX_SCORE = 1
export const MAX_MAX_SCORE = 50

/** Score validation for a fixture whose cap is `maxScore`. */
export function scoreFieldFor(maxScore: number) {
  return z.coerce
    .number({ message: 'Indiquez un score.' })
    .int({ message: 'Le score doit être un nombre entier.' })
    .min(0, { message: 'Un score ne peut pas être négatif.' })
    .max(maxScore, { message: `Un score ne peut pas dépasser ${maxScore}.` })
}

/** Validation for the admin setting that produces the cap above. */
export const maxScoreField = z.coerce
  .number({ message: 'Indiquez un nombre de points.' })
  .int({ message: 'Le maximum doit être un nombre entier.' })
  .min(MIN_MAX_SCORE, {
    message: `Le maximum doit être d’au moins ${MIN_MAX_SCORE}.`,
  })
  .max(MAX_MAX_SCORE, {
    message: `Le maximum ne peut pas dépasser ${MAX_MAX_SCORE}.`,
  })
