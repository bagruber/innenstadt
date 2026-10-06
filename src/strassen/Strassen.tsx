import { useEffect, useRef, useState } from "react";
import { useKamera, type Groesse } from "@/karte/kamera";
import { karte } from "@/karte/altstadt";
import { Altstadtkarte, RAHMEN, stadtplatz } from "@/karte/Altstadtkarte";
import { Geschafft, Kartenknopf, Knopf, Kopf, useHinweis } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 4;
const SPEICHER = "strassen-1";

// Farben: Wege isarpetrol, Begegnung aubergine (Kanon K1). Anlieger frei ist
// eine Spielart von Wege, deshalb dieselbe Farbe gestrichelt.
const ZUSTAENDE = [
  { id: "fussgaenger", name: "Fußgängerzone", linie: "stroke-thema-aubergine", feld: "bg-thema-aubergine", breite: 7, strich: undefined },
  { id: "beruhigt", name: "Verkehrsberuhigt", linie: "stroke-thema-isarpetrol", feld: "bg-thema-isarpetrol", breite: 6, strich: undefined },
  { id: "anlieger", name: "Anlieger frei", linie: "stroke-thema-isarpetrol", feld: "bg-thema-isarpetrol/60", breite: 5, strich: "7 5" },
  { id: "lassen", name: "So lassen", linie: "stroke-ink", feld: "bg-ink", breite: 4, strich: undefined },
] as const;
type Zustand = (typeof ZUSTAENDE)[number]["id"];
const zustand = Object.fromEntries(ZUSTAENDE.map((z) => [z.id, z])) as Record<Zustand, (typeof ZUSTAENDE)[number]>;

const HILFE = "Wähle unten, was gelten soll, dann tippe Straßenabschnitte an. Noch einmal tippen nimmt es zurück.";

function laden(): { wahl: Record<string, Zustand>; fertig: boolean } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { wahl: {}, fertig: false };
}

const linienPfad = (pts: [number, number][]) => "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L");

