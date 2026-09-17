import { cache } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { DEFAULT_MAX_SCORE } from '@/lib/predictions/score-field'

/**
 * Competition-wide settings.
 *
 * Read on every screen that shows or accepts a score, so it gets the same
 * treatment as `getCurrentSeason`: `cache()` for one query per render pass,
 * `use cache` for one query per revalidation window across requests.
 */

/** The single settings row. There is deliberately only ever one. */
export const SETTINGS_ID = 'singleton'

/** Tag covering the settings row — busted whenever an admin saves it. */
export const SETTINGS_TAG = 'app-settings'

/**
 * The highest score either side can be given.
 *
 * Falls back to `DEFAULT_MAX_SCORE` when no row has been saved: a database
 * that predates this setting should behave like a fresh one, not refuse every
 * prediction.
 */
export const getMaxScore = cache(async (): Promise<number> => {
  'use cache'
  cacheLife('hours')
  cacheTag(SETTINGS_TAG)

  const settings = await db.appSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { maxScore: true },
  })

  return settings?.maxScore ?? DEFAULT_MAX_SCORE
})
