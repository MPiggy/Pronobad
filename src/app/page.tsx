import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import logo from '@/app/icon.png'

export default async function Home() {
  // A signed-in member has no use for the pitch — send them to the fixtures.
  const user = await getCurrentUser()

  if (user) redirect('/fixtures')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(2rem+var(--safe-top))]">
      <header className="mb-10">
        <Image src={logo} alt="" className="mb-6 h-12 w-12 object-contain" priority />

        <h1 className="text-3xl font-bold tracking-tight text-shuttle-text">Pronobad</h1>
        <p className="mt-2 text-base leading-relaxed text-shuttle-text-soft">
          Pronostiquez les rencontres interclubs de votre club et grimpez au
          classement de la saison.
        </p>
      </header>

      <section aria-labelledby="how" className="mb-10">
        <h2 id="how" className="mb-4 text-sm font-semibold uppercase tracking-wide text-shuttle-text-soft">
          Comment ça marche
        </h2>
        <ol className="space-y-4">
          {[
            {
              step: '1',
              title: 'Pronostiquez',
              body: 'Annoncez le score de la rencontre avant le coup d’envoi.',
            },
            {
              step: '2',
              title: 'Marquez des points',
              body: 'Bon vainqueur : 1 point. Score exact : 3 points.',
            },
            {
              step: '3',
              title: 'Grimpez au classement',
              body: 'Suivez votre place dans le classement de votre club.',
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-court-light text-sm font-semibold text-court-dark">
                {item.step}
              </span>
              <div>
                <h3 className="font-medium text-shuttle-text">{item.title}</h3>
                <p className="text-sm leading-relaxed text-shuttle-text-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-auto pb-8">
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-xl bg-court px-4 py-3 text-base font-semibold text-ink"
        >
          Se connecter
        </Link>
        <p className="mt-3 text-center text-xs text-shuttle-text-soft">
          Connexion par lien e-mail, sans mot de passe.
        </p>
      </div>
    </main>
  )
}
