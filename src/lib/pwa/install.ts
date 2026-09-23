/**
 * Rules behind the "add to home screen" prompt, kept out of the component so
 * the timing and platform decisions are testable without a DOM.
 */

/** Where the dismissal timestamp lives in `localStorage`. */
export const INSTALL_DISMISSED_KEY = 'betclichy:install-dismissed-at'

/**
 * A dismissed banner comes back after a month rather than never: members
 * routinely decline on their first visit and want the icon on their home
 * screen once the season is actually under way.
 */
export const INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

/** Whether a past dismissal still hides the banner at `now`. */
export function isInstallSnoozed(
  dismissedAt: number | null,
  now: number,
): boolean {
  if (dismissedAt === null || !Number.isFinite(dismissedAt)) return false

  // A timestamp in the future means a clock that moved, or a hand-edited
  // value — either way it would otherwise snooze the banner for ever.
  if (dismissedAt > now) return false

  return now - dismissedAt < INSTALL_SNOOZE_MS
}

/**
 * iOS has no install API: every browser there is WebKit, and the only way in
 * is the share sheet. The UI has to say so rather than offer a button that
 * would do nothing.
 *
 * iPadOS 13+ reports a desktop Safari user agent, which is why touch points
 * are part of the test — a real Mac reports 0.
 */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPod|iPad/.test(userAgent)) return true

  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}
