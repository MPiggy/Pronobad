export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[calc(2rem+var(--safe-top))]">
      <header className="mb-10">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-court text-2xl">
          🏸
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Pronobad</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          Pronostiquez les rencontres interclubs de votre club et grimpez au
          classement de la saison.
        </p>
      </header>

      <section aria-labelledby="how" className="mb-10">
        <h2 id="how" className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
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
                <h3 className="font-medium text-ink">{item.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-auto pb-8">
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-center text-sm text-ink-soft">
          Application en cours de construction.
        </p>
      </div>
    </main>
  )
}
