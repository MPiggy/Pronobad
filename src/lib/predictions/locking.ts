/**
 * When a fixture stops accepting predictions.
 *
 * Pure functions over a timestamp — the caller supplies "now", which keeps the
 * rule testable without freezing clocks, and makes it explicit that the check
 * belongs on the server. A client-side check alone means anyone can POST a
 * prediction after the fixture starts (PLAN.md § Locking).
 */

export type LockState =
  | { locked: false; msRemaining: number }
  | { locked: true; reason: 'LOCKS_AT_PASSED' | 'RESULT_ENTERED' }

export type LockableMatch = {
  locksAt: Date
  /** Set once an admin enters the official result. */
  resultEnteredAt?: Date | null
}

/**
 * Whether a fixture still accepts predictions.
 *
 * A result already being in is treated as a lock in its own right: `locksAt`
 * is admin-editable, so moving it backwards must not reopen predictions on a
 * fixture whose result everyone can already see.
 */
export function lockState(match: LockableMatch, now: Date = new Date()): LockState {
  if (match.resultEnteredAt) {
    return { locked: true, reason: 'RESULT_ENTERED' }
  }

  const msRemaining = match.locksAt.getTime() - now.getTime()

  // Locking is inclusive of the boundary: at exactly locksAt, it is closed.
  if (msRemaining <= 0) {
    return { locked: true, reason: 'LOCKS_AT_PASSED' }
  }

  return { locked: false, msRemaining }
}

/** Convenience predicate for the common case. */
export function isLocked(match: LockableMatch, now: Date = new Date()): boolean {
  return lockState(match, now).locked
}

/** Message shown when a member's prediction is refused. */
export function explainLock(state: Extract<LockState, { locked: true }>): string {
  switch (state.reason) {
    case 'LOCKS_AT_PASSED':
      return 'Les pronostics sont fermés pour cette rencontre.'
    case 'RESULT_ENTERED':
      return 'Le résultat de cette rencontre est déjà enregistré.'
  }
}
