import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useKamera, type Groesse } from "@/karte/kamera";
import type { P } from "@/baukasten/geometrie";
import { ZELLE, karte, orte, strich, zellPfad } from "./altstadt";

const SPEICHER = "markieren-altstadt-1";
const STATION = 2; // Andeutung des Rundgangs
const STRIPE = ["bg-rb-1", "bg-rb-2", "bg-rb-3", "bg-rb-4", "bg-rb-5", "bg-rb-6", "bg-rb-7", "bg-rb-8", "bg-rb-9"];

// Farbe nach Gegenstand (Kanon K1): Begegnung aubergine, Mitmachen gold,
// Wege isarpetrol, Natur tannengrün. Volle Klassennamen für Tailwind.
const FRAGEN = [
  { id: "heute", frage: "Wo hältst du dich heute gern auf?", hilfe: "Male die Orte, an denen du gern bist, auch wenn es nur kurz ist.",
    malen: "fill-thema-aubergine/55", leise: "fill-thema-aubergine/15", knopf: "bg-thema-aubergine" },
  { id: "wunsch", frage: "Wo würdest du dich gern aufhalten, wenn es dort schöner wäre?", hilfe: "Deine Orte von eben sind blass zu sehen.",
    malen: "fill-gold-500/65", leise: "fill-gold-500/15", knopf: "bg-gold-700" },
  { id: "autos", frage: "Wo stören dich Autos?", hilfe: "Parken, Durchfahren, Tempo oder Lärm, alles zählt.",
    malen: "fill-thema-isarpetrol/55", leise: "fill-thema-isarpetrol/15", knopf: "bg-thema-isarpetrol" },
  { id: "ruhe", frage: "Wo kannst du gut abschalten?", hilfe: "Ruhige Ecken, Schatten, Wasser, ein Platz zum Sitzen.",
    malen: "fill-thema-tannengruen/55", leise: "fill-thema-tannengruen/15", knopf: "bg-thema-tannengruen" },
] as const;
type FrageId = (typeof FRAGEN)[number]["id"];
type Antworten = Record<FrageId, number[]>;
type Werkzeug = "malen" | "radieren" | "verschieben";

const leer = (): Antworten => ({ heute: [], wunsch: [], autos: [], ruhe: [] });

function laden(): { antworten: Antworten; schritt: number } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { antworten: leer(), schritt: 0 };
}

const pfad = (ring: P[]) => "M" + ring.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const stadtplatz = karte.namen.find((n) => n.name === "Stadtplatz")?.pos ?? [karte.groesse[0] / 2, karte.groesse[1] / 2];
const RAHMEN = { x: 0, y: 0, w: karte.groesse[0], h: karte.groesse[1] };

