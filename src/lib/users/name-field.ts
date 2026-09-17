import { z } from 'zod'

/**
 * The pseudo a member is known by — chosen at onboarding, editable afterwards
 * from the profile.
 *
 * Defined once because the two must agree: a profile form that accepted a
 * pseudo onboarding would have rejected (or the reverse) would only surface
 * when a member hit whichever of the two was stricter.
 *
 * Trimmed before validation, so "  " is two characters of nothing rather than
 * a valid pseudo, and nobody can pad their way up the leaderboard's sort.
 */

export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 60

export const nameField = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, {
    message: `Indiquez un pseudo (${NAME_MIN_LENGTH} caractères minimum).`,
  })
  .max(NAME_MAX_LENGTH, {
    message: `Ce pseudo est trop long (${NAME_MAX_LENGTH} caractères maximum).`,
  })
