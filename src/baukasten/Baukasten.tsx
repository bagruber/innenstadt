import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ANGEBOT, BUDGET, KATALOG, type Objekt, type Typ } from "./katalog";
import { umriss, type P } from "./geometrie";
import { Form, Vorschau } from "./Symbol";
import {
  FAHRGASSE, GRUND_TEXT, ZELLE, bestand, drehe, erlaubt, kennzahlen, mitte, neueId, phi, pruefe, rasterRot, schnapp,
  welt, zellen, type Grund, type Kennzahlen,
} from "./welt";
import { useKamera, type Groesse, type Rahmen } from "@/karte/kamera";
import { Kartenknopf, Knopf, Kopf, Stripe } from "@/ui";
import { useRundgang } from "@/rundgang";

const SPEICHER = "baukasten-herrnstrasse-1";
const STATION = 1;

/** Die ganze Straßenfläche in Ansichtskoordinaten, mit 5 m Rand. */
function rahmen(grad: number): Rahmen {
  const pts = welt.flaeche.flat().map((p) => drehe(p, grad));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - 5, y = Math.min(...ys) - 5;
  return { x, y, w: Math.max(...xs) + 5 - x, h: Math.max(...ys) + 5 - y };
}

const pfad = (ring: P[], zu = true) => "M" + ring.map((p) => p.map((v) => v.toFixed(2)).join(" ")).join("L") + (zu ? "Z" : "");
const zellPfad = (liste: typeof zellen) => liste.map((z) => `M${z.u} ${z.v}h${ZELLE}v${ZELLE}h-${ZELLE}Z`).join("");

function laden(): Objekt[] {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return bestand();
}

/** Vorschau eines Objekts vor dem Bauen. Mit dem Finger bleibt sie stehen,
 *  bis „Bauen“ gedrückt wird; mit der Maus folgt sie dem Zeiger. */
type Geist = { typ: Typ; x: number; y: number; viertel: number; quelle: "finger" | "maus" };
type Geste = { art: "leer" | "geist" | "objekt"; id?: string; cx: number; cy: number; lx: number; ly: number; dx: number; dy: number; bewegt: boolean };
type Ziehen = { id: string; x: number; y: number; grund: Grund | null };

