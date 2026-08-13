import { cache } from 'react'
import { db } from '@/lib/db'

/**
 * The season everything is scoped to.
 *
 * Fixtures, predictions and leaderboards are all per-season (PLAN.md), so
 * nearly every page starts by asking this question. `cache()` keeps it to one
 * query per render pass.
 *
 * Falls back to the most recently started season when no row is flagged
 * `isCurrent`: a fresh database or a missed season rollover should still show
 * fixtures rather than an empty app that looks broken.
 */
export const getCurrentSeason = cache(async () => {
  const flagged = await db.season.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  })

  if (flagged) return flagged

  return await db.season.findFirst({
    orderBy: { startsAt: 'desc' },
    select: { id: true, name: true },
  })
})
