/**
 * Date and score formatting for the UI.
 *
 * Every formatter is explicitly pinned to `fr-FR` and `Europe/Paris` rather
 * than left to the runtime locale. Server components format on the server, so
 * the ambient locale is Vercel's (UTC, en-US) — leaving it implicit would print
 * "10/4/2025" and shift evening fixtures to the previous day.
 */

const TIME_ZONE = 'Europe/Paris'
const LOCALE = 'fr-FR'

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})

const dayWithYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})

/** "sam. 4 oct." — the compact form used in fixture lists. */
export function formatMatchDay(date: Date): string {
  return dayFormatter.format(date)
}

/** "4 octobre 2025" — used where the year matters, like history. */
export function formatFullDate(date: Date): string {
  return dayWithYearFormatter.format(date)
}

/** "18:00" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

/** "sam. 4 oct. · 18:00" */
export function formatMatchDateTime(date: Date): string {
  return `${formatMatchDay(date)} · ${formatTime(date)}`
}

/**
 * How long until predictions close, in words.
 *
 * Deliberately coarse. A live countdown would need a client component and a
 * ticking timer on every card, and "dans 3 jours" tells a member what they
 * actually need to know: whether to predict now or later.
 */
export function formatTimeRemaining(msRemaining: number): string {
  const minutes = Math.floor(msRemaining / 60_000)

  if (minutes < 1) return 'ferme dans moins d’une minute'
  if (minutes < 60) return `ferme dans ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `ferme dans ${hours} h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ferme demain'

  return `ferme dans ${days} jours`
}

/**
 * A date as a Paris wall-clock `datetime-local` value ("2026-11-15T18:00").
 *
 * Prefills the admin deadline input. Formatting in UTC — what `toISOString()`
 * would give — shows an admin a different time from the one they set, and they
 * would "correct" it, shifting the real deadline by an hour or two.
 */
const localInputFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  dateStyle: 'short',
  timeStyle: 'short',
})

export function toParisDateTimeLocal(date: Date): string {
  // `sv-SE` yields "2026-11-15 18:00"; the input wants a T separator.
  return localInputFormatter.format(date).replace(' ', 'T')
}

/**
 * Parses a `datetime-local` value ("2026-11-15T18:00") as Paris wall-clock time.
 *
 * `datetime-local` posts no zone, and `new Date()` would read it in the
 * server's zone — UTC on Vercel. An admin typing 18:00 means 18:00 in the gym,
 * and getting this wrong shifts every deadline by an hour or two.
 */
export function parseParisDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null

  const [, year, month, day, hour, minute] = match.map(Number) as [
    unknown, number, number, number, number, number,
  ]

  // Start from the naive UTC reading, then subtract Paris's offset at that
  // moment — which is what turns the wall-clock time into a real instant
  // across both CET and CEST.
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  const offset = parisOffsetMs(new Date(naive))

  return new Date(naive - offset)
}

/** Paris's UTC offset, in milliseconds, at a given instant. */
function parisOffsetMs(at: Date): number {
  // `sv-SE` formats as "YYYY-MM-DD HH:mm:ss", which Date.parse reads back.
  const paris = new Date(
    `${new Intl.DateTimeFormat('sv-SE', {
      timeZone: TIME_ZONE,
      dateStyle: 'short',
      timeStyle: 'medium',
    })
      .format(at)
      .replace(' ', 'T')}Z`,
  )

  return paris.getTime() - at.getTime()
}

/** "5 - 3", with the non-breaking spaces that keep a score on one line. */
export function formatScore(homeScore: number, awayScore: number): string {
  return `${homeScore} - ${awayScore}`
}

/** "3 points" / "1 point" — French pluralisation of the scoring scale. */
export function formatPoints(points: number): string {
  return `${points} ${points > 1 ? 'points' : 'point'}`
}
