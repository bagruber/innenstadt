import { useEffect, useRef, useState, type ComponentType } from "react";
import { Armchair, Heart, SpeakerHigh, ThermometerHot, Warning, Wheelchair, type IconProps } from "@phosphor-icons/react";
import { useKamera, type Groesse } from "@/karte/kamera";
import { ortVon } from "@/karte/altstadt";
import { Altstadtkarte, RAHMEN, modellPunkt, stadtplatz } from "@/karte/Altstadtkarte";
import { Geschafft, Kartenknopf, Knopf, Kopf, useHinweis } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 3;
const SPEICHER = "pins-1";

// Farbe nach Gegenstand (K1): Mitmachen gold, Begegnung aubergine, Umwelt und
// Klima tannengrün, Feste und Nachtleben tiefrot, Wege isarpetrol, Bauen und
// Boden erdbraun. Das Symbol trägt die Bedeutung, die Farbe stützt sie.
const ARTEN: { id: string; name: string; Symbol: ComponentType<IconProps>; fuell: string; feld: string }[] = [
  { id: "schoen", name: "Hier ist es schön", Symbol: Heart, fuell: "fill-gold-700", feld: "bg-gold-700" },
  { id: "sitzen", name: "Hier fehlt was zum Sitzen", Symbol: Armchair, fuell: "fill-thema-aubergine", feld: "bg-thema-aubergine" },
  { id: "heiss", name: "Im Sommer zu heiß", Symbol: ThermometerHot, fuell: "fill-thema-tannengruen", feld: "bg-thema-tannengruen" },
  { id: "laut", name: "Hier ist es zu laut", Symbol: SpeakerHigh, fuell: "fill-thema-tiefrot", feld: "bg-thema-tiefrot" },
  { id: "unsicher", name: "Hier fühle ich mich unsicher", Symbol: Warning, fuell: "fill-thema-isarpetrol", feld: "bg-thema-isarpetrol" },
  { id: "barriere", name: "Hier komme ich schlecht durch", Symbol: Wheelchair, fuell: "fill-thema-erdbraun", feld: "bg-thema-erdbraun" },
];
const art = Object.fromEntries(ARTEN.map((a) => [a.id, a]));

type Pin = { id: string; typ: string; x: number; y: number; notiz: string };

function laden(): { pins: Pin[]; fertig: boolean } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { pins: [], fertig: false };
}

let zaehler = 0;
const neueId = () => `p${Date.now().toString(36)}${(zaehler++).toString(36)}`;

