import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getCurrentSeason } from '@/lib/seasons'
import { getLeaderboard } from '@/lib/leaderboard/queries'
import { EmptyState, PageShell } from '@/components/page-shell'
import { RulesButton } from './rules-button'

export const metadata: Metadata = {
  title: 'Classement — BetClichy',
}

/** Medals for the top three; everyone else gets their number. */
const MEDALS = ['🥇', '🥈', '🥉'] as const

/**
 * The season's leaderboard is the same for every viewer and comes entirely
 * from cached queries — only "which row is me" needs the caller's identity.
 * That single runtime read is isolated to `MyRow` below so the rest of the
 * list can still prerender as a static shell instead of the whole page
 * waiting on the session cookie.
 */
export default async function LeaderboardPage() {
  const season = await getCurrentSeason()

  if (!season) {
    return (
      <PageShell title="Classement">
        <EmptyState
          icon="🏆"
          title="Aucune saison ouverte"
          body="Le classement apparaîtra dès qu’une saison sera en cours."
        />
      </PageShell>
    )
  }

  const rows = await getLeaderboard({ seasonId: season.id })

  return (
    <PageShell title="Classement" subtitle={season.name} action={<RulesButton />}>
      {rows.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Classement vide"
          body="Les points apparaîtront ici dès qu’une rencontre aura été jouée et son résultat saisi."
        />
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => {
            const medal = MEDALS[row.rank - 1]

            return (
              <Suspense
                key={row.userId}
                fallback={<Row row={row} medal={medal} isMe={false} />}
              >
                <MyRow row={row} medal={medal} />
              </Suspense>
            )
          })}
        </ol>
      )}
    </PageShell>
  )
}

type Row = Awaited<ReturnType<typeof getLeaderboard>>[number]

/** Resolves the caller's identity to know whether this row is theirs. */
async function MyRow({ row, medal }: { row: Row; medal?: string }) {
  const user = await requireUser()

  return <Row row={row} medal={medal} isMe={row.userId === user.id} />
}

function Row({ row, medal, isMe }: { row: Row; medal?: string; isMe: boolean }) {
  return (
    <li
      aria-current={isMe ? 'true' : undefined}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        isMe ? 'border-court bg-court-light' : 'border-line bg-sheet'
      }`}
    >
      <span
        className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-ink-soft"
        aria-label={`Position ${row.rank}`}
      >
        {medal ?? row.rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">
          {row.name}
          {isMe && (
            <span className="ml-1.5 text-xs font-normal text-court-dark">
              (vous)
            </span>
          )}
        </p>
        <p className="text-xs text-ink-soft">
          {row.scoredCount} pronostic{row.scoredCount > 1 ? 's' : ''} ·{' '}
          {row.exactCount} score{row.exactCount > 1 ? 's' : ''} exact
          {row.exactCount > 1 ? 's' : ''}
        </p>
      </div>

      <span className="shrink-0 text-lg font-bold tabular-nums text-ink">
        {row.points}
        <span className="ml-1 text-xs font-normal text-ink-soft">pts</span>
      </span>
    </li>
  )
}
