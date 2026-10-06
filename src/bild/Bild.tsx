import { useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from "react";
import { Geschafft, Knopf, Kopf } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 9;
const SPEICHER = "bild-1";
const W = 800, H = 600;
const HORIZONT = 285; // Straßenniveau am Fluchtpunkt
const FP: [number, number] = [400, 250]; // Fluchtpunkt

type Pkt = [number, number];
type Strich = { stift: "gut" | "stoert"; punkte: Pkt[] };
type Sticker = { id: string; typ: StickerTyp; x: number; y: number };
type StickerTyp = "baum" | "bank" | "segel" | "kuebel" | "laterne" | "rad";
type Stand = { striche: Strich[]; sticker: Sticker[]; fertig: boolean };

const STIFTE = {
  gut: { name: "Gefällt mir", klasse: "stroke-gold-500", feld: "bg-gold-500" },
  stoert: { name: "Stört mich", klasse: "stroke-blockiert", feld: "bg-blockiert" },
} as const;

const STICKER: Record<StickerTyp, string> = {
  baum: "Baum", bank: "Bank", segel: "Sonnensegel", kuebel: "Pflanzkübel", laterne: "Laterne", rad: "Radbügel",
};

/** Wie groß etwas am Boden bei y wirkt: am Horizont winzig, vorn groß. */
export const massstab = (y: number) => Math.min(1.15, Math.max(0.08, (y - HORIZONT) / (H - HORIZONT)));

function laden(): Stand {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { striche: [], sticker: [], fertig: false };
}

let zaehler = 0;
const neueId = () => `s${Date.now().toString(36)}${(zaehler++).toString(36)}`;

export default function Bild() {
  const [stand, setStand] = useState(laden);
  const [verlauf, setVerlauf] = useState<Stand[]>([]);
  const [modus, setModus] = useState<"markieren" | "stellen">("markieren");
  const [stift, setStift] = useState<"gut" | "stoert">("gut");
  const [auswahl, setAuswahl] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const zug = useRef<{ art: "strich" | "sticker"; id?: string; dx: number; dy: number } | null>(null);
  const { erledige } = useRundgang();

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (stand.fertig) erledige(STATION); }, [stand.fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  const merke = () => setVerlauf((v) => [...v.slice(-29), stand]);
  const punkt = (e: RPE): Pkt => {
    const pt = svg.current!.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = pt.matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return [m.x, m.y];
  };
  const amBoden = (y: number) => Math.max(HORIZONT + 6, Math.min(H, y));

  function runter(e: RPE<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = punkt(e);
    const st = (e.target as Element).closest("[data-sticker]")?.getAttribute("data-sticker");
    if (modus === "stellen") {
      const s = stand.sticker.find((q) => q.id === st);
      setAuswahl(s?.id ?? null);
      if (s) { merke(); zug.current = { art: "sticker", id: s.id, dx: s.x - x, dy: s.y - y }; }
      return;
    }
    merke();
    zug.current = { art: "strich", dx: 0, dy: 0 };
    setStand((s) => ({ ...s, striche: [...s.striche, { stift, punkte: [[x, y]] }] }));
  }

  function bewegen(e: RPE<SVGSVGElement>) {
    const z = zug.current;
    if (!z) return;
    const [x, y] = punkt(e);
    if (z.art === "strich") {
      setStand((s) => {
        const letzte = s.striche[s.striche.length - 1];
        return { ...s, striche: [...s.striche.slice(0, -1), { ...letzte, punkte: [...letzte.punkte, [x, y]] }] };
      });
    } else {
      setStand((s) => ({ ...s, sticker: s.sticker.map((q) => (q.id === z.id ? { ...q, x: x + z.dx, y: amBoden(y + z.dy) } : q)) }));
    }
  }

  function stelle(typ: StickerTyp) {
    merke();
    const neu = { id: neueId(), typ, x: W / 2, y: 520 };
    setStand((s) => ({ ...s, sticker: [...s.sticker, neu] }));
    setAuswahl(neu.id);
  }

  function rueckgaengig() {
    if (!verlauf.length) return;
    setStand(verlauf[verlauf.length - 1]);
    setVerlauf(verlauf.slice(0, -1));
  }

  // Sticker von hinten nach vorn zeichnen: was näher ist, verdeckt.
  const reihe = [...stand.sticker].sort((a, b) => a.y - b.y);
  const gewaehlt = stand.sticker.find((s) => s.id === auswahl);

  const zeichnung = (mitAuswahl: boolean) => (
    <>
      {stand.striche.map((s, i) => (
        <polyline key={i} points={s.punkte.map((p) => p.join(",")).join(" ")} className={`fill-none ${STIFTE[s.stift].klasse}`}
          strokeWidth={22} strokeOpacity={0.45} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {reihe.map((s) => (
        <g key={s.id} data-sticker={s.id} transform={`translate(${s.x} ${s.y}) scale(${massstab(s.y)})`} style={{ cursor: modus === "stellen" ? "grab" : undefined }}>
          <StickerForm typ={s.typ} />
          {mitAuswahl && s.id === auswahl && <rect x={-70} y={-220} width={140} height={230} className="fill-none stroke-gold-700" strokeWidth={3} strokeDasharray="10 6" vectorEffect="non-scaling-stroke" />}
        </g>
      ))}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf station={STATION} titel="Im Bild" />
      <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 px-4 py-5">
        {stand.fertig ? (
          <Geschafft station={STATION} titel="Dein Bild" onAendern={() => setStand({ ...stand, fertig: false })}>
            <BildFlaeche><svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">{zeichnung(false)}</svg></BildFlaeche>
            <p className="text-sm">
              {stand.striche.filter((s) => s.stift === "gut").length} Mal markiert, was dir gefällt, {stand.striche.filter((s) => s.stift === "stoert").length} Mal, was stört.
              {stand.sticker.length ? ` Hineingestellt: ${[...new Set(stand.sticker.map((s) => STICKER[s.typ]))].join(", ")}.` : ""}
            </p>
            <p className="text-sm text-ink-soft">Im fertigen Rundgang liegen alle Markierungen übereinander und zeigen, worauf sich die Blicke treffen.</p>
          </Geschafft>
        ) : (
          <>
            <div>
              <h2 className="font-display text-xl leading-snug font-semibold text-balance">Was fällt dir auf, und was fehlt?</h2>
              <p className="mt-0.5 text-sm text-ink-soft">Markiere im Bild, was dir gefällt oder stört. Oder stell Dinge hinein, die du dir hier wünschst.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-[10px] border border-ink-line p-0.5" role="group" aria-label="Modus">
                {(["markieren", "stellen"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={modus === m} onClick={() => { setModus(m); setAuswahl(null); }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${modus === m ? "bg-ink text-cream" : ""}`}>
                    {m === "markieren" ? "Markieren" : "Hineinstellen"}
                  </button>
                ))}
              </div>
              <Knopf onClick={rueckgaengig} aus={!verlauf.length}>↶ Rückgängig</Knopf>
            </div>
            {modus === "markieren" ? (
              <div className="flex gap-1.5" role="group" aria-label="Stift">
                {(["gut", "stoert"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={stift === s} onClick={() => setStift(s)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${stift === s ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
                    <span className={`h-2.5 w-6 rounded-full opacity-70 ${STIFTE[s].feld}`} aria-hidden="true" />{STIFTE[s].name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Was stellst du hinein?">
                {(Object.keys(STICKER) as StickerTyp[]).map((t) => (
                  <button key={t} type="button" onClick={() => stelle(t)} className="flex items-center gap-1.5 rounded-full border border-ink-line py-1 pr-3 pl-1 text-sm">
                    <svg viewBox="-60 -210 120 215" className="size-7" aria-hidden="true"><StickerForm typ={t} /></svg>{STICKER[t]}
                  </button>
                ))}
              </div>
            )}
            <BildFlaeche>
              <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={`absolute inset-0 size-full touch-none select-none ${modus === "markieren" ? "cursor-crosshair" : ""}`}
                onPointerDown={runter} onPointerMove={bewegen} onPointerUp={() => (zug.current = null)} onPointerCancel={() => (zug.current = null)}
                role="application" aria-label={modus === "markieren" ? "Bild. Mit dem Finger markieren." : "Bild. Dinge hineinstellen und verschieben."}>
                {zeichnung(true)}
              </svg>
            </BildFlaeche>
            {gewaehlt && modus === "stellen" && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{STICKER[gewaehlt.typ]}</span><span className="text-ink-soft">· zum Verschieben ziehen</span>
                <Knopf onClick={() => { merke(); setStand({ ...stand, sticker: stand.sticker.filter((s) => s.id !== gewaehlt.id) }); setAuswahl(null); }}>Entfernen</Knopf>
              </div>
            )}
            <div><Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf></div>
          </>
        )}
      </main>
    </div>
  );
}

/** Die Straßenskizze als Platzhalter, bis ein Foto der Herrnstraße da ist. */
function BildFlaeche({ children }: { children: ReactNode }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] border border-ink-line bg-cream">
      <Skizze />
      {children}
      <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-cream/90 px-2 py-1 text-[11.5px] text-ink-soft">Skizze. Hier kommt ein Foto der Herrnstraße hin.</p>
    </div>
  );
}

const lerp = (a: Pkt, b: Pkt, t: number): Pkt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function Fassade({ aussenOben, aussenUnten, innenOben, innenUnten }: { aussenOben: Pkt; aussenUnten: Pkt; innenOben: Pkt; innenUnten: Pkt }) {
  const fenster: Pkt[][] = [];
  // Perspektivisch dichter werdende Spalten
  const spalten = [0.06, 0.3, 0.48, 0.62, 0.72, 0.8];
  for (let i = 0; i < spalten.length - 1; i++) {
    const t0 = spalten[i] + 0.04, t1 = spalten[i + 1] - 0.02;
    for (const [v0, v1] of [[0.12, 0.27], [0.36, 0.51]] as const) {
      const ecke = (t: number, v: number) => lerp(lerp(aussenOben, innenOben, t), lerp(aussenUnten, innenUnten, t), v);
      fenster.push([ecke(t0, v0), ecke(t1, v0), ecke(t1, v1), ecke(t0, v1)]);
    }
  }
  const d = (q: Pkt[]) => "M" + q.map((p) => p.join(" ")).join("L") + "Z";
  return (
    <g>
      <path d={d([aussenOben, innenOben, innenUnten, aussenUnten])} className="fill-cream-dark stroke-ink" strokeWidth={1.5} />
      {spalten.slice(1, -1).map((t, i) => <line key={i} x1={lerp(aussenOben, innenOben, t)[0]} y1={lerp(aussenOben, innenOben, t)[1]} x2={lerp(aussenUnten, innenUnten, t)[0]} y2={lerp(aussenUnten, innenUnten, t)[1]} className="stroke-ink/40" strokeWidth={1} />)}
      {fenster.map((q, i) => <path key={i} d={d(q)} className="fill-cream stroke-ink/70" strokeWidth={1} />)}
    </g>
  );
}

function Skizze() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
      <rect width={W} height={H} className="fill-cream" />
      <path d={`M0 560 L340 ${HORIZONT} L460 ${HORIZONT} L800 560 L800 600 L0 600Z`} className="fill-ink-line/60" />
      <rect x={340} y={150} width={120} height={HORIZONT - 150} className="fill-cream-dark stroke-ink" strokeWidth={1.5} />
      <path d="M340 150 L400 108 L460 150" className="fill-cream-dark stroke-ink" strokeWidth={1.5} />
      <rect x={388} y={225} width={24} height={HORIZONT - 225} className="fill-cream stroke-ink/70" strokeWidth={1} />
      <Fassade aussenOben={[0, 10]} aussenUnten={[0, 560]} innenOben={[340, 196]} innenUnten={[340, HORIZONT]} />
      <Fassade aussenOben={[800, 30]} aussenUnten={[800, 560]} innenOben={[460, 200]} innenUnten={[460, HORIZONT]} />
      {/* Bordsteine und Fahrgasse zum Fluchtpunkt */}
      <path d={`M150 600 L372 ${HORIZONT}`} className="stroke-ink/50" strokeWidth={1.5} />
      <path d={`M650 600 L428 ${HORIZONT}`} className="stroke-ink/50" strokeWidth={1.5} />
      <path d={`M400 600 L${FP[0]} ${HORIZONT}`} className="stroke-ink/30" strokeWidth={1.5} strokeDasharray="14 12" />
    </svg>
  );
}

/** Frontansicht, Fußpunkt bei (0, 0), Höhe bei Maßstab 1 bis 200 Einheiten. */
function StickerForm({ typ }: { typ: StickerTyp }) {
  const linie = { strokeWidth: 3, vectorEffect: "non-scaling-stroke" as const };
  switch (typ) {
    case "baum":
      return (<><rect x={-8} y={-90} width={16} height={90} className="fill-thema-erdbraun" /><circle cy={-140} r={58} className="fill-thema-tannengruen/85 stroke-ink" {...linie} /></>);
    case "bank":
      return (<><rect x={-60} y={-38} width={120} height={10} className="fill-thema-aubergine" /><rect x={-60} y={-62} width={120} height={9} className="fill-thema-aubergine" /><path d="M-50 -28 V0 M50 -28 V0" className="fill-none stroke-ink" {...linie} /></>);
    case "segel":
      return (<><path d="M-55 0 V-170 M55 0 V-150" className="fill-none stroke-ink" {...linie} /><path d="M-55 -170 L55 -150 L-10 -120 Z" className="fill-cream-dark stroke-ink" {...linie} /></>);
    case "kuebel":
      return (<><rect x={-35} y={-40} width={70} height={40} className="fill-thema-erdbraun/80" /><circle cx={-15} cy={-55} r={22} className="fill-thema-tannengruen/85" /><circle cx={15} cy={-58} r={24} className="fill-thema-tannengruen/85" /></>);
    case "laterne":
      return (<><path d="M0 0 V-185" className="fill-none stroke-ink" {...linie} /><path d="M-14 -185 H14 L8 -205 H-8 Z" className="fill-gold-500 stroke-ink" {...linie} /></>);
    case "rad":
      return (<>{[-35, 0, 35].map((x) => <path key={x} d={`M${x - 12} 0 V-40 A12 12 0 0 1 ${x + 12} -40 V0`} className="fill-none stroke-thema-isarpetrol" strokeWidth={4} vectorEffect="non-scaling-stroke" />)}</>);
  }
}
