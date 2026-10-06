// Volle Klassennamen, damit Tailwind die Theme-Farben mit ausgibt.
const STRIPE = [
  "bg-rb-1", "bg-rb-2", "bg-rb-3", "bg-rb-4", "bg-rb-5",
  "bg-rb-6", "bg-rb-7", "bg-rb-8", "bg-rb-9",
];

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="grid h-1 grid-cols-9" aria-hidden="true">
        {STRIPE.map((t) => (
          <span key={t} className={t} />
        ))}
      </div>

      {/* Deckende Fläche in Gold: Gegenstand „Mitmachen“ (K1). */}
      <header className="bg-gold-700 text-cream">
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-14 sm:pt-24 sm:pb-20">
          <h1 className="font-display text-display-3 leading-tight font-semibold text-balance sm:text-display-2">
            Innenstadt Moosburg
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-gold-100">
            Parken, Schatten, Läden, Lärm und Plätze zum Bleiben: Was die
            Altstadt braucht, wissen die, die sie nutzen. Hier entsteht eine
            Beteiligung, bei der man die Innenstadt auf der Karte selbst
            umbauen kann.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="font-semibold">In Vorbereitung.</p>
        <p className="mt-2 max-w-[38rem] text-ink-soft">
          Der Start wird auf moosburg.eu angekündigt.
        </p>
      </main>

      <footer className="border-t border-ink-line">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-ink-soft">
          <a className="underline-offset-4 hover:underline" href="https://moosburg.eu/">
            Zurück zu moosburg.eu
          </a>
          <a className="underline-offset-4 hover:underline" href="https://moosburg.eu/#impressum">
            Impressum
          </a>
        </nav>
      </footer>
    </div>
  );
}
