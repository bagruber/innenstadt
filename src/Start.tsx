import { useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { STATIONEN, useRundgang } from "./rundgang";
import { RollenZeile, Stripe } from "./ui";

// Jede Station gehört zu ihrem Stripe-Segment: Station n trägt die Farbe rb-n.
const FARBE = ["bg-rb-1", "bg-rb-2", "bg-rb-3", "bg-rb-4", "bg-rb-5", "bg-rb-6", "bg-rb-7", "bg-rb-8", "bg-rb-9"];
const RAND = ["border-rb-1", "border-rb-2", "border-rb-3", "border-rb-4", "border-rb-5", "border-rb-6", "border-rb-7", "border-rb-8", "border-rb-9"];
// Auf Gelb, Orange und Hellblau ist dunkle Schrift lesbarer als helle.
const HELL = new Set([3, 4, 6]);

const SPEICHER = [
  "rundgang-1", "baukasten-herrnstrasse-1", "markieren-altstadt-1", "pins-1", "strassen-1", "swipe-1",
  "laerm-1", "anreise-1", "kalender-1", "bild-1", "abgeschaut-1",
];

export default function Start() {
  const { rolle, setRolle, erledigt } = useRundgang();
  const [loeschen, setLoeschen] = useState(false);

  function allesLoeschen() {
    for (const k of SPEICHER) { try { localStorage.removeItem(k); } catch { /* egal */ } }
    location.reload();
  }

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <Stripe erledigt={erledigt} />
      {/* Deckende Fläche in Gold: Gegenstand „Mitmachen“ (K1). */}
      <header className="bg-gold-700 text-cream">
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-9">
          <p className="text-[13px] font-semibold text-gold-200">Innenstadt Moosburg · Prototyp</p>
          <h1 className="mt-1 font-display text-display-4 leading-tight font-semibold text-balance sm:text-display-3">Dein Rundgang durch die Altstadt</h1>
          <p className="mt-3 max-w-[34rem] text-gold-100">
            Neun Stationen, jede dauert ein, zwei Minuten. Die Reihenfolge ist frei, du kannst jederzeit aufhören und später weitermachen.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-8 px-4 py-7">
        <RollenZeile rolle={rolle} setRolle={setRolle} />

        <section aria-labelledby="stationen">
          <h2 id="stationen" className="font-display text-xl font-semibold">
            Stationen <span className="font-sans text-sm font-normal text-ink-muted [font-variant-numeric:lining-nums_tabular-nums]">· {erledigt.length} von 9 erledigt</span>
          </h2>
          <ol className="mt-3">
            {STATIONEN.map((s) => {
              const fertig = erledigt.includes(s.nr);
              return (
                <li key={s.nr} className="border-t border-ink-line last:border-b">
                  <a href={s.anker} className="flex items-center gap-3 py-3">
                    {/* Offen: Rahmen in der Stationsfarbe; erledigt: gefüllt wie das Segment im Stripe. */}
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg border-[2.5px] font-display text-lg font-semibold [font-variant-numeric:lining-nums_tabular-nums] ${RAND[s.nr - 1]} ${fertig ? `${FARBE[s.nr - 1]} ${HELL.has(s.nr) ? "text-ink" : "text-cream"}` : "text-ink"}`}>
                      {s.nr}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.titel}</span>
                      <span className="block text-sm text-ink-soft">{s.kurz}</span>
                    </span>
                    {fertig
                      ? <span className="flex items-center gap-1 text-[13px] font-semibold text-gold-700"><CheckCircle size={18} weight="fill" />erledigt</span>
                      : <span className="text-[13px] text-ink-muted">offen</span>}
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="ausser" className="grid gap-1">
          <h2 id="ausser" className="font-display text-xl font-semibold">Außer der Reihe</h2>
          <a href="#abgeschaut" className="flex items-center gap-3 border-y border-ink-line py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Abgeschaut</span>
              <span className="block text-sm text-ink-soft">Etwas Schönes in einer anderen Stadt gesehen? Foto hochladen.</span>
            </span>
            <span className="text-[13px] text-ink-muted">jederzeit</span>
          </a>
        </section>

        <footer className="grid gap-2 text-[13px] text-ink-muted">
          <p>Prototyp: Deine Antworten bleiben in diesem Browser und gehen nirgendwohin.</p>
          {loeschen ? (
            <p className="flex flex-wrap items-center gap-2">
              Wirklich alle Antworten löschen?
              <button type="button" onClick={allesLoeschen} className="rounded-md bg-blockiert px-2.5 py-1 font-semibold text-cream">Ja, löschen</button>
              <button type="button" onClick={() => setLoeschen(false)} className="underline">Abbrechen</button>
            </p>
          ) : (
            <button type="button" onClick={() => setLoeschen(true)} className="w-fit underline">Alle Antworten löschen</button>
          )}
        </footer>
      </main>
    </div>
  );
}