export default function Pins() {
  const [stand, setStand] = useState(laden);
  const { pins, fertig } = stand;
  const [werkzeug, setWerkzeug] = useState(ARTEN[0].id);
  const [auswahl, setAuswahl] = useState<string | null>(null);
  const [hinweis, zeige] = useHinweis();
  const gruppe = useRef<SVGGElement>(null);
  const tipp = useRef<{ pin: string | null; cx: number; cy: number; lx: number; ly: number; bewegt: boolean } | null>(null);
  const { erledige } = useRundgang();

  const start = (b: Groesse) => {
    const s = b.w < b.h ? b.w / 240 : b.h / 380;
    return { s, x: stadtplatz[0] - b.w / s / 2, y: stadtplatz[1] - b.h / s / 2 };
  };
  const kam = useKamera(RAHMEN, start, "fest", 30);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (fertig) erledige(STATION); }, [fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  const setzePins = (neu: Pin[]) => setStand((s) => ({ ...s, pins: neu }));

  const gesten = kam.gesten({
    runter(e) {
      const ziel = (e.target as Element).closest("[data-pin]");
      tipp.current = { pin: ziel?.getAttribute("data-pin") ?? null, cx: e.clientX, cy: e.clientY, lx: e.clientX, ly: e.clientY, bewegt: false };
    },
    bewegen(e) {
      const t = tipp.current;
      if (!t) return;
      if (!t.bewegt && Math.hypot(e.clientX - t.cx, e.clientY - t.cy) < 6) return;
      t.bewegt = true;
      kam.verschiebe(e.clientX - t.lx, e.clientY - t.ly);
      t.lx = e.clientX; t.ly = e.clientY;
    },
    hoch(e) {
      const t = tipp.current;
      tipp.current = null;
      if (!t || t.bewegt || fertig) return;
      if (t.pin) { setAuswahl(t.pin); return; }
      const [x, y] = modellPunkt(gruppe.current!, e.clientX, e.clientY);
      const pin = { id: neueId(), typ: werkzeug, x, y, notiz: "" };
      setzePins([...pins, pin]);
      setAuswahl(null);
      const ort = ortVon([x, y]);
      zeige(`${art[werkzeug].name}${ort ? `, bei ${ort}` : ""}`);
    },
    abbruch() { tipp.current = null; },
  });

  const gewaehlt = pins.find((p) => p.id === auswahl) ?? null;
  const k = kam.kamera ? 1 / kam.kamera.s : 0.3; // Meter pro Pixel: Pins bleiben gleich groß
  const schrift = kam.kamera ? 11.5 / kam.kamera.s : 5;

  const karteSvg = kam.viewBox && (
    <svg viewBox={kam.viewBox} className="block size-full touch-none select-none" {...gesten}
      role="application" aria-label="Altstadtkarte. Art wählen, dann auf die Karte tippen, um einen Pin zu setzen.">
      <Altstadtkarte gruppeRef={gruppe} schrift={schrift}
        oben={pins.map((p) => {
          const a = art[p.typ];
          return (
            <g key={p.id} data-pin={p.id} transform={`translate(${p.x} ${p.y}) scale(${k})`} style={{ cursor: "pointer" }}>
              <path d="M0 0 L-7 -14 A15 15 0 1 1 7 -14 Z" className={`${a.fuell} stroke-cream`} strokeWidth={p.id === auswahl ? 3 : 1.5} />
              <a.Symbol x={-9} y={-35} size={18} weight="bold" color="#faf7f2" />
            </g>
          );
        })} />
    </svg>
  );

  const zaehle = (id: string) => pins.filter((p) => p.typ === id).length;

  const blatt = fertig ? (
    <Geschafft station={STATION} titel="Deine Gefühlskarte" onAendern={() => setStand({ ...stand, fertig: false })}>
      <ul className="grid gap-1.5 text-sm">
        {ARTEN.filter((a) => zaehle(a.id)).map((a) => {
          const orte = [...new Set(pins.filter((p) => p.typ === a.id).map((p) => ortVon([p.x, p.y])).filter(Boolean))];
          return (
            <li key={a.id} className="flex items-start gap-2">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${a.feld}`}><a.Symbol size={12} weight="bold" color="#faf7f2" /></span>
              <span><span className="font-semibold">{a.name}</span> · {zaehle(a.id)}{orte.length ? <span className="text-ink-soft">: {orte.slice(0, 3).join(", ")}</span> : null}</span>
            </li>
          );
        })}
        {!pins.length && <li className="text-ink-soft">Keine Pins gesetzt.</li>}
      </ul>
      <p className="text-sm text-ink-soft">Im fertigen Rundgang werden alle Pins zu Wärmekarten je Art.</p>
    </Geschafft>
  ) : gewaehlt ? (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className={`grid size-6 place-items-center rounded-full ${art[gewaehlt.typ].feld}`}>{(() => { const S = art[gewaehlt.typ].Symbol; return <S size={14} weight="bold" color="#faf7f2" />; })()}</span>
        {art[gewaehlt.typ].name}
      </p>
      <label className="grid gap-1 text-sm font-semibold" htmlFor="pin-notiz">
        Was ist hier? <span className="font-normal text-ink-muted">(freiwillig)</span>
        <textarea id="pin-notiz" maxLength={200} rows={2} value={gewaehlt.notiz}
          onChange={(e) => setzePins(pins.map((p) => (p.id === gewaehlt.id ? { ...p, notiz: e.target.value } : p)))}
          className="rounded-md border border-ink-line bg-cream px-2.5 py-2 font-normal" />
      </label>
      <div className="flex gap-2">
        <Knopf onClick={() => setAuswahl(null)} stark>Fertig</Knopf>
        <Knopf onClick={() => { setzePins(pins.filter((p) => p.id !== gewaehlt.id)); setAuswahl(null); }}>Entfernen</Knopf>
      </div>
    </div>
  ) : (
    <div className="grid gap-3">
      <div>
        <h2 className="font-display text-xl leading-snug font-semibold text-balance">Wie fühlt sich die Altstadt an?</h2>
        <p className="mt-0.5 text-sm text-ink-soft">Wähle aus, was du sagen willst, und tippe auf die Stelle. So viele Pins, wie du magst.</p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5" aria-label="Was willst du markieren?">
        {ARTEN.map((a) => (
          <li key={a.id}>
            <button type="button" aria-pressed={werkzeug === a.id} onClick={() => setWerkzeug(a.id)}
              className={`flex w-full items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left text-[13px] leading-tight ${werkzeug === a.id ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${a.feld}`}><a.Symbol size={15} weight="bold" color="#faf7f2" /></span>
              <span className="min-w-0 flex-1 font-semibold">{a.name}</span>
              {zaehle(a.id) > 0 && <span className="text-[12px] [font-variant-numeric:lining-nums_tabular-nums]">{zaehle(a.id)}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div><Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf></div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-cream text-ink md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <Kopf station={STATION} titel="Gefühlskarte" />
        <div ref={kam.buehne} className="relative min-h-0 flex-1 overflow-hidden">
          {karteSvg}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            <Kartenknopf label="Vergrößern" onClick={() => kam.zoomeMitte(1.5)}>+</Kartenknopf>
            <Kartenknopf label="Verkleinern" onClick={() => kam.zoomeMitte(1 / 1.5)}>−</Kartenknopf>
          </div>
          {hinweis}
        </div>
      </div>
      <div className="max-h-[48dvh] shrink-0 overflow-auto border-t border-ink-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:flex md:max-h-none md:w-[22rem] md:flex-col md:gap-4 md:border-t-0 md:border-l md:p-4">{blatt}</div>
    </div>
  );
}