export default function Baukasten() {
  const heute = useMemo(() => kennzahlen(bestand()), []);
  const [objekte, setObjekte] = useState<Objekt[]>(laden);
  const [verlauf, setVerlauf] = useState<Objekt[][]>([]);
  const jetzt = useMemo(() => kennzahlen(objekte), [objekte]);
  const [werkzeug, setWerkzeug] = useState<Typ | null>(null);
  const [viertel, setViertel] = useState(0);
  const [geist, setGeist] = useState<Geist | null>(null);
  const [auswahl, setAuswahl] = useState<string | null>(null);
  const [ziehen, setZiehen] = useState<Ziehen | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  const [gehwegAnsicht, setGehwegAnsicht] = useState(false);

  const gruppe = useRef<SVGGElement>(null);
  const { erledige } = useRundgang();
  const geste = useRef<Geste | null>(null);

  // Ausrichtung folgt der Bühne: hochkant am Telefon, quer am Desktop.
  const [hochkant, setHochkant] = useState(true);
  const grad = hochkant ? 90 - phi : -phi;
  const r = useMemo(() => rahmen(grad), [grad]);
  const start = (b: Groesse) => {
    if (hochkant) { const s = b.w / 26; return { s, x: mitte[0] - b.w / s / 2, y: r.y }; }
    const s = b.h / 30;
    return { s, x: r.x, y: mitte[1] - b.h / s / 2 };
  };
  const kam = useKamera(r, start, hochkant);
  useEffect(() => {
    if (kam.groesse) setHochkant(kam.groesse.h >= kam.groesse.w);
  }, [kam.groesse]);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(objekte)); } catch { /* egal */ }
  }, [objekte]);

  useEffect(() => {
    if (!hinweis) return;
    const t = setTimeout(() => setHinweis(null), 3200);
    return () => clearTimeout(t);
  }, [hinweis]);

  const rest = BUDGET - jetzt.kosten;
  const ausgewaehlt = objekte.find((o) => o.id === auswahl) ?? null;

  function aendern(neu: Objekt[]) {
    setVerlauf((v) => [...v.slice(-49), objekte]);
    setObjekte(neu);
  }

  function rueckgaengig() {
    if (!verlauf.length) return;
    setObjekte(verlauf[verlauf.length - 1]);
    setVerlauf(verlauf.slice(0, -1));
    setAuswahl(null);
  }

  function modellPunkt(cx: number, cy: number): P {
    const g = gruppe.current!;
    const pt = g.ownerSVGElement!.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const m = pt.matrixTransform(g.getScreenCTM()!.inverse());
    return [m.x, m.y];
  }

  const geistObjekt = (g: Geist): Objekt => ({ id: "geist", typ: g.typ, x: g.x, y: g.y, rot: rasterRot(g.viertel) });
  const zuTeuer = (t: Typ) => KATALOG[t].kosten > rest;

  function bauen(g: Geist) {
    const art = KATALOG[g.typ];
    if (zuTeuer(g.typ)) { setHinweis(`${art.name} kostet ${art.kosten} Punkte, übrig sind ${rest}.`); return; }
    const o = { ...geistObjekt(g), id: neueId() };
    const grund = pruefe(o, objekte);
    if (grund) { setHinweis(GRUND_TEXT[grund]); return; }
    aendern([...objekte, o]);
    if (g.quelle === "finger") setGeist(null);
  }

  function waehleWerkzeug(t: Typ | null) {
    setWerkzeug(t);
    setAuswahl(null);
    setGeist((g) => (g && t && g.quelle === "finger" ? { ...g, typ: t } : null));
  }

  function drehenGeist() {
    setViertel(viertel + 1);
    setGeist((g) => (g ? { ...g, viertel: g.viertel + 1 } : g));
  }

  const gesten = kam.gesten({
    runter(e) {
      const base = { cx: e.clientX, cy: e.clientY, lx: e.clientX, ly: e.clientY, dx: 0, dy: 0, bewegt: false };
      const [mx, my] = modellPunkt(e.clientX, e.clientY);
      // Mit der Maus liegt der Geist immer unter dem Zeiger; ein Klick darauf baut.
      if (geist?.quelle === "finger" && (e.target as Element).closest("[data-geist]")) {
        geste.current = { ...base, art: "geist", dx: geist.x - mx, dy: geist.y - my };
        return;
      }
      const ziel = (e.target as Element).closest("[data-id]");
      const o = ziel ? objekte.find((x) => x.id === ziel.getAttribute("data-id")) : undefined;
      // Wie in Citybuildern: erst antippen, dann ziehen. Sonst verschiebt
      // Wischen auf einer vollen Straße ständig Stellplätze statt der Karte.
      if (o && !o.fest && o.id === auswahl) geste.current = { ...base, art: "objekt", id: o.id, dx: o.x - mx, dy: o.y - my };
      else geste.current = { ...base, art: "leer", id: o?.id };
    },
    bewegen(e) {
      const g = geste.current;
      if (!g) return;
      if (!g.bewegt && Math.hypot(e.clientX - g.cx, e.clientY - g.cy) < 6) return;
      g.bewegt = true;
      if (g.art === "leer") {
        kam.verschiebe(e.clientX - g.lx, e.clientY - g.ly);
        g.lx = e.clientX; g.ly = e.clientY;
        return;
      }
      const [mx, my] = modellPunkt(e.clientX, e.clientY);
      const [x, y] = schnapp([mx + g.dx, my + g.dy]);
      if (g.art === "geist") setGeist((gg) => (gg ? { ...gg, x, y } : gg));
      else {
        const o = objekte.find((q) => q.id === g.id)!;
        setZiehen({ id: o.id, x, y, grund: pruefe({ ...o, x, y }, objekte) });
      }
    },
    hoch(e) {
      const g = geste.current;
      geste.current = null;
      if (!g) return;
      if (g.art === "objekt") {
        if (!g.bewegt) { setAuswahl(g.id!); setWerkzeug(null); setGeist(null); }
        else if (ziehen?.grund) setHinweis(GRUND_TEXT[ziehen.grund]);
        else if (ziehen) aendern(objekte.map((o) => (o.id === ziehen.id ? { ...o, x: ziehen.x, y: ziehen.y } : o)));
        setZiehen(null);
        return;
      }
      if (g.art !== "leer" || g.bewegt) return;
      const getippt = g.id ? objekte.find((o) => o.id === g.id) : undefined;
      if (getippt?.fest) { setHinweis(getippt.typ === "baum" ? "Bestandsbäume bleiben stehen." : `${KATALOG[getippt.typ].name}: bleibt, wo es ist.`); return; }
      if (getippt) { setAuswahl(getippt.id); setWerkzeug(null); setGeist(null); return; }
      if (!werkzeug) { setAuswahl(null); return; }
      const [x, y] = schnapp(modellPunkt(e.clientX, e.clientY));
      const neu: Geist = { typ: werkzeug, x, y, viertel, quelle: e.pointerType === "mouse" ? "maus" : "finger" };
      if (neu.quelle === "maus") bauen(neu);
      else setGeist(neu);
    },
    abbruch() {
      geste.current = null;
      setZiehen(null);
    },
    schweben(e) {
      if (!werkzeug) return;
      const [x, y] = schnapp(modellPunkt(e.clientX, e.clientY));
      setGeist((g) => (g && g.x === x && g.y === y && g.typ === werkzeug && g.viertel === viertel ? g : { typ: werkzeug, x, y, viertel, quelle: "maus" }));
    },
  });

  // Tastatur wie in Spielen: R dreht, Esc bricht ab, Strg+Z macht rückgängig.
  const tasten = useRef<(e: KeyboardEvent) => void>(() => {});
  tasten.current = (e) => {
    if ((e.target as Element).closest("input, textarea")) return;
    if (e.key === "Escape") { setGeist(null); setWerkzeug(null); setAuswahl(null); }
    else if (e.key === "r" || e.key === "R") drehenGeist();
    else if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); rueckgaengig(); }
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => tasten.current(e);
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, []);

  function drehenAuswahl() {
    if (!ausgewaehlt) return;
    const k = Math.round((ausgewaehlt.rot - phi) / 90) + 1;
    const neu = { ...ausgewaehlt, rot: rasterRot(k) };
    const grund = pruefe(neu, objekte);
    if (grund) { setHinweis(`Gedreht passt es nicht. ${GRUND_TEXT[grund]}`); return; }
    aendern(objekte.map((o) => (o.id === neu.id ? neu : o)));
  }

  function entfernen() {
    if (!ausgewaehlt) return;
    aendern(objekte.filter((o) => o.id !== ausgewaehlt.id));
    setAuswahl(null);
  }

  function zuruecksetzen() {
    aendern(bestand());
    setAuswahl(null); setWerkzeug(null); setGeist(null); setFertig(false);
  }

  // Raster für das, was gerade gesetzt oder gezogen wird.
  const gezogen = ziehen ? objekte.find((o) => o.id === ziehen.id) : undefined;
  const rasterTyp = gezogen?.typ ?? geist?.typ ?? werkzeug;
  const rasterDrehung = gezogen ? gezogen.rot : rasterRot(geist?.viertel ?? viertel);
  const gezogenId = gezogen?.id;
  const raster = useMemo(() => {
    if (!rasterTyp) return null;
    const ok = erlaubt(rasterTyp, rasterDrehung, gezogenId ? objekte.filter((o) => o.id !== gezogenId) : objekte);
    return { ja: zellPfad(zellen.filter((_, i) => ok[i])), nein: zellPfad(zellen.filter((_, i) => !ok[i])) };
  }, [rasterTyp, rasterDrehung, objekte, gezogenId]);

  const geistGrund = geist ? pruefe(geistObjekt(geist), objekte) : null;
  const geistTeuer = geist ? zuTeuer(geist.typ) : false;

  const darstellung = objekte.map((o) => (ziehen?.id === o.id ? { ...o, x: ziehen.x, y: ziehen.y } : o));
  // Kronen über alles andere legen, damit Bänke darunter sichtbar bleiben.
  const reihenfolge = [...darstellung].sort((a, b) => Number(a.typ === "baum") - Number(b.typ === "baum"));

  const szene = (interaktiv: boolean) => {
    const sGrad = interaktiv ? grad : -phi;
    const vb = interaktiv ? kam.viewBox : (() => { const q = rahmen(-phi); return `${q.x} ${q.y} ${q.w} ${q.h}`; })();
    const schrift = interaktiv && kam.kamera ? 13 / kam.kamera.s : 4.5;
    return (
      <svg
        viewBox={vb}
        className={interaktiv ? "block size-full touch-none select-none" : "block w-full"}
        {...(interaktiv
          ? {
              ...gesten,
              onPointerLeave: () => setGeist((g) => (g?.quelle === "maus" ? null : g)),
              role: "application",
              "aria-label": "Herrnstraße von oben. Objekt in der Leiste wählen, dann auf die Straße tippen.",
            }
          : { "aria-hidden": true })}
      >
        <defs>
          <clipPath id={interaktiv ? "strasse" : "strasse-karte"}><path d={welt.flaeche.map((q) => pfad(q)).join("")} /></clipPath>
          <pattern id="schraffur" width={0.5} height={0.5} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={0.5} className="stroke-blockiert/60" strokeWidth={0.12} />
          </pattern>
        </defs>
        <rect x={-1e4} y={-1e4} width={2e4} height={2e4} className="fill-cream" />
        <g ref={interaktiv ? gruppe : undefined} transform={`rotate(${sGrad} ${mitte[0]} ${mitte[1]})`}>
          <path d={welt.flaeche.map((q) => pfad(q)).join("")} className="fill-cream-dark stroke-gold-500/60" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <g clipPath={interaktiv ? "url(#strasse)" : "url(#strasse-karte)"}>
            {welt.achsen.map((a) => (
              <path key={a.osm} d={pfad(a.punkte, false)} className="fill-none stroke-ink-line" strokeWidth={FAHRGASSE} strokeLinejoin="round" />
            ))}
            {welt.achsen.map((a) => (
              <path key={`m${a.osm}`} d={pfad(a.punkte, false)} className="fill-none stroke-ink-muted/50" strokeWidth={1} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
            ))}
            {welt.achsen.filter((a) => a.einbahn).flatMap((a) => pfeile(a.punkte))}
          </g>
          {interaktiv && raster && (
            <g transform={`rotate(${phi} ${mitte[0]} ${mitte[1]})`} pointerEvents="none">
              <path d={raster.ja} className="fill-erlaubt/20 stroke-erlaubt/35" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              <path d={raster.nein} className="fill-blockiert/10 stroke-blockiert/20" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
              <path d={raster.nein} fill="url(#schraffur)" />
            </g>
          )}
          {welt.gebaeude.map((g, i) => (
            <path key={i} d={pfad(g)} className="fill-ink/85 stroke-cream" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
          ))}
          {reihenfolge.map((o) => (
            <g key={o.id} data-id={o.id} transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`}
              style={{ cursor: o.fest ? "default" : "grab" }} opacity={ziehen?.id === o.id ? 0.85 : 1}>
              <Form typ={o.typ} platzhalter={o.platzhalter} />
            </g>
          ))}
          {interaktiv && ziehen && (() => {
            const o = darstellung.find((x) => x.id === ziehen.id)!;
            return <path d={pfad(umriss(o))} className={ziehen.grund ? "fill-blockiert/25 stroke-blockiert" : "fill-none stroke-erlaubt"} strokeWidth={2.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />;
          })()}
          {interaktiv && geist && (() => {
            const o = geistObjekt(geist);
            const schlecht = !!geistGrund || geistTeuer;
            return (
              <g data-geist="" style={{ cursor: "move" }}>
                <g transform={`translate(${o.x} ${o.y}) rotate(${o.rot})`} opacity={0.8}><Form typ={o.typ} /></g>
                <path d={pfad(umriss(o))} className={schlecht ? "fill-blockiert/20 stroke-blockiert" : "fill-erlaubt/15 stroke-erlaubt"} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })()}
          {interaktiv && ausgewaehlt && !ziehen && (
            <path d={pfad(umriss(ausgewaehlt))} className="fill-none stroke-gold-700" strokeWidth={2.5} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {interaktiv && gehwegAnsicht && jetzt.engstellen.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r={0.45} className="fill-blockiert/80" pointerEvents="none" />
          ))}
        </g>
        <Beschriftung grad={sGrad} schrift={schrift} hochkant={interaktiv && hochkant} />
      </svg>
    );
  };

  const leiste = (spalte: boolean) => (
    <Leiste spalte={spalte} werkzeug={werkzeug} waehle={waehleWerkzeug} rest={rest}
      geist={geist?.quelle === "finger" ? geist : null} geistGrund={geistGrund} geistTeuer={geistTeuer}
      onBauen={() => geist && bauen(geist)} onDrehenGeist={drehenGeist} onAbbrechen={() => setGeist(null)}
      ausgewaehlt={ausgewaehlt} onDrehen={drehenAuswahl} onEntfernen={entfernen} onFertigAuswahl={() => setAuswahl(null)}
      onFertig={() => { setGeist(null); setFertig(true); erledige(STATION); }} />
  );

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <Kopf station={STATION} titel="Die Herrnstraße" unterzeile="Was gehört hierher? Unten wählen, auf die Straße tippen."
          rechts={<button type="button" onClick={zuruecksetzen} className="mt-1 shrink-0 rounded-[10px] border border-ink-line px-2.5 py-1 text-[13px] text-ink-soft">Neu anfangen</button>} />
        <Anzeigen heute={heute} jetzt={jetzt} className="md:hidden" gehweg={gehwegAnsicht} setGehweg={setGehwegAnsicht} />
        <div ref={kam.buehne} className="relative min-h-0 flex-1 overflow-hidden">
          {kam.viewBox && szene(true)}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Kartenknopf label="Vergrößern" onClick={() => kam.zoomeMitte(1.5)}>+</Kartenknopf>
            <Kartenknopf label="Verkleinern" onClick={() => kam.zoomeMitte(1 / 1.5)}>−</Kartenknopf>
            <Kartenknopf label="Rückgängig" onClick={rueckgaengig} aus={!verlauf.length}>↶</Kartenknopf>
          </div>
          {werkzeug && !geist && (
            <p className="pointer-events-none absolute top-3 left-3 max-w-[60%] rounded-[10px] bg-cream/95 px-3 py-1.5 text-[13px] shadow-sm">
              <span className="pointer-fine:hidden">Grün heißt: passt. Tippen setzt eine Vorschau.</span>
              <span className="pointer-coarse:hidden">Grün heißt: passt. Klicken baut.</span>
            </p>
          )}
          <p role="status" className={`pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-[10px] bg-ink px-4 py-2.5 text-center text-sm text-cream shadow-lg transition-opacity ${hinweis ? "opacity-100" : "opacity-0"}`}>
            {hinweis}
          </p>
        </div>
        <div className="md:hidden">{leiste(false)}</div>
      </div>
      <aside className="hidden w-[22rem] shrink-0 flex-col border-l border-ink-line md:flex">
        <Anzeigen heute={heute} jetzt={jetzt} spalte gehweg={gehwegAnsicht} setGehweg={setGehwegAnsicht} />
        <p className="border-b border-ink-line px-4 py-2.5 text-[12.5px] text-ink-muted">
          Klicken baut, <kbd className="font-sans font-semibold">R</kbd> dreht, <kbd className="font-sans font-semibold">Esc</kbd> bricht ab,
          Mausrad zoomt, Ziehen auf freier Fläche verschiebt.
        </p>
        {leiste(true)}
      </aside>
      {fertig && <Postkarte heute={heute} jetzt={jetzt} karte={szene(false)} onWeiter={() => setFertig(false)} onNeu={zuruecksetzen} />}
    </div>
  );
}

/** Einbahn-Pfeile alle 24 m in Wegrichtung. */
function pfeile(pts: P[]) {
  const out: ReactElement[] = [];
  let ab = 12;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const l = Math.hypot(bx - ax, by - ay);
    const w = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    let t = ab;
    for (; t < l; t += 24) {
      out.push(
        <path key={`${i}-${t}`} transform={`translate(${ax + ((bx - ax) * t) / l} ${ay + ((by - ay) * t) / l}) rotate(${w})`}
          d="M-1.1 -0.55 L0.6 0 L-1.1 0.55 Z" className="fill-ink-muted/60" />,
      );
    }
    ab = t - l;
  }
  return out;
}

/** Ortsname ungedreht am Westende; dort liegt der Stadtplatz. Nach der
 *  Drehung zeigt Osten nach unten (hochkant) bzw. nach rechts (quer). */
function Beschriftung({ grad, schrift, hochkant }: { grad: number; schrift: number; hochkant: boolean }) {
  const west = welt.flaeche.flat().reduce((a, b) => (a[0] < b[0] ? a : b));
  const [x, y] = drehe(west, grad);
  return (
    <text x={hochkant ? x : x - schrift * 0.5} y={hochkant ? y - schrift * 1.2 : y} fontSize={schrift}
      textAnchor={hochkant ? "middle" : "end"} className="fill-ink-soft font-sans" style={{ fontWeight: 600 }} pointerEvents="none">
      {hochkant ? "↑ Stadtplatz" : "← Stadtplatz"}
    </text>
  );
}

function differenz(n: number, einheit = "") {
  if (Math.round(n) === 0) return "wie heute";
  return `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n))}${einheit} zu heute`;
}

function Anzeigen({ heute, jetzt, spalte, className = "", gehweg, setGehweg }: {
  heute: Kennzahlen; jetzt: Kennzahlen; spalte?: boolean; className?: string; gehweg: boolean; setGehweg: (b: boolean) => void;
}) {
  const rest = BUDGET - jetzt.kosten;
  const werte = [
    { name: "Sitzplätze", wert: String(jetzt.sitze), diff: differenz(jetzt.sitze - heute.sitze) },
    { name: "Stellplätze", wert: String(jetzt.stellplaetze), diff: differenz(jetzt.stellplaetze - heute.stellplaetze) },
    { name: "Schatten", wert: `${Math.round(jetzt.schatten * 100)} %`, diff: differenz((jetzt.schatten - heute.schatten) * 100, " Pkt.") },
  ];
  return (
    <section aria-label="Kennzahlen" className={`shrink-0 border-b border-ink-line px-4 py-2.5 ${spalte ? "grid gap-3 py-4" : ""} ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold">Budget</span>
        <span className="text-[13px] text-ink-soft [font-variant-numeric:lining-nums_tabular-nums]">{rest} von {BUDGET} Punkten übrig</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-line" role="meter" aria-valuemin={0} aria-valuemax={BUDGET} aria-valuenow={rest} aria-label="Budget übrig">
        <div className="h-full rounded-full bg-gold-700 transition-[width]" style={{ width: `${(rest / BUDGET) * 100}%` }} />
      </div>
      <dl className={`mt-2.5 grid gap-x-3 gap-y-2 ${spalte ? "grid-cols-2" : "grid-cols-4"}`}>
        {werte.map((w) => (
          <div key={w.name} className="min-w-0">
            <dt className="truncate text-[11.5px] leading-tight text-ink-soft">{w.name}</dt>
            <dd className="font-display text-xl leading-tight font-semibold [font-variant-numeric:lining-nums_tabular-nums]">{w.wert}</dd>
            <dd className="truncate text-[11px] leading-tight text-ink-muted">{w.diff}</dd>
          </div>
        ))}
        {/* Die eine Kennzahl, die sich als Kartenansicht zeigen lässt. */}
        <div className="min-w-0">
          <dt className="truncate text-[11.5px] leading-tight text-ink-soft">Gehweg frei</dt>
          <dd>
            <button type="button" aria-pressed={gehweg} onClick={() => setGehweg(!gehweg)}
              className={`-mx-1 rounded-md px-1 text-left font-display text-xl leading-tight font-semibold [font-variant-numeric:lining-nums_tabular-nums] ${gehweg ? "bg-blockiert/10 text-blockiert" : "underline decoration-ink-line decoration-dotted underline-offset-4"}`}>
              {Math.round(jetzt.gehweg * 100)} %
            </button>
          </dd>
          <dd className="truncate text-[11px] leading-tight text-ink-muted">{gehweg ? "Engstellen rot" : "antippen: Engstellen"}</dd>
        </div>
      </dl>
    </section>
  );
}

