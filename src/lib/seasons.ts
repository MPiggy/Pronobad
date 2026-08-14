import { cache } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'

/** Tag covering "which season is current" — busted whenever that changes. */
export const CURRENT_SEASON_TAG = 'season-current'

/**
 * The season everything is scoped to.
 *
 * Fixtures, predictions and leaderboards are all per-season (PLAN.md), so
 * nearly every page starts by asking this question. `cache()` keeps it to one
 * query per render pass; `use cache` keeps it to one query per revalidation
 * window across requests, since this is the same read on nearly every page.
 *
 * Falls back to the most recently started season when no row is flagged
 * `isCurrent`: a fresh database or a missed season rollover should still show
 * fixtures rather than an empty app that looks broken.
 */
export const getCurrentSeason = cache(async () => {
  'use cache'
  cacheLife('hours')
  cacheTag(CURRENT_SEASON_TAG)

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