export default function Strassen() {
  const [stand, setStand] = useState(laden);
  const { wahl, fertig } = stand;
  const [werkzeug, setWerkzeug] = useState<Zustand>("fussgaenger");
  const [hinweis, zeige] = useHinweis();
  const gruppe = useRef<SVGGElement>(null);
  const tipp = useRef<{ id: string | null; cx: number; cy: number; lx: number; ly: number; bewegt: boolean } | null>(null);
  const { erledige } = useRundgang();

  const start = (b: Groesse) => {
    const s = b.w < b.h ? b.w / 260 : b.h / 380;
    return { s, x: stadtplatz[0] - b.w / s / 2, y: stadtplatz[1] - b.h / s / 2 };
  };
  const kam = useKamera(RAHMEN, start, "fest", 30);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (fertig) erledige(STATION); }, [fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  function antippen(id: string) {
    const a = karte.abschnitte.find((x) => x.id === id)!;
    const neu = { ...wahl };
    if (neu[id] === werkzeug) delete neu[id];
    else neu[id] = werkzeug;
    setStand({ ...stand, wahl: neu });
    zeige(`${a.name || "Straße ohne Namen"}: ${neu[id] ? zustand[werkzeug].name : "keine Angabe"}`);
  }

  const gesten = kam.gesten({
    runter(e) {
      const ziel = (e.target as Element).closest("[data-abschnitt]");
      tipp.current = { id: ziel?.getAttribute("data-abschnitt") ?? null, cx: e.clientX, cy: e.clientY, lx: e.clientX, ly: e.clientY, bewegt: false };
    },
    bewegen(e) {
      const t = tipp.current;
      if (!t) return;
      if (!t.bewegt && Math.hypot(e.clientX - t.cx, e.clientY - t.cy) < 6) return;
      t.bewegt = true;
      kam.verschiebe(e.clientX - t.lx, e.clientY - t.ly);
      t.lx = e.clientX; t.ly = e.clientY;
    },
    hoch() {
      const t = tipp.current;
      tipp.current = null;
      if (t && !t.bewegt && t.id && !fertig) antippen(t.id);
    },
    abbruch() { tipp.current = null; },
  });

  const meter = (z: Zustand) => karte.abschnitte.filter((a) => wahl[a.id] === z).reduce((s, a) => s + a.laenge, 0);
  const namen = (z: Zustand) => [...new Set(karte.abschnitte.filter((a) => wahl[a.id] === z && a.name).map((a) => a.name))];
  const schrift = kam.kamera ? 11.5 / kam.kamera.s : 5;

  const karteSvg = kam.viewBox && (
    <svg viewBox={kam.viewBox} className="block size-full touch-none select-none" {...gesten}
      role="application" aria-label="Straßen der Altstadt. Zustand wählen, dann Abschnitte antippen.">
      <Altstadtkarte gruppeRef={gruppe} schrift={schrift}
        oben={karte.abschnitte.map((a) => {
          const z = wahl[a.id] ? zustand[wahl[a.id]] : null;
          const d = linienPfad(a.punkte);
          return (
            <g key={a.id} data-abschnitt={a.id} style={{ cursor: "pointer" }}>
              {/* breite, unsichtbare Trefferfläche für Finger */}
              <path d={d} className="fill-none stroke-transparent" strokeWidth={22} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              {z ? (
                <path d={d} className={`fill-none ${z.linie}`} strokeWidth={z.breite} strokeDasharray={z.strich} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ) : (
                <path d={d} className={`fill-none ${a.heute === "beruhigt" ? "stroke-thema-isarpetrol/45" : "stroke-ink/30"}`} strokeWidth={2} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              )}
            </g>
          );
        })} />
    </svg>
  );

  const blatt = fertig ? (
    <Geschafft station={STATION} titel="Deine Altstadt-Straßen" onAendern={() => setStand({ ...stand, fertig: false })}>
      <ul className="grid gap-2 text-sm">
        {ZUSTAENDE.filter((z) => meter(z.id) > 0).map((z) => (
          <li key={z.id} className="grid grid-cols-[auto_1fr] gap-x-2">
            <span className={`mt-1.5 h-1.5 w-5 rounded-full ${z.feld}`} aria-hidden="true" />
            <span><span className="font-semibold">{z.name}</span> · {meter(z.id)} m{namen(z.id).length ? <span className="text-ink-soft">: {namen(z.id).slice(0, 4).join(", ")}</span> : null}</span>
          </li>
        ))}
        {!Object.keys(wahl).length && <li className="text-ink-soft">Du hast nichts geändert. Auch das ist eine Antwort.</li>}
      </ul>
      <p className="text-sm text-ink-soft">Im fertigen Rundgang wird daraus eine gemeinsame Karte: welche Abschnitte wie viele Menschen ruhiger haben wollen.</p>
    </Geschafft>
  ) : (
    <div className="grid gap-3">
      <div>
        <h2 className="font-display text-xl leading-snug font-semibold text-balance">Wie soll der Verkehr in der Altstadt laufen?</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{HILFE}</p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5" aria-label="Was soll gelten?">
        {ZUSTAENDE.map((z) => (
          <li key={z.id}>
            <button type="button" aria-pressed={werkzeug === z.id} onClick={() => setWerkzeug(z.id)}
              className={`flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left text-sm ${werkzeug === z.id ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
              <span className={`h-1.5 w-5 shrink-0 rounded-full ${z.feld} ${werkzeug === z.id ? "ring-1 ring-cream" : ""}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 font-semibold">{z.name}</span>
              <span className={`text-[12px] [font-variant-numeric:lining-nums_tabular-nums] ${werkzeug === z.id ? "text-cream/75" : "text-ink-muted"}`}>{meter(z.id)} m</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf>
        {Object.keys(wahl).length > 0 && <Knopf onClick={() => setStand({ ...stand, wahl: {} })}>Alles zurücksetzen</Knopf>}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <Kopf station={STATION} titel="Straßen beruhigen" />
        <div ref={kam.buehne} className="relative min-h-0 flex-1 overflow-hidden">
          {karteSvg}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Kartenknopf label="Vergrößern" onClick={() => kam.zoomeMitte(1.5)}>+</Kartenknopf>
            <Kartenknopf label="Verkleinern" onClick={() => kam.zoomeMitte(1 / 1.5)}>−</Kartenknopf>
          </div>
          <p className="pointer-events-none absolute top-3 left-3 max-w-[62%] rounded-[10px] bg-cream/95 px-3 py-1.5 text-[13px] shadow-sm">
            Gepunktet: heute. Hellblau gepunktet: heute schon verkehrsberuhigt.
          </p>
          {hinweis}
        </div>
      </div>
      <div className="max-h-[48dvh] shrink-0 overflow-auto border-t border-ink-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex md:max-h-none md:w-[22rem] md:flex-col md:gap-4 md:border-t-0 md:border-l md:p-4">{blatt}</div>
    </div>
  );
}
