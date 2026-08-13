import type { Metadata } from 'next'
import { forbidden } from 'next/navigation'
import { getActor } from '@/lib/auth/guards'
import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/seasons'
import type { ReactNode } from 'react'
import { EmptyState, PageShell } from '@/components/page-shell'
import {
  ClubForm,
  GrantAdminForm,
  MatchForm,
  RevokeAdminButton,
  SeasonForm,
  TeamForm,
} from './manage-forms'

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
 * Superadmin structure page: seasons, clubs, teams, fixtures, club admins.
 *
 * Superadmin-only as a page, even though team and fixture creation would also
 * be allowed to a club admin — the rest of the page (clubs, admin grants)
 * would be a wall of refusals for them. The actions re-check their own rules
 * regardless; this gate is presentation, not enforcement.
 */
export default async function ManagePage() {
  const actor = await getActor()

  if (!actor.isSuperadmin) forbidden()

  const season = await getCurrentSeason()

  const [clubs, teams, admins] = await Promise.all([
    db.club.findMany({
      select: {
        id: true,
        name: true,
        region: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    }),
    season
      ? db.team.findMany({
          where: { seasonId: season.id },
          select: {
            id: true,
            name: true,
            division: true,
            club: { select: { name: true } },
          },
          orderBy: [{ club: { name: 'asc' } }, { name: 'asc' }],
        })
      : Promise.resolve([]),
    db.clubAdmin.findMany({
      select: {
        userId: true,
        clubId: true,
        user: { select: { name: true, email: true } },
        club: { select: { name: true } },
      },
      orderBy: [{ club: { name: 'asc' } }, { grantedAt: 'asc' }],
    }),
  ])

  const clubOptions = clubs.map((club) => ({ id: club.id, name: club.name }))
  const teamOptions = teams.map((team) => ({
    id: team.id,
    name: team.name,
    clubName: team.club.name,
  }))

  return (
    <PageShell
      title="Structure"
      subtitle={
        season
          ? `Clubs, équipes et rencontres · ${season.name}`
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
          <SectionHeading aside={clubs.length > 0 ? `${clubs.length}` : undefined}>
            Clubs
          </SectionHeading>

          {clubs.length > 0 && (
            <ul className="mb-2.5 space-y-2.5">
              {clubs.map((club) => (
                <li key={club.id}>
                  <Card>
                    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {club.name}
                        </p>
                        {club.region && (
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {club.region}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-xs text-ink-soft">
                        <span className="num">{club._count.members}</span> membre
                        {club._count.members > 1 ? 's' : ''}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          <Card>
            <div className="p-4">
              <ClubForm />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeading aside={teams.length > 0 ? `${teams.length}` : undefined}>
            Équipes
          </SectionHeading>

          {clubs.length === 0 ? (
            <EmptyState
              icon="🏢"
              title="Aucun club"
              body="Créez d’abord un club : chaque équipe appartient à un club."
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
                  <TeamForm clubs={clubOptions} />
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

        <section>
          <SectionHeading
            aside={admins.length > 0 ? `${admins.length}` : undefined}
          >
            Administrateurs de club
          </SectionHeading>

          {admins.length > 0 && (
            <ul className="mb-2.5 space-y-2.5">
              {admins.map((admin) => (
                <li key={`${admin.userId}:${admin.clubId}`}>
                  <Card>
                    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {admin.user.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">
                          {admin.user.email} · {admin.club.name}
                        </p>
                      </div>
                      <RevokeAdminButton
                        userId={admin.userId}
                        clubId={admin.clubId}
                      />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {clubs.length === 0 ? (
            <EmptyState
              icon="🔑"
              title="Aucun club"
              body="Créez d’abord un club pour pouvoir nommer ses administrateurs."
            />
          ) : (
            <Card>
              <div className="p-4">
                <GrantAdminForm clubs={clubOptions} />
              </div>
            </Card>
          )}
        </section>
      </div>
    </PageShell>
  )
}