type LeisteProps = {
  werkzeug: Typ | null; waehle: (t: Typ | null) => void; rest: number;
  geist: Geist | null; geistGrund: Grund | null; geistTeuer: boolean;
  onBauen: () => void; onDrehenGeist: () => void; onAbbrechen: () => void;
  ausgewaehlt: Objekt | null; onDrehen: () => void; onEntfernen: () => void; onFertigAuswahl: () => void; onFertig: () => void;
  spalte: boolean;
};

function Leiste(p: LeisteProps) {
  const rand = "shrink-0 border-t border-ink-line bg-cream px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]";
  if (p.geist) {
    const art = KATALOG[p.geist.typ];
    const status = p.geistTeuer ? `Zu teuer: ${p.rest} Punkte übrig.` : p.geistGrund ? GRUND_TEXT[p.geistGrund] : "Passt hierhin. Zum Feinjustieren ziehen.";
    return (
      <div className={rand}>
        <p className="text-sm"><span className="font-semibold">{art.name}</span><span className="text-ink-soft"> · {art.kosten} Punkte</span></p>
        <p className={`mt-0.5 text-[13px] ${p.geistGrund || p.geistTeuer ? "text-blockiert" : "text-ink-soft"}`}>{status}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Knopf onClick={p.onBauen} stark aus={!!p.geistGrund || p.geistTeuer}>Bauen ✓</Knopf>
          {!("kreis" in art.form) && <Knopf onClick={p.onDrehenGeist}>Drehen</Knopf>}
          <Knopf onClick={p.onAbbrechen}>Abbrechen</Knopf>
        </div>
      </div>
    );
  }
  if (p.ausgewaehlt) {
    const art = KATALOG[p.ausgewaehlt.typ];
    return (
      <div className={rand}>
        <p className="text-sm">
          <span className="font-semibold">{art.name}</span>
          <span className="text-ink-soft">
            {p.ausgewaehlt.platzhalter ? " · geschätzt aus OpenStreetMap" : p.ausgewaehlt.bestand ? " · steht heute schon hier" : ` · ${art.kosten} Punkte`}
          </span>
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft">Zum Verschieben ziehen.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!("kreis" in art.form) && <Knopf onClick={p.onDrehen}>Drehen</Knopf>}
          <Knopf onClick={p.onEntfernen}>Entfernen</Knopf>
          <Knopf onClick={p.onFertigAuswahl} stark>Fertig</Knopf>
        </div>
      </div>
    );
  }
  return (
    <div className={`shrink-0 border-t border-ink-line bg-cream pb-[max(0.5rem,env(safe-area-inset-bottom))] ${p.spalte ? "flex min-h-0 flex-1 flex-col border-t-0" : ""}`}>
      <ul className={p.spalte ? "grid grid-cols-2 gap-2 overflow-auto p-4" : "flex gap-1.5 overflow-x-auto px-3 pt-2.5 pb-1.5"} aria-label="Was möchtest du hinstellen?">
        {ANGEBOT.map((t) => {
          const art = KATALOG[t];
          const aktiv = p.werkzeug === t;
          return (
            <li key={t} className="shrink-0">
              <button type="button" aria-pressed={aktiv} onClick={() => p.waehle(aktiv ? null : t)}
                className={`flex w-full flex-col items-center gap-1 rounded-[10px] border px-2 pt-2 pb-1.5 text-center ${p.spalte ? "" : "w-[4.75rem]"} ${aktiv ? "border-ink bg-ink text-cream" : "border-ink-line bg-cream"} ${art.kosten > p.rest && !aktiv ? "opacity-45" : ""}`}>
                <span className={`grid size-10 place-items-center rounded-lg ${aktiv ? "bg-cream" : ""}`}><Vorschau typ={t} /></span>
                <span className="text-[12px] leading-tight font-semibold">{art.name}</span>
                <span className={`text-[11px] leading-none ${aktiv ? "text-cream/75" : "text-ink-muted"}`}>{art.kosten} Pkt.</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className={`flex items-center justify-between gap-3 px-4 ${p.spalte ? "mt-auto border-t border-ink-line py-4" : "pt-1"}`}>
        <p className="text-[12px] text-ink-muted">Stellplätze vorläufig geschätzt.</p>
        <Knopf onClick={p.onFertig} stark>Entwurf abgeben</Knopf>
      </div>
    </div>
  );
}

function Postkarte({ heute, jetzt, karte, onWeiter, onNeu }: { heute: Kennzahlen; jetzt: Kennzahlen; karte: ReactNode; onWeiter: () => void; onNeu: () => void }) {
  const zeilen = [
    ["Sitzplätze", jetzt.sitze - heute.sitze, ""],
    ["Stellplätze", jetzt.stellplaetze - heute.stellplaetze, ""],
    ["Radplätze", jetzt.radplaetze - heute.radplaetze, ""],
    ["Bäume", jetzt.baeume - heute.baeume, ""],
    ["Schatten", Math.round((jetzt.schatten - heute.schatten) * 100), " Prozentpunkte"],
    ["Gehweg frei", Math.round((jetzt.gehweg - heute.gehweg) * 100), " Prozentpunkte"],
  ] as const;
  return (
    <div className="fixed inset-0 z-10 grid place-items-end bg-ink/40 md:place-items-center" role="dialog" aria-modal="true" aria-labelledby="postkarte-titel">
      <div className="max-h-[92dvh] w-full overflow-auto rounded-t-[14px] bg-cream md:max-w-xl md:rounded-[14px]">
        <PostkartenStripe />
        <div className="grid gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="text-[13px] font-semibold text-gold-700">Station {STATION} geschafft</p>
            <h2 id="postkarte-titel" className="font-display text-2xl leading-tight font-semibold">Deine Herrnstraße</h2>
          </div>
          <div className="overflow-hidden rounded-[10px] border border-ink-line">{karte}</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            {zeilen.map(([name, d, e]) => (
              <div key={name} className="contents">
                <dt className="text-ink-soft">{name}</dt>
                <dd className="text-right font-semibold [font-variant-numeric:lining-nums_tabular-nums]">
                  {d === 0 ? "wie heute" : `${d > 0 ? "+" : "−"}${Math.abs(d)}${e}`}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-soft">
            Im fertigen Rundgang wird dein Entwurf hier gespeichert und mit allen anderen zu einer gemeinsamen Karte zusammengelegt.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="#start" className="rounded-[10px] bg-gold-700 px-3.5 py-2 text-sm font-semibold text-cream">Zur Übersicht</a>
            <Knopf onClick={onWeiter}>Weiterbauen</Knopf>
            <Knopf onClick={onNeu}>Neu anfangen</Knopf>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostkartenStripe() {
  const { erledigt } = useRundgang();
  return <Stripe erledigt={erledigt} />;
}
