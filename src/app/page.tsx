import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function Home() {
  // A signed-in member has no use for the pitch — send them to the fixtures,
  // or to onboarding if they never picked a club.
  const user = await getCurrentUser()

  if (user) redirect(user.clubId ? '/fixtures' : '/onboarding')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(3rem+var(--safe-top))]">
      <header className="mb-12">
        <p className="eyebrow mb-3">Interclubs · Badminton</p>
        {/*
         * The hero is the thing the app is about: a scoreline. Set at display
         * size in the same tabular figures used throughout, so the landing page
         * states the product's whole premise without a paragraph of copy.
         */}
        <p
          className="num mb-5 text-6xl font-semibold leading-none tracking-tight text-ink"
          aria-hidden
        >
          5<span className="mx-2 font-normal text-ink-faint">–</span>3
        </p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink">
          Pronostiquez les rencontres de votre club.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Annoncez le score avant le coup d’envoi, marquez des points, suivez le
          classement de la saison.
        </p>
      </header>

      <section aria-labelledby="how" className="mb-10">
        <h2 id="how" className="eyebrow mb-4">
          Le barème
        </h2>

        {/*
         * The scoring scale is the rule members most need to understand, and it
         * is genuinely tabular — two rules, two values. A table says that more
         * plainly than three numbered steps would.
         */}
        <dl className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line bg-sheet">
          {[
            {
              points: '3',
              rule: 'Score exact',
              detail: 'Vous annoncez 5–3, la rencontre finit 5–3.',
            },
            {
              points: '1',
              rule: 'Bon vainqueur',
              detail: 'Le bon gagnant, mais pas le bon score.',
            },
            {
              points: '0',
              rule: 'Pronostic manqué',
              detail: 'L’autre équipe l’emporte.',
            },
          ].map((row) => (
            <div key={row.rule} className="flex items-baseline gap-4 px-4 py-3.5">
              <dt className="num w-6 shrink-0 text-2xl font-semibold text-ink">
                {row.points}
              </dt>
              <dd className="min-w-0">
                <p className="text-sm font-medium text-ink">{row.rule}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                  {row.detail}
                </p>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 px-1 text-xs text-ink-faint">
          Le score exact remplace le point de bon vainqueur, il ne s’y ajoute pas.
        </p>
      </section>

      <div className="mt-auto pb-10">
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-md bg-court px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-opacity active:opacity-90"
        >
          Se connecter
        </Link>
        <p className="mt-3 text-center text-xs text-ink-faint">
          Connexion par lien e-mail, sans mot de passe.
        </p>
      </div>
    </main>
  )
}
