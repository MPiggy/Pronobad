import type { Metadata } from 'next'
import Link from 'next/link'
import { forbidden } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getActor } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { isLocked } from '@/lib/predictions/locking'
import {
  formatMatchDateTime,
  formatScore,
  toParisDateTimeLocal,
} from '@/lib/format'
import { EmptyState, PageShell } from '@/components/page-shell'
import { MatchAdminForm } from './match-admin-form'

export const metadata: Metadata = {
  title: 'Administration — BetClichy',
}

/**
 * Result entry for admins.
 *
 * The actions re-check the same rule regardless; this page's gate is
 * presentation, not enforcement.
 */
export default async function AdminPage() {
  await requireUser()
  const actor = await getActor()

  // Members have no business here. `forbidden()` renders a 403 rather than
  // redirecting, so the failure is visible instead of looking like a bad link.
  if (!actor.isSuperadmin) forbidden()

  const season = await getCurrentSeason()

  // Superadmins manage the structure itself — seasons, teams, fixtures — from
  // a dedicated page.
  const manageLink = (
    <Link
      href="/admin/manage"
      className="shrink-0 rounded-md border border-line bg-sheet px-3 py-2 text-xs font-semibold text-court-dark transition-colors active:bg-shuttle"
    >
      Structure
    </Link>
  )

  if (!season) {
    return (
      <PageShell title="Administration" action={manageLink}>
        <EmptyState
          icon="⚙️"
          title="Aucune saison ouverte"
          body="Créez une saison pour pouvoir saisir des résultats."
          action={
            <Link
              href="/admin/manage"
              className="inline-block rounded-md bg-court px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Créer une saison
            </Link>
          }
        />
      </PageShell>
    )
  }

  const matches = await db.match.findMany({
    where: { seasonId: season.id },
    select: {
      id: true,
      playedAt: true,
      locksAt: true,
      round: true,
      homeScore: true,
      awayScore: true,
      resultEnteredAt: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      _count: { select: { predictions: true } },
    },
    orderBy: { playedAt: 'desc' },
  })

  const now = new Date()
  const awaitingResult = matches.filter(
    (match) => match.homeScore === null && isLocked(match, now),
  ).length

  return (
    <PageShell
      title="Administration"
      action={manageLink}
      subtitle={`Toutes les rencontres · ${season.name}`}
    >
      {awaitingResult > 0 && (
        <p className="mb-4 rounded-xl border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-shuttle-text">
          {awaitingResult} rencontre{awaitingResult > 1 ? 's' : ''} en attente de
          résultat.
        </p>
      )}

      {matches.length === 0 ? (
        <EmptyState
          icon="⚙️"
          title="Aucune rencontre"
          body="Aucune rencontre à administrer pour cette saison."
        />
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => {
            const hasResult =
              match.homeScore !== null && match.awayScore !== null

            return (
              <li
                key={match.id}
                className="rounded-2xl border border-line bg-sheet p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <time
                    dateTime={match.playedAt.toISOString()}
                    className="text-xs font-medium text-ink-soft"
                  >
                    J{match.round} · {formatMatchDateTime(match.playedAt)}
                  </time>

                  {hasResult ? (
                    <span className="shrink-0 rounded-full bg-win/15 px-2.5 py-1 text-xs font-semibold text-ink">
                      {formatScore(match.homeScore!, match.awayScore!)}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-pending/15 px-2.5 py-1 text-xs font-semibold text-ink">
                      {isLocked(match, now) ? 'Résultat attendu' : 'À venir'}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-medium text-ink">
                  {match.homeTeam.name} — {match.awayTeam.name}
                </p>

                <p className="mt-1 text-xs text-ink-soft">
                  {match._count.predictions} pronostic
                  {match._count.predictions > 1 ? 's' : ''}
                </p>

                <MatchAdminForm
                  matchId={match.id}
                  homeTeamName={match.homeTeam.name}
                  awayTeamName={match.awayTeam.name}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  locksAtLocal={toParisDateTimeLocal(match.locksAt)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
