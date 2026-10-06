import { useEffect, useState, type ComponentType } from "react";
import { Basket, Baby, ForkKnife, MaskHappy, MusicNotes, Sparkle, SoccerBall, type IconProps } from "@phosphor-icons/react";
import { Geschafft, Knopf, Kopf } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 8;
const SPEICHER = "kalender-1";
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

// Farbe nach Gegenstand (K1): Feste tiefrot, Kultur und Begegnung aubergine,
// draußen tannengrün, Mitmachen gold.
const ARTEN: { id: string; name: string; Symbol: ComponentType<IconProps>; feld: string }[] = [
  { id: "markt", name: "Markt", Symbol: Basket, feld: "bg-gold-700" },
  { id: "musik", name: "Musik", Symbol: MusicNotes, feld: "bg-thema-tiefrot" },
  { id: "kultur", name: "Kultur", Symbol: MaskHappy, feld: "bg-thema-aubergine" },
  { id: "kinder", name: "Für Kinder", Symbol: Baby, feld: "bg-thema-aubergine" },
  { id: "essen", name: "Essen und Trinken", Symbol: ForkKnife, feld: "bg-thema-tiefrot" },
  { id: "licht", name: "Licht und Schmuck", Symbol: Sparkle, feld: "bg-gold-700" },
  { id: "sport", name: "Sport und Bewegung", Symbol: SoccerBall, feld: "bg-thema-tannengruen" },
];
const art = Object.fromEntries(ARTEN.map((a) => [a.id, a]));

/** Monat (0–11) → gewünschte Arten */
type Wuensche = Record<number, string[]>;

function laden(): { w: Wuensche; fertig: boolean } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { w: {}, fertig: false };
}

export default function Kalender() {
  const [stand, setStand] = useState(laden);
  const { w, fertig } = stand;
  const [stempel, setStempel] = useState(ARTEN[0].id);
  const { erledige } = useRundgang();
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (fertig) erledige(STATION); }, [fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  function tippe(m: number) {
    const da = w[m] ?? [];
    const neu = da.includes(stempel) ? da.filter((x) => x !== stempel) : [...da, stempel];
    setStand({ ...stand, w: { ...w, [m]: neu } });
  }

  const max = Math.max(1, ...MONATE.map((_, m) => (w[m] ?? []).length));
  const meiste = MONATE.map((n, m) => ({ n, z: (w[m] ?? []).length })).filter((x) => x.z === max && x.z > 0).map((x) => x.n);

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf station={STATION} titel="Ein Jahr Innenstadt" />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-5 px-4 py-5">
        {fertig ? (
          <Geschafft station={STATION} titel="Was dir wann fehlt" onAendern={() => setStand({ ...stand, fertig: false })}>
            <p className="text-sm">
              {meiste.length ? <>Am meisten fehlt dir etwas im {meiste.join(", ")}.</> : "Dir fehlt nichts, das Jahr passt so."}
            </p>
            <p className="text-sm text-ink-soft">Im fertigen Rundgang wird daraus ein Wunschkalender für das Stadtmarketing: welche Monate leer wirken und was dort fehlt.</p>
          </Geschafft>
        ) : (
          <>
            <div>
              <h2 className="font-display text-xl leading-snug font-semibold text-balance">In welchen Monaten fehlt dir in der Altstadt etwas?</h2>
              <p className="mt-0.5 text-sm text-ink-soft">Wähle aus, was fehlt, und tippe die Monate an. Noch einmal tippen nimmt es zurück.</p>
            </div>
            <div className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-cream px-4 py-2" role="group" aria-label="Was fehlt?">
              {ARTEN.map((a) => (
                <button key={a.id} type="button" aria-pressed={stempel === a.id} onClick={() => setStempel(a.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] font-semibold ${stempel === a.id ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
                  <span className={`grid size-6 place-items-center rounded-full ${a.feld}`}><a.Symbol size={14} weight="bold" color="#faf7f2" /></span>
                  {a.name}
                </button>
              ))}
            </div>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {MONATE.map((n, m) => {
                const da = w[m] ?? [];
                const viel = da.length === max && da.length > 0;
                return (
                  <li key={n}>
                    <button type="button" onClick={() => tippe(m)} aria-label={`${n}: ${da.length ? da.map((x) => art[x].name).join(", ") : "nichts"}. Tippen setzt ${art[stempel].name}.`}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-left ${viel ? "border-gold-700 bg-gold-100" : "border-ink-line"}`}>
                      <span className="w-20 shrink-0 text-sm font-semibold">{n}</span>
                      <span className="flex flex-wrap gap-1">
                        {da.map((x) => { const A = art[x]; return <span key={x} className={`grid size-6 place-items-center rounded-full ${A.feld}`} title={A.name}><A.Symbol size={13} weight="bold" color="#faf7f2" /></span>; })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div><Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf></div>
          </>
        )}
      </main>
    </div>
  );
}
