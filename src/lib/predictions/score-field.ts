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
 * small non-negative integers. The cap is deliberately loose rather than pinned
 * to a division's exact rubber count: formats differ between divisions and a
 * wrong cap would reject legitimate entries.
 */
export const MAX_SCORE = 20

export const scoreField = z.coerce
  .number({ message: 'Indiquez un score.' })
  .int({ message: 'Le score doit être un nombre entier.' })
  .min(0, { message: 'Un score ne peut pas être négatif.' })
  .max(MAX_SCORE, { message: `Un score ne peut pas dépasser ${MAX_SCORE}.` })
