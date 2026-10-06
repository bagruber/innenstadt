import { useEffect, useMemo, useRef, useState } from "react";
import { useKamera, type Groesse } from "@/karte/kamera";
import type { P } from "@/baukasten/geometrie";
import { ZELLE, karte, orte, strich, zellPfad } from "@/karte/altstadt";
import { Altstadtkarte, RAHMEN, modellPunkt as mp, stadtplatz } from "@/karte/Altstadtkarte";
import { Geschafft, Kartenknopf, Knopf, Kopf } from "@/ui";
import { useRundgang } from "@/rundgang";

const SPEICHER = "markieren-altstadt-1";
const STATION = 2;

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
  const { erledige } = useRundgang();
  useEffect(() => { if (auswertung) erledige(STATION); }, [auswertung]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = (b: Groesse) => {
    const s = b.w < b.h ? b.w / 220 : b.h / 360;
    return { s, x: stadtplatz[0] - b.w / s / 2, y: stadtplatz[1] - b.h / s / 2 };
  };
  const kam = useKamera(RAHMEN, start, "fest", 30);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);

  const modellPunkt = (cx: number, cy: number) => mp(gruppe.current!, cx, cy);

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
      <Altstadtkarte gruppeRef={gruppe} schrift={schrift}
        unten={<>
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
        </>}
        oben={zeiger && malbar && (
          <circle cx={zeiger[0]} cy={zeiger[1]} r={ZELLE * 1.2} className={werkzeug === "radieren" ? "fill-none stroke-blockiert" : "fill-none stroke-ink"} strokeWidth={1.5} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
        )} />
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
        <Kopf station={STATION} titel="Deine Altstadt" />
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
      </div>
      <div className="max-h-[48dvh] shrink-0 overflow-auto border-t border-ink-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex md:max-h-none md:w-[22rem] md:flex-col md:gap-4 md:border-t-0 md:border-l md:p-4">
        {blatt}
        {!auswertung && <p className="mt-auto hidden text-[12.5px] text-ink-muted md:block">Mausrad zoomt. Zum Verschieben mit der Maus das Werkzeug „Verschieben“ nehmen.</p>}
      </div>
    </div>
  );
}

function Auswertung({ antworten, wunschNeu, onZurueck }: { antworten: Antworten; wunschNeu: number[]; onZurueck: () => void }) {
  const wo = orte(wunschNeu);
  const autos = orte(antworten.autos, 2);
  return (
    <Geschafft station={STATION} titel="Wo dir etwas fehlt" onAendern={onZurueck}>
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
      <p className="text-sm text-ink-soft">Im fertigen Rundgang kommen hier die Karten aller Teilnehmenden zusammen.</p>
    </Geschafft>
  );
}
