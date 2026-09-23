import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireOnboardedUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getMatchesForUser } from '@/lib/predictions/queries'
import { getLeaderboard } from '@/lib/leaderboard/queries'
import { getMaxScore } from '@/lib/settings/queries'
import { resolveMaxScore } from '@/lib/predictions/score-field'
import { formatRank } from '@/lib/format'
import { EmptyState, PageShell } from '@/components/page-shell'
import { Skeleton, SkeletonCards, SkeletonShell } from '@/components/skeleton'
import { InstallCard } from '@/components/install-prompt'
import { HistoryList } from './history-list'
import { NameEditButton } from './name-form'
import { ProfileMenu } from './profile-menu'

export const metadata: Metadata = {
  title: 'Profil — BetClichy',
}

/**
 * The member's own season: their standing, their totals, and every prediction
 * they have made with the points it earned.
 *
 * The history exists to answer "why do I have this many points" — so each row
 * is the same bet slip as the fixture list: the prediction, the actual result,
 * the rule that was applied and the points it earned, rather than just a number.
 *
 * `requireOnboardedUser` reads the session cookie, and every read below is
 * scoped to that user, so the whole page is runtime-bound — Suspense is what
 * lets the route still prerender a shell around it.
 */
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}

/** The season card, the history heading and filters, then the cards under it. */
function ProfileSkeleton() {
  return (
    <SkeletonShell>
      <div className="space-y-6">
        <Skeleton className="h-[150px] rounded-2xl" />

        <div>
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="mb-3 h-11 rounded-full" />
          <SkeletonCards count={4} className="h-[104px]" />
        </div>
      </div>
    </SkeletonShell>
  )
}

/** The pseudo as the page title, with its edit pencil beside it. */
function NameTitle({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate">{name}</span>
      <NameEditButton name={name} />
    </span>
  )
}

/**
 * Rank, points, exact scores and hit rate on one dark card — the same surface
 * as the next-match hero and the last-result card, so the season's numbers
 * read as part of the same set.
 *
 * A member who hasn't scored yet has no leaderboard row, so `rank` is null
 * rather than a made-up last place.
 */
function SeasonCard({
  rank,
  rankedCount,
  points,
  exactCount,
  hitRate,
}: {
  rank: number | null
  rankedCount: number
  points: number
  exactCount: number
  /** Share of scored predictions that earned points, or null before any is scored. */
  hitRate: number | null
}) {
  const stats = [
    { label: points > 1 ? 'points' : 'point', value: String(points) },
    {
      label: exactCount > 1 ? 'scores exacts' : 'score exact',
      value: String(exactCount),
    },
    {
      label: 'de réussite',
      // A narrow no-break space before "%", as French typesets it.
      value: hitRate === null ? '—' : `${Math.round(hitRate * 100)} %`,
    },
  ]

  return (
    <section
      aria-label="Votre saison"
      className="rounded-2xl border border-court/35 bg-[radial-gradient(120%_90%_at_100%_0%,rgb(242_193_104/0.14),transparent_60%),linear-gradient(180deg,rgb(235_239_249/0.07),rgb(235_239_249/0.03))] p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-shuttle-text-soft">
        Classement
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl leading-none font-black tracking-tight tabular-nums text-court">
          {rank === null ? '—' : formatRank(rank)}
        </span>
        <span className="text-sm text-shuttle-text-soft">
          {rank === null ? 'Pas encore classé' : `sur ${rankedCount}`}
        </span>
      </p>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-shuttle-text/10 border-t border-shuttle-text/10 pt-3 text-center">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex flex-col-reverse px-1">
            <dt className="text-[11px] leading-tight text-shuttle-text-soft">{label}</dt>
            <dd className="text-xl font-extrabold tabular-nums text-shuttle-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

async function ProfileContent() {
  const [user, season] = await Promise.all([
    requireOnboardedUser(),
    getCurrentSeason(),
  ])

  const header = {
    title: <NameTitle name={user.name} />,
    action: <ProfileMenu isAdmin={user.isSuperadmin} />,
  }

  if (!season) {
    return (
      // Renaming doesn't depend on a season existing, so the header — and its
      // pencil — stays the same on this branch too.
      <PageShell {...header}>
        <div className="space-y-6">
          <EmptyState
            icon="👤"
            title="Aucune saison ouverte"
            body="Votre historique apparaîtra dès qu’une saison sera en cours."
          />
          <InstallCard />
        </div>
      </PageShell>
    )
  }

  const [matches, leaderboard, maxScore] = await Promise.all([
    getMatchesForUser({ seasonId: season.id, userId: user.id }),
    getLeaderboard({ seasonId: season.id }),
    getMaxScore(),
  ])

  // Every fixture the member predicted, latest first — drawn with the same
  // cards as the fixture list, so a row opens the same modal.
  const history = matches.filter((match) => match.prediction).reverse()
  // One timestamp for the whole render, so no two cards disagree on lock.
  const now = new Date()

  const me = leaderboard.find((row) => row.userId === user.id)
  const scored = history.filter((match) => match.prediction?.score)
  const won = scored.filter((match) => (match.prediction?.score?.points ?? 0) > 0)

  return (
    <PageShell {...header} subtitle={season.name}>
      <div className="space-y-6">
        <SeasonCard
          rank={me?.rank ?? null}
          rankedCount={leaderboard.length}
          points={me?.points ?? 0}
          exactCount={me?.exactCount ?? 0}
          hitRate={scored.length === 0 ? null : won.length / scored.length}
        />

        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-3 text-sm font-semibold uppercase tracking-wide text-shuttle-text-soft"
          >
            Historique
          </h2>

          {history.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aucun pronostic"
              body="Vos pronostics apparaîtront ici. Rendez-vous dans l’onglet Rencontres pour commencer."
            />
          ) : (
            <HistoryList
              now={now}
              entries={history.map((match) => ({
                match,
                maxScore: resolveMaxScore(match.maxScore, maxScore),
              }))}
            />
          )}
        </section>

        {/* Renders nothing once the app is installed, or where it can't be. */}
        <InstallCard />
      </div>
    </PageShell>
  )
}
