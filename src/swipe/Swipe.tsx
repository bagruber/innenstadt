import { useEffect, useRef, useState, type ComponentType, type PointerEvent as RPE } from "react";
import {
  Baby, Bicycle, Bus, Car, Drop, Lightbulb, Storefront, Tree, Truck, Umbrella, Users, Wine, type IconProps,
} from "@phosphor-icons/react";
import { Geschafft, Knopf, Kopf } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 5;
const SPEICHER = "swipe-1";

// Deckende Farbfläche nach Gegenstand (K1): Wege isarpetrol, Natur
// tannengrün, Begegnung aubergine, Feste tiefrot, Bauen erdbraun.
const THEMA = {
  wege: "bg-thema-isarpetrol", natur: "bg-thema-tannengruen", begegnung: "bg-thema-aubergine",
  feste: "bg-thema-tiefrot", bauen: "bg-thema-erdbraun",
} as const;

const GENERISCH = ["Braucht es nicht", "Kostet zu viel", "Nicht hier, aber woanders"];

// Ausgewogen formuliert: für jede Richtung gibt es Karten, damit das Set nicht
// selbst eine Antwort nahelegt. Die Reihenfolge wird je Person gemischt.
const KARTEN: { id: string; text: string; thema: keyof typeof THEMA; Symbol: ComponentType<IconProps>; warum?: string[] }[] = [
  { id: "kurzparken", text: "Kurzzeitparkplätze direkt vor den Läden behalten", thema: "wege", Symbol: Car, warum: ["Lieber Bänke und Grün", "Man parkt sowieso woanders", "Zu viel Verkehr in den Gassen"] },
  { id: "parkhaus", text: "Ein Parkhaus am Rand der Altstadt, dafür weniger Stellplätze in den Gassen", thema: "wege", Symbol: Car, warum: ["Zu weit zu Fuß", "Stellplätze in den Gassen sind wichtig", "Kostet zu viel"] },
  { id: "tempo10", text: "Tempo 10 in der ganzen Altstadt", thema: "wege", Symbol: Car, warum: ["Zu langsam", "Tempo 20 reicht", "Hält sich eh niemand dran"] },
  { id: "herrnstrasse", text: "Die Herrnstraße als Fußgängerzone", thema: "begegnung", Symbol: Users, warum: ["Läden brauchen Autos vor der Tür", "Anwohner müssen zufahren können", "Lieber verkehrsberuhigt"] },
  { id: "baeume", text: "Mehr Bäume, auch wenn dafür Stellplätze wegfallen", thema: "natur", Symbol: Tree, warum: ["Stellplätze sind wichtiger", "Bäume passen nicht ins Stadtbild", "Lieber Pflanzkübel"] },
  { id: "sonnensegel", text: "Sonnensegel über Plätzen im Sommer", thema: "natur", Symbol: Umbrella },
  { id: "trinkbrunnen", text: "Trinkbrunnen in der Altstadt", thema: "natur", Symbol: Drop },
  { id: "aussengastro", text: "Außengastronomie am Wochenende bis 23 Uhr", thema: "feste", Symbol: Wine, warum: ["Zu laut für Anwohner", "Lieber bis 22 Uhr", "Lieber länger"] },
  { id: "winterlicht", text: "Mehr Licht und Schmuck in der Altstadt im Winter", thema: "feste", Symbol: Lightbulb },
  { id: "popup", text: "Leere Läden zeitweise günstig an Gründerinnen und Gründer vermieten", thema: "bauen", Symbol: Storefront, warum: ["Sache der Eigentümer", "Lohnt sich nicht", "Lieber Wohnungen"] },
  { id: "spielen", text: "Spielgeräte für Kinder mitten in der Altstadt", thema: "begegnung", Symbol: Baby },
  { id: "radbuegel", text: "Mehr Fahrradbügel vor den Geschäften", thema: "wege", Symbol: Bicycle },
  { id: "flexbus", text: "Ein fester Flexbus-Halt am Stadtplatz", thema: "wege", Symbol: Bus },
  { id: "lieferzone", text: "Lieferzonen für Läden, damit niemand in zweiter Reihe hält", thema: "bauen", Symbol: Truck },
];
const karte = Object.fromEntries(KARTEN.map((k) => [k.id, k]));

type Urteil = "dafuer" | "dagegen" | "egal";
type Stand = { reihe: string[]; urteile: Record<string, Urteil>; warum: Record<string, string> };

function mischen<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function laden(): Stand {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { reihe: mischen(KARTEN.map((k) => k.id)), urteile: {}, warum: {} };
}

const SCHWELLE = 110; // Pixel bis zur Entscheidung

