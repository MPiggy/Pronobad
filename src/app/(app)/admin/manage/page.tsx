import type { Metadata } from 'next'
import Link from 'next/link'
import { forbidden } from 'next/navigation'
import { getActor } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import { getMaxScore } from '@/lib/settings/queries'
import { teamDisplaySelect } from '@/lib/teams/logo'
import { Suspense, type ReactNode } from 'react'
import { EmptyState, PageShell, SectionHeading } from '@/components/page-shell'
import {
  NewSeasonButton,
  NewTeamButton,
  SettingsForm,
  TeamCard,
} from './manage-forms'

export const metadata: Metadata = {
  title: 'Réglages — BetClichy',
}

/** Card container in the revamped visual style, local to this page. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-sheet p-4">{children}</div>
  )
}

/**
 * Superadmin settings: the competition format, the season, its teams.
 *
 * Fixtures are not here — they live on the admin page with their results,
 * where the season's calendar is filled in and kept up to date.
 *
 * The superadmin check reads the session cookie, so the whole page is
 * runtime-bound — Suspense is what lets the route still prerender a shell.
 */
export default function ManagePage() {
  return (
    <Suspense>
      <ManageContent />
    </Suspense>
  )
}

async function ManageContent() {
  const actor = await getActor()

  if (!actor.isSuperadmin) forbidden()

  const [season, maxScore] = await Promise.all([
    getCurrentSeason(),
    getMaxScore(),
  ])

  const teams = season
    ? await db.team.findMany({
        where: { seasonId: season.id },
        select: { ...teamDisplaySelect, division: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <PageShell
      title="Réglages"
      subtitle={
        season
          ? `Format, saison et équipes · ${season.name}`
          : 'Commencez par créer une saison.'
      }
      action={
        <Link
          href="/admin"
          className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-line bg-sheet px-3 text-xs font-semibold text-court-dark transition-colors active:bg-shuttle/5"
        >
          Rencontres
        </Link>
      }
    >
      <div className="space-y-8">
        <section>
          <SectionHeading aside={`${maxScore} match${maxScore > 1 ? 's' : ''}`}>
            Format
          </SectionHeading>
          <Card>
            <SettingsForm maxScore={maxScore} />
          </Card>
        </section>

        <section>
          <SectionHeading>Saison</SectionHeading>
          <div className="space-y-2.5">
            {season && (
              <Card>
                <p className="text-xs font-medium text-ink-soft">En cours</p>
                <p className="mt-0.5 font-medium text-ink">{season.name}</p>
              </Card>
            )}
            <NewSeasonButton currentSeasonName={season?.name} />
          </div>
        </section>

        <section>
          <SectionHeading aside={teams.length > 0 ? teams.length : undefined}>
            Équipes
          </SectionHeading>

          {!season ? (
            <EmptyState
              icon="🏢"
              title="Aucune saison"
              body="Créez d’abord une saison : chaque équipe y appartient."
            />
          ) : (
            <div className="space-y-2.5">
              {teams.length > 0 && (
                <ul className="space-y-2.5">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </ul>
              )}

              <NewTeamButton />
            </div>
          )}
        </section>
      </div>
    </PageShell>
  )
}
