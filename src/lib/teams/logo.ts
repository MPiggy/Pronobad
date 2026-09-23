/**
 * Team logos as the screens see them: a URL, or nothing.
 *
 * Client-safe on purpose — the upload pipeline that needs `sharp` lives in
 * ./logo-image.ts, which must never reach a client bundle.
 */

/**
 * The Prisma `select` for a team as every screen shows it.
 *
 * Only the logo's `updatedAt` is read, never its bytes: the page needs a URL,
 * and the browser fetches the image itself from the route below.
 */
export const teamDisplaySelect = {
  id: true,
  name: true,
  logo: { select: { updatedAt: true } },
} as const

/** Just enough of a team to build its logo URL. */
export type TeamLogoRef = {
  id: string
  logo: { updatedAt: Date } | null
}

export type TeamDisplay = TeamLogoRef & { name: string }

/**
 * The largest file an admin may upload. Logos are small; a phone photo of a
 * crest is not, and it is shrunk to a few kilobytes anyway. Keep it below
 * `serverActions.bodySizeLimit` in next.config.ts, with room for the
 * multipart overhead and the form's other fields.
 */
export const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024

/** The file picker's `accept` — a hint to the browser; ./logo-image.ts is the check. */
export const LOGO_ACCEPT =
  'image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif'

const LOGO_FILE_SUFFIX = '.webp'

/**
 * Where a team's logo is served, or null when it has none.
 *
 * The path ends in `.webp` so the proxy's matcher skips it like any other
 * static image — no session refresh per logo. The `v` parameter changes with
 * every upload, which is what lets the route cache a response forever.
 */
export function teamLogoUrl(team: TeamLogoRef): string | null {
  if (!team.logo) return null

  return `/team-logos/${team.id}${LOGO_FILE_SUFFIX}?v=${team.logo.updatedAt.getTime()}`
}

/** Reads the team id back out of the route's `[file]` segment. */
export function teamIdFromLogoFile(file: string): string | null {
  if (!file.endsWith(LOGO_FILE_SUFFIX)) return null

  const teamId = file.slice(0, -LOGO_FILE_SUFFIX.length)

  return /^[a-z0-9]+$/i.test(teamId) ? teamId : null
}