export default function Swipe() {
  const [stand, setStand] = useState(laden);
  const offen = stand.reihe.filter((id) => !stand.urteile[id]);
  const aktuell = offen[0] ? karte[offen[0]] : null;
  const [dx, setDx] = useState(0);
  const [fliegt, setFliegt] = useState<Urteil | null>(null);
  const [frageWarum, setFrageWarum] = useState<string | null>(null);
  const zug = useRef<{ x0: number; id: number } | null>(null);
  const { erledige } = useRundgang();
  const fertig = !aktuell && !frageWarum;

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (fertig) erledige(STATION); }, [fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  function entscheide(u: Urteil) {
    if (!aktuell || fliegt) return;
    setFliegt(u);
    setTimeout(() => {
      const id = aktuell.id;
      const dagegen = Object.values(stand.urteile).filter((x) => x === "dagegen").length;
      setStand((s) => ({ ...s, urteile: { ...s.urteile, [id]: u } }));
      setFliegt(null);
      setDx(0);
      // Nicht bei jeder Ablehnung nachfragen: bei der ersten und dann jeder zweiten.
      if (u === "dagegen" && dagegen % 2 === 0) setFrageWarum(id);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }

  function warum(grund: string | null) {
    if (frageWarum && grund) setStand((s) => ({ ...s, warum: { ...s.warum, [frageWarum]: grund } }));
    setFrageWarum(null);
  }

  // Tastatur: Pfeil links, rechts, unten.
  const taste = useRef<(e: KeyboardEvent) => void>(() => {});
  taste.current = (e) => {
    if (frageWarum) return;
    if (e.key === "ArrowRight") entscheide("dafuer");
    else if (e.key === "ArrowLeft") entscheide("dagegen");
    else if (e.key === "ArrowDown") entscheide("egal");
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => taste.current(e);
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);

  const griff = {
    onPointerDown(e: RPE<HTMLDivElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      zug.current = { x0: e.clientX, id: e.pointerId };
    },
    onPointerMove(e: RPE<HTMLDivElement>) {
      if (zug.current?.id === e.pointerId) setDx(e.clientX - zug.current.x0);
    },
    onPointerUp() {
      zug.current = null;
      if (dx > SCHWELLE) entscheide("dafuer");
      else if (dx < -SCHWELLE) entscheide("dagegen");
      else setDx(0);
    },
    onPointerCancel() { zug.current = null; setDx(0); },
  };

  const nr = KARTEN.length - offen.length + 1;
  const weg = fliegt === "dafuer" ? 600 : fliegt === "dagegen" ? -600 : 0;
  const x = fliegt ? weg : dx;
  const stempel = Math.min(1, Math.abs(dx) / SCHWELLE);

  const liste = (u: Urteil) => stand.reihe.filter((id) => stand.urteile[id] === u).map((id) => karte[id]);

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf station={STATION} titel="Dafür oder dagegen" />
      <main className="mx-auto grid w-full max-w-md flex-1 content-start gap-5 px-4 py-5">
        {fertig ? (
          <Geschafft station={STATION} titel="Deine Haltung" onAendern={() => setStand({ reihe: mischen(KARTEN.map((k) => k.id)), urteile: {}, warum: {} })}>
            {(["dafuer", "dagegen", "egal"] as const).map((u) => liste(u).length > 0 && (
              <section key={u}>
                <h3 className="text-sm font-semibold">{{ dafuer: "Dafür", dagegen: "Dagegen", egal: "Weiß nicht" }[u]} · {liste(u).length}</h3>
                <ul className="mt-1 grid gap-1 text-sm text-ink-soft">
                  {liste(u).map((k) => <li key={k.id}>{k.text}{stand.warum[k.id] ? <span className="text-ink-muted"> ({stand.warum[k.id]})</span> : null}</li>)}
                </ul>
              </section>
            ))}
            <p className="text-sm text-ink-soft">Im fertigen Rundgang siehst du hier, wie die anderen entschieden haben.</p>
          </Geschafft>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Nach rechts wischen heißt dafür, nach links dagegen. Am Desktop gehen auch die Pfeiltasten.
            </p>
            <div className="relative h-[22rem] select-none">
              {offen.slice(1, 3).reverse().map((id, i, arr) => {
                const k = karte[id];
                const tiefe = arr.length - i; // 1 = direkt dahinter
                return (
                  <div key={id} aria-hidden="true" className={`absolute inset-0 rounded-[14px] ${THEMA[k.thema]}`}
                    style={{ transform: `translateY(${tiefe * 10}px) scale(${1 - tiefe * 0.04})`, opacity: 1 - tiefe * 0.25 }} />
                );
              })}
              {aktuell && (
                <div {...griff} key={aktuell.id} role="group" aria-roledescription="Karte" aria-label={`Vorschlag ${nr} von ${KARTEN.length}: ${aktuell.text}`}
                  className={`absolute inset-0 flex touch-none cursor-grab flex-col justify-between rounded-[14px] p-6 text-cream shadow-lg ${THEMA[aktuell.thema]}`}
                  style={{ transform: `translateX(${x}px) rotate(${x / 18}deg)`, transition: zug.current ? "none" : "transform 220ms ease-out" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-gold-200 [font-variant-numeric:lining-nums_tabular-nums]">Vorschlag {nr} von {KARTEN.length}</span>
                    <aktuell.Symbol size={28} weight="duotone" color="#e8d5a3" />
                  </div>
                  <p className="font-display text-[1.75rem] leading-tight font-semibold text-balance">{aktuell.text}</p>
                  <div className="flex justify-between text-[13px] font-bold">
                    <span className="rounded-full border-2 border-cream px-3 py-1" style={{ opacity: dx < 0 ? stempel : 0 }}>Dagegen</span>
                    <span className="rounded-full border-2 border-cream px-3 py-1" style={{ opacity: dx > 0 ? stempel : 0 }}>Dafür</span>
                  </div>
                </div>
              )}
            </div>
            {frageWarum ? (
              <div className="grid gap-2 rounded-[14px] border border-ink-line p-4" role="dialog" aria-label="Warum eher nicht?">
                <p className="text-sm"><span className="font-semibold">Warum eher nicht?</span> <span className="text-ink-soft">„{karte[frageWarum].text}“</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {(karte[frageWarum].warum ?? GENERISCH).map((g) => (
                    <button key={g} type="button" onClick={() => warum(g)} className="rounded-full border border-ink-line px-3 py-1.5 text-sm">{g}</button>
                  ))}
                  <button type="button" onClick={() => warum(null)} className="rounded-full px-3 py-1.5 text-sm text-ink-muted">Sag ich nicht</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Knopf onClick={() => entscheide("dagegen")}>Dagegen</Knopf>
                <Knopf onClick={() => entscheide("egal")}>Weiß nicht</Knopf>
                <Knopf onClick={() => entscheide("dafuer")} stark>Dafür</Knopf>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
