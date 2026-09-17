import { z } from 'zod'
import { parseParisDateTimeLocal } from '@/lib/format'
import { optionalMaxScoreField } from '@/lib/predictions/score-field'

/**
 * The one form a fixture is created and edited with.
 *
 * Every field of a fixture — teams, round, date, prediction deadline, rubber
 * count — is posted together and saved together. Splitting them across
 * separate forms meant an admin rescheduling a postponed fixture had to save
 * the date, watch the deadline silently move, then find a second form to put
 * the deadline back. Here the deadline is a question asked next to the date.
 *
 * Pure: reads a `FormData`, returns typed values or the first message to show.
 * The server actions add what needs a database — do the teams exist, is the
 * admin allowed — on top of this.
 */

export const MIN_ROUND = 1
export const MAX_ROUND = 52

const schema = z.object({
  homeTeamId: z.string().min(1, { message: 'Choisissez l’équipe à domicile.' }),
  awayTeamId: z.string().min(1, { message: 'Choisissez l’équipe à l’extérieur.' }),
  round: z.coerce
    .number({ message: 'Indiquez la journée.' })
    .int({ message: 'La journée doit être un nombre entier.' })
    .min(MIN_ROUND, { message: `La journée commence à ${MIN_ROUND}.` })
    .max(MAX_ROUND, { message: 'Journée invalide.' }),
  // `datetime-local` posts "2026-11-15T18:00" with no zone; parsed against
  // Europe/Paris below rather than trusted to `new Date()`.
  playedAt: z.string().min(1, { message: 'Indiquez la date de la rencontre.' }),
  // A checkbox: posted as "on" when ticked, absent otherwise.
  locksAtKickoff: z.literal('on').nullable(),
  locksAt: z.string().nullable(),
  maxScore: optionalMaxScoreField,
})

export type FixtureFields = {
  homeTeamId: string
  awayTeamId: string
  round: number
  playedAt: Date
  locksAt: Date
  /** The fixture's own rubber count, or null to follow the competition default. */
  maxScore: number | null
}

export type ParsedFixture =
  | { ok: true; fixture: FixtureFields }
  | { ok: false; message: string }

export function parseFixtureFields(formData: FormData): ParsedFixture {
  const parsed = schema.safeParse({
    homeTeamId: formData.get('homeTeamId'),
    awayTeamId: formData.get('awayTeamId'),
    round: formData.get('round'),
    playedAt: formData.get('playedAt'),
    locksAtKickoff: formData.get('locksAtKickoff'),
    locksAt: formData.get('locksAt'),
    // Absent reads as empty — "follow the default" — rather than as null,
    // which the number coercion would turn into an invalid 0.
    maxScore: formData.get('maxScore') ?? '',
  })

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Rencontre invalide.',
    }
  }

  const { homeTeamId, awayTeamId, round, maxScore } = parsed.data

  if (homeTeamId === awayTeamId) {
    return { ok: false, message: 'Une équipe ne peut pas jouer contre elle-même.' }
  }

  const playedAt = parseParisDateTimeLocal(parsed.data.playedAt)

  if (!playedAt || Number.isNaN(playedAt.getTime())) {
    return { ok: false, message: 'Date de rencontre invalide.' }
  }

  // The deadline follows kickoff unless the admin explicitly untied it — the
  // PLAN.md default, and what a postponement almost always wants.
  let locksAt = playedAt

  if (parsed.data.locksAtKickoff !== 'on') {
    if (!parsed.data.locksAt) {
      return { ok: false, message: 'Indiquez la fermeture des pronostics.' }
    }

    const custom = parseParisDateTimeLocal(parsed.data.locksAt)

    if (!custom || Number.isNaN(custom.getTime())) {
      return { ok: false, message: 'Date de fermeture invalide.' }
    }

    locksAt = custom
  }

  return {
    ok: true,
    fixture: { homeTeamId, awayTeamId, round, playedAt, locksAt, maxScore },
  }
}
