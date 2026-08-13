import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import { getActor } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import type { ReactNode } from 'react'
import { EmptyState, PageShell } from '@/components/page-shell'
import { MatchForm, SeasonForm, TeamForm } from './manage-forms'

export const metadata: Metadata = {
  title: 'Structure — Pronobad',
}

/** Card container in the revamped visual style, local to this page. */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white">{children}</div>
  )
}

function SectionHeading({
  aside,
  children,
}: {
  aside?: string
  children: ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{children}</h2>
      {aside && <p className="shrink-0 text-xs text-ink-soft">{aside}</p>}
    </div>
  )
}

/**
 * Superadmin structure page: seasons, teams, fixtures.
 */
export default async function ManagePage() {
  const actor = await getActor()

  if (!actor.isSuperadmin) forbidden()

  const season = await getCurrentSeason()

  const teams = season
    ? await db.team.findMany({
        where: { seasonId: season.id },
        select: { id: true, name: true, division: true },
        orderBy: { name: 'asc' },
      })
    : []

  const teamOptions = teams.map((team) => ({ id: team.id, name: team.name }))

  return (
    <PageShell
      title="Structure"
      subtitle={
        season
          ? `Équipes et rencontres · ${season.name}`
          : 'Commencez par créer une saison.'
      }
    >
      <div className="space-y-8">
        <section>
          <SectionHeading aside={season ? `En cours : ${season.name}` : undefined}>
            Saison
          </SectionHeading>
          <Card>
            <div className="p-4">
              <SeasonForm />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeading aside={teams.length > 0 ? `${teams.length}` : undefined}>
            Équipes
          </SectionHeading>

          {!season ? (
            <EmptyState
              icon="🏢"
              title="Aucune saison"
              body="Créez d’abord une saison : chaque équipe y appartient."
            />
          ) : (
            <>
              {teams.length > 0 && (
                <ul className="mb-2.5 space-y-2.5">
                  {teams.map((team) => (
                    <li key={team.id}>
                      <Card>
                        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                          <p className="min-w-0 truncate text-sm font-medium text-ink">
                            {team.name}
                          </p>
                          <p className="shrink-0 text-xs text-ink-soft">
                            {team.division}
                          </p>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}

              <Card>
                <div className="p-4">
                  <TeamForm />
                </div>
              </Card>
            </>
          )}
        </section>

        <section>
          <SectionHeading>Nouvelle rencontre</SectionHeading>

          {teams.length < 2 ? (
            <EmptyState
              icon="🏸"
              title="Pas assez d’équipes"
              body="Il faut au moins deux équipes dans la saison en cours pour créer une rencontre."
            />
          ) : (
            <Card>
              <div className="p-4">
                <MatchForm teams={teamOptions} />
              </div>
            </Card>
          )}
        </section>
      </div>
    </PageShell>
  )
}
