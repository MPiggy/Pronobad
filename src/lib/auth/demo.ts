/**
 * MVP demo mode: name-only login, no Supabase, no e-mail.
 *
 * When `DEMO_MODE=true`, the login page asks for a display name instead of an
 * e-mail address. The name lives in a cookie that stands in for the session;
 * a single throwaway `User` row (`demo@pronobad.local`) backs it so everything
 * that joins on `User` — predictions, scores, leaderboard — keeps working.
 *
 * Kept import-free of Prisma so the proxy (edge runtime) can use it too.
 * Remove the env flag to get real magic-link auth back untouched.
 */

export const DEMO_COOKIE = 'pronobad-demo-name'

/** Fixed identity for the demo row — `authId`/`email` are unique columns. */
export const DEMO_AUTH_ID = 'demo'
export const DEMO_EMAIL = 'demo@pronobad.local'

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}