export default function Markieren() {
  const [stand, setStand] = useState(laden);
  const { antworten, schritt } = stand;
  const auswertung = schritt >= FRAGEN.length;
  const frage = FRAGEN[Math.min(schritt, FRAGEN.length - 1)];
  const [werkzeug, setWerkzeug] = useState<Werkzeug>("malen");
  const [verlauf, setVerlauf] = useState<Antworten[]>([]);
  const [zeiger, setZeiger] = useState<P | null>(null);
  const strichRef = useRef<{ letzter: P; vorher: Antworten; cx: number; cy: number } | null>(null);
  const gruppe = useRef<SVGGElement>(null);

  const start = (b: Groesse) => {
    const s = b.w < b.h ? b.w / 220 : b.h / 360;
    return { s, x: stadtplatz[0] - b.w / s / 2, y: stadtplatz[1] - b.h / s / 2 };
  };
  const kam = useKamera(RAHMEN, start, "fest", 30);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);

  function modellPunkt(cx: number, cy: number): P {
    const g = gruppe.current!;
    const pt = g.ownerSVGElement!.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = pt.matrixTransform(g.getScreenCTM()!.inverse());
    return [m.x, m.y];
  }

  function trage(zellen: number[], a: Antworten): Antworten {
    const s = new Set(a[frage.id]);
    for (const i of zellen) (werkzeug === "radieren" ? s.delete(i) : s.add(i));
    return { ...a, [frage.id]: [...s] };
  }

  const malbar = !auswertung && werkzeug !== "verschieben";
  const gesten = kam.gesten({
    runter(e) {
      const p = modellPunkt(e.clientX, e.clientY);
      strichRef.current = { letzter: p, vorher: antworten, cx: e.clientX, cy: e.clientY };
      if (malbar) setStand((st) => ({ ...st, antworten: trage(strich(p, p), st.antworten) }));
    },
    bewegen(e) {
      const s = strichRef.current;
      if (!s) return;
      if (!malbar) {
        kam.verschiebe(e.clientX - s.cx, e.clientY - s.cy);
        s.cx = e.clientX; s.cy = e.clientY;
        return;
      }
      const p = modellPunkt(e.clientX, e.clientY);
      const neu = strich(s.letzter, p);
      s.letzter = p;
      setZeiger(e.pointerType === "mouse" ? p : null);
      setStand((st) => ({ ...st, antworten: trage(neu, st.antworten) }));
    },
    hoch() {
      const s = strichRef.current;
      strichRef.current = null;
      if (s && malbar) setVerlauf((v) => [...v.slice(-29), s.vorher]);
    },
    // Ein zweiter Finger heißt Zoomen: den angefangenen Strich zurücknehmen.
    abbruch() {
      const s = strichRef.current;
      strichRef.current = null;
      if (s && malbar) setStand((st) => ({ ...st, antworten: s.vorher }));
    },
    schweben(e) {
      if (malbar) setZeiger(modellPunkt(e.clientX, e.clientY));
    },
  });

  function rueckgaengig() {
    if (!verlauf.length) return;
    setStand((st) => ({ ...st, antworten: verlauf[verlauf.length - 1] }));
    setVerlauf(verlauf.slice(0, -1));
  }

  const gehe = (n: number) => { setStand((st) => ({ ...st, schritt: n })); setVerlauf([]); setWerkzeug("malen"); };

  const pfade = useMemo(() => Object.fromEntries(FRAGEN.map((f) => [f.id, zellPfad(antworten[f.id])])) as Record<FrageId, string>, [antworten]);
  const wunschNeu = useMemo(() => {
    const heute = new Set(antworten.heute);
    return antworten.wunsch.filter((i) => !heute.has(i));
  }, [antworten]);

  const schrift = kam.kamera ? 11.5 / kam.kamera.s : 5;
  const zoomGross = (kam.kamera?.s ?? 0) > 1.6;

  const karteSvg = kam.viewBox && (
    <svg viewBox={kam.viewBox} className="block size-full touch-none select-none" {...gesten}
      onPointerLeave={() => setZeiger(null)}
      style={{ cursor: auswertung ? "default" : werkzeug === "verschieben" ? "grab" : "crosshair" }}
      role="application" aria-label="Karte der Altstadt. Mit einem Finger malen, mit zwei Fingern verschieben und zoomen.">
      <defs>
        <pattern id="gitter" width={ZELLE} height={ZELLE} patternUnits="userSpaceOnUse">
          <path d={`M${ZELLE} 0H0V${ZELLE}`} className="fill-none stroke-ink/10" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>
      <rect x={-1e4} y={-1e4} width={2e4} height={2e4} className="fill-cream-dark" />
      <g ref={gruppe}>
        {karte.flaechen.verkehr.map((f, i) => <path key={`v${i}`} d={f.map(pfad).join("")} className="fill-cream" fillRule="evenodd" />)}
        {karte.flaechen.gruen.map((f, i) => <path key={`g${i}`} d={f.map(pfad).join("")} className="fill-thema-tannengruen/15" fillRule="evenodd" />)}
        {karte.flaechen.wasser.map((f, i) => <path key={`w${i}`} d={f.map(pfad).join("")} className="fill-thema-isarpetrol/30" fillRule="evenodd" />)}
        {!auswertung && zoomGross && <rect width={karte.groesse[0]} height={karte.groesse[1]} fill="url(#gitter)" pointerEvents="none" />}

        {auswertung ? (
          <>
            <path d={pfade.heute} className="fill-thema-aubergine/45" />
            <path d={zellPfad(wunschNeu)} className="fill-gold-500/75" />
          </>
        ) : (
          <>
            {frage.id === "wunsch" && <path d={pfade.heute} className={FRAGEN[0].leise} />}
            <path d={pfade[frage.id]} className={frage.malen} />
          </>
        )}

        {karte.gebaeude.map((g, i) => <path key={i} d={pfad(g)} className="fill-ink/85 stroke-cream-dark" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
        {zeiger && malbar && (
          <circle cx={zeiger[0]} cy={zeiger[1]} r={ZELLE * 1.2} className={werkzeug === "radieren" ? "fill-none stroke-blockiert" : "fill-none stroke-ink"} strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )}
        {karte.namen.map((n) => {
          // lesbar halten: nie auf dem Kopf
          const w = n.winkel > 90 ? n.winkel - 180 : n.winkel < -90 ? n.winkel + 180 : n.winkel;
          return (
            <text key={n.name} transform={`translate(${n.pos[0]} ${n.pos[1]}) rotate(${w})`} fontSize={schrift} textAnchor="middle" dominantBaseline="middle"
              className="fill-ink-soft font-sans" style={{ fontWeight: 600, paintOrder: "stroke" }} stroke="var(--color-cream)" strokeWidth={schrift * 0.25} pointerEvents="none">
              {n.name}
            </text>
          );
        })}
      </g>
    </svg>
  );

  const blatt = auswertung ? (
    <Auswertung antworten={antworten} wunschNeu={wunschNeu} onZurueck={() => gehe(0)} />
  ) : (
    <div className="grid gap-3">
      <div className="flex items-center gap-2" aria-label={`Frage ${schritt + 1} von ${FRAGEN.length}`}>
        {FRAGEN.map((f, i) => (
          <button key={f.id} type="button" onClick={() => gehe(i)} aria-label={`Zu Frage ${i + 1}`} aria-current={i === schritt}
            className={`h-1.5 flex-1 rounded-full ${i === schritt ? f.knopf : antworten[f.id].length ? "bg-ink-soft/50" : "bg-ink-line"}`} />
        ))}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-ink-soft">Frage {schritt + 1} von {FRAGEN.length}</p>
        <h2 className="font-display text-xl leading-snug font-semibold text-balance">{frage.frage}</h2>
        <p className="mt-0.5 text-sm text-ink-soft">{frage.hilfe}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[10px] border border-ink-line p-0.5" role="group" aria-label="Werkzeug">
          {(["malen", "radieren", "verschieben"] as const).map((w) => (
            <button key={w} type="button" aria-pressed={werkzeug === w} onClick={() => setWerkzeug(w)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${werkzeug === w ? "bg-ink text-cream" : "text-ink"}`}>
              {{ malen: "Malen", radieren: "Radieren", verschieben: "Verschieben" }[w]}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[13px] text-ink-muted [font-variant-numeric:lining-nums_tabular-nums]">
          {antworten[frage.id].length} {antworten[frage.id].length === 1 ? "Feld" : "Felder"}
        </span>
      </div>
      <div className="flex gap-2">
        {schritt > 0 && <Knopf onClick={() => gehe(schritt - 1)}>Zurück</Knopf>}
        <Knopf onClick={() => gehe(schritt + 1)} stark>
          {antworten[frage.id].length ? (schritt === FRAGEN.length - 1 ? "Fertig" : "Weiter") : "Überspringen"}
        </Knopf>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-ink-line">
          <div className="grid h-1 grid-cols-9" aria-label={`Station ${STATION} von 9`}>
            {STRIPE.map((c, i) => <span key={c} className={i < STATION ? c : "bg-ink-line"} />)}
          </div>
          <div className="px-4 pt-3 pb-2.5">
            <p className="text-[13px] font-semibold text-gold-700">Station {STATION} von 9</p>
            <h1 className="font-display text-[1.6rem] leading-tight font-semibold">Deine Altstadt</h1>
          </div>
        </header>
        <div ref={kam.buehne} className="relative min-h-0 flex-1 overflow-hidden">
          {karteSvg}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Kartenknopf label="Vergrößern" onClick={() => kam.zoomeMitte(1.5)}>+</Kartenknopf>
            <Kartenknopf label="Verkleinern" onClick={() => kam.zoomeMitte(1 / 1.5)}>−</Kartenknopf>
            {!auswertung && <Kartenknopf label="Rückgängig" onClick={rueckgaengig} aus={!verlauf.length}>↶</Kartenknopf>}
          </div>
          {!auswertung && (
            <p className="pointer-events-none absolute top-3 left-3 max-w-[62%] rounded-[10px] bg-cream/95 px-3 py-1.5 text-[13px] shadow-sm">
              <span className="pointer-fine:hidden">Ein Finger malt, zwei Finger verschieben und zoomen.</span>
              <span className="pointer-coarse:hidden">Ziehen malt, das Mausrad zoomt.</span>
            </p>
          )}
        </div>
        <div className="shrink-0 border-t border-ink-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">{blatt}</div>
      </div>
      <aside className="hidden w-[22rem] shrink-0 flex-col gap-4 border-l border-ink-line p-4 md:flex">
        {blatt}
        {!auswertung && <p className="mt-auto text-[12.5px] text-ink-muted">Mausrad zoomt. Zum Verschieben mit der Maus das Werkzeug „Verschieben“ nehmen.</p>}
      </aside>
    </div>
  );
}

function Auswertung({ antworten, wunschNeu, onZurueck }: { antworten: Antworten; wunschNeu: number[]; onZurueck: () => void }) {
  const wo = orte(wunschNeu);
  const autos = orte(antworten.autos, 2);
  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[13px] font-semibold text-gold-700">Station {STATION} geschafft</p>
        <h2 className="font-display text-xl leading-snug font-semibold">Wo dir etwas fehlt</h2>
      </div>
      <ul className="grid gap-1.5 text-sm">
        <li className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-sm bg-thema-aubergine/45" aria-hidden="true" />Heute gern dort</li>
        <li className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-sm bg-gold-500/75" aria-hidden="true" />Wärst gern dort, bist es heute nicht</li>
      </ul>
      <p className="text-sm">
        {wunschNeu.length
          ? <>An {wunschNeu.length} Feldern wünschst du dir einen Ort, den du heute nicht nutzt.{wo.length ? <> Die meisten liegen hier: {wo.join(", ")}.</> : null}</>
          : "Deine Wunschorte decken sich mit denen, an denen du heute schon bist."}
        {autos.length ? <> Autos stören dich vor allem hier: {autos.join(", ")}.</> : null}
      </p>
      <p className="text-sm text-ink-soft">
        Im fertigen Rundgang kommen hier die Karten aller Teilnehmenden zusammen. Danach geht es zur nächsten Station.
      </p>
      <div className="flex gap-2">
        <Knopf onClick={onZurueck}>Noch einmal ändern</Knopf>
      </div>
    </div>
  );
}

function Knopf({ children, onClick, stark }: { children: ReactNode; onClick: () => void; stark?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-[10px] px-3.5 py-2 text-sm font-semibold ${stark ? "bg-gold-700 text-cream" : "border border-ink-line bg-cream text-ink"}`}>
      {children}
    </button>
  );
}

function Kartenknopf({ children, label, onClick, aus }: { children: ReactNode; label: string; onClick: () => void; aus?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={aus}
      className="grid size-10 place-items-center rounded-[10px] border border-ink-line bg-cream/95 text-lg leading-none shadow-sm disabled:opacity-40">
      {children}
    </button>
  );
}
