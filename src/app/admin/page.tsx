import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { getActor } from '@/lib/auth/guards'
import { isAnyClubAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { isLocked } from '@/lib/predictions/locking'
import {
  formatMatchDateTime,
  formatScore,
  toParisDateTimeLocal,
} from '@/lib/format'
import { EmptyState, PageShell } from '@/components/page-shell'
import { Sheet, StatusLabel } from '@/components/sheet'
import { MatchAdminForm } from './match-admin-form'

export const metadata: Metadata = {
  title: 'Administration — Pronobad',
}

/**
 * Result entry for club admins.
 *
 * Lists only fixtures the caller may manage — their own clubs' — so the page
 * never offers an action that the server action would then refuse. The actions
 * re-check the same rule regardless; this is presentation, not enforcement.
 */
export default async function AdminPage() {
  await requireUser()
  const actor = await getActor()

  // Members have no business here. `forbidden()` renders a 403 rather than
  // redirecting, so the failure is visible instead of looking like a bad link.
  if (!isAnyClubAdmin(actor)) forbidden()

  const season = await getCurrentSeason()

  if (!season) {
    return (
      <PageShell title="Administration">
        <EmptyState
          title="Aucune saison ouverte"
          body="Créez une saison pour pouvoir saisir des résultats."
        />
      </PageShell>
    )
  }

  const matches = await db.match.findMany({
    where: {
      seasonId: season.id,
      // Superadmins manage every fixture; club admins only those involving a
      // club they administer, on either side.
      ...(actor.isSuperadmin
        ? {}
        : {
            OR: [
              { homeTeam: { clubId: { in: [...actor.adminClubIds] } } },
              { awayTeam: { clubId: { in: [...actor.adminClubIds] } } },
            ],
          }),
    },
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
      subtitle={
        actor.isSuperadmin
          ? `Toutes les rencontres · ${season.name}`
          : `Vos clubs · ${season.name}`
      }
    >
      {awaitingResult > 0 && (
        <p className="mb-4 rounded-lg border border-line bg-sheet px-4 py-3 text-sm text-ink">
          <span className="num font-semibold">{awaitingResult}</span> rencontre
          {awaitingResult > 1 ? 's' : ''} en attente de résultat.
        </p>
      )}

      {matches.length === 0 ? (
        <EmptyState
          title="Aucune rencontre"
          body="Aucune rencontre à administrer pour cette saison."
        />
      ) : (
        <ul className="space-y-2.5">
          {matches.map((match) => {
            const hasResult =
              match.homeScore !== null && match.awayScore !== null
            const awaiting = !hasResult && isLocked(match, now)

            return (
              <li key={match.id}>
                <Sheet marker={hasResult ? 'win' : awaiting ? 'action' : 'none'}>
                  <div className="py-3.5 pl-4 pr-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <time
                        dateTime={match.playedAt.toISOString()}
                        className="text-xs font-medium text-ink-soft"
                      >
                        J{match.round} · {formatMatchDateTime(match.playedAt)}
                      </time>

                      <StatusLabel>
                        {hasResult
                          ? 'Résultat saisi'
                          : awaiting
                            ? 'Résultat attendu'
                            : 'À venir'}
                      </StatusLabel>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium text-ink">
                        {match.homeTeam.name}
                        <span className="mx-1.5 text-ink-faint">contre</span>
                        {match.awayTeam.name}
                      </p>

                      {hasResult && (
                        <span className="num shrink-0 text-lg font-semibold text-ink">
                          {formatScore(match.homeScore!, match.awayScore!)}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-ink-faint">
                      <span className="num">{match._count.predictions}</span>{' '}
                      pronostic{match._count.predictions > 1 ? 's' : ''}
                    </p>

                    <MatchAdminForm
                      matchId={match.id}
                      homeTeamName={match.homeTeam.name}
                      awayTeamName={match.awayTeam.name}
                      homeScore={match.homeScore}
                      awayScore={match.awayScore}
                      locksAtLocal={toParisDateTimeLocal(match.locksAt)}
                    />
                  </div>
                </Sheet>
              </li>
            )
          })}
        </ul>
      )}
    </PageShell>
  )
}
