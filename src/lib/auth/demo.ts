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

/**
 * Demo mode is a development affordance, never a production one: it turns any
 * typed name into a superadmin session with no credential at all. Gating it on
 * `NODE_ENV` means a stray `DEMO_MODE=true` in a deploy's environment cannot
 * open the real app up — it is one env var away otherwise.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production'
}

/**
 * The display name held in the demo cookie.
 *
 * The cookie is attacker-supplied, so a malformed percent-escape like `%` must
 * not throw: an uncaught `URIError` here would turn every request into a 500
 * until the cookie is cleared by hand. Falls back to the raw value.
 */
export function decodeDemoName(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
