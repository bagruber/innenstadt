import type { Typ } from "./katalog";

// Draufsicht, in Metern um den Mittelpunkt, Länge entlang x.
// Farbe nach Gegenstand (Kanon K1): Natur tannengrün, Wege isarpetrol,
// Begegnung aubergine.
const linie = { vectorEffect: "non-scaling-stroke" as const };

export function Form({ typ, platzhalter }: { typ: Typ; platzhalter?: boolean }) {
  switch (typ) {
    case "stellplatz":
      return (
        <>
          <rect x={-2.5} y={-1.1} width={5} height={2.2} className="fill-thema-isarpetrol/8 stroke-thema-isarpetrol/50"
            strokeWidth={1} strokeDasharray={platzhalter ? "3 2" : undefined} {...linie} />
          <rect x={-2.05} y={-0.82} width={4.1} height={1.64} rx={0.55}
            className={platzhalter ? "fill-thema-isarpetrol/45" : "fill-thema-isarpetrol/85"} />
          <rect x={0.35} y={-0.62} width={0.75} height={1.24} rx={0.18} className="fill-cream/45" />
        </>
      );
    case "bank":
      return (
        <>
          <rect x={-1} y={-0.35} width={2} height={0.7} rx={0.1} className="fill-thema-aubergine" />
          <line x1={-0.85} x2={0.85} y1={0.12} y2={0.12} className="stroke-cream/70" strokeWidth={1} {...linie} />
        </>
      );
    case "sitzgross":
      return (
        <>
          <rect x={-2} y={-0.8} width={4} height={1.6} rx={0.15} className="fill-thema-aubergine/85" />
          <line x1={-1.85} x2={1.85} y1={0} y2={0} className="stroke-cream/70" strokeWidth={1} {...linie} />
        </>
      );
    case "tisch":
      return (
        <>
          <rect x={-0.9} y={-0.42} width={1.8} height={0.84} rx={0.08} className="fill-thema-aubergine/25 stroke-thema-aubergine" strokeWidth={1} {...linie} />
          <rect x={-1} y={-0.95} width={2} height={0.36} rx={0.06} className="fill-thema-aubergine" />
          <rect x={-1} y={0.59} width={2} height={0.36} rx={0.06} className="fill-thema-aubergine" />
        </>
      );
    case "baum":
      return (
        <>
          <circle r={3} className="fill-thema-tannengruen/20 stroke-thema-tannengruen/45" strokeWidth={1} {...linie} />
          <circle r={1.25} className="fill-none stroke-thema-tannengruen/70" strokeWidth={1} strokeDasharray="2 2" {...linie} />
          <circle r={0.35} className="fill-thema-tannengruen" />
        </>
      );
    case "strauch":
      return (
        <>
          <circle r={0.8} className="fill-thema-tannengruen/35" />
          <circle cx={-0.3} cy={-0.15} r={0.38} className="fill-thema-tannengruen/80" />
          <circle cx={0.3} cy={-0.1} r={0.32} className="fill-thema-tannengruen/80" />
          <circle cx={0} cy={0.32} r={0.34} className="fill-thema-tannengruen/80" />
        </>
      );
    case "spiel":
      return (
        <>
          <rect x={-1.3} y={-1.3} width={2.6} height={2.6} rx={0.45} className="fill-thema-aubergine/12 stroke-thema-aubergine" strokeWidth={1} {...linie} />
          <circle cx={-0.45} cy={-0.35} r={0.45} className="fill-none stroke-thema-aubergine" strokeWidth={1.5} {...linie} />
          <path d="M0.1 0.85 L0.95 -0.7" className="stroke-thema-aubergine" strokeWidth={2} strokeLinecap="round" {...linie} />
        </>
      );
    case "fahrrad":
      return (
        <>
          <rect x={-1.3} y={-0.9} width={2.6} height={1.8} rx={0.1} className="fill-thema-isarpetrol/8 stroke-thema-isarpetrol/50" strokeWidth={1} {...linie} />
          {[-0.85, 0, 0.85].map((x) => (
            <path key={x} d={`M${x - 0.18} 0.6 V-0.45 a0.18 0.18 0 0 1 0.36 0 V0.6`} className="fill-none stroke-thema-isarpetrol" strokeWidth={1.75} {...linie} />
          ))}
        </>
      );
    case "brunnen":
      return (
        <>
          <circle r={1} className="fill-thema-isarpetrol/25 stroke-thema-isarpetrol" strokeWidth={1} {...linie} />
          <circle r={0.4} className="fill-thema-isarpetrol/60" />
        </>
      );
    case "klein":
      return <circle r={0.3} className="fill-ink-muted" />;
  }
}

/** Für die Leiste: das Symbol, eingepasst in ein Quadrat. */
export function Vorschau({ typ }: { typ: Typ }) {
  const gross = typ === "baum" ? 6.4 : typ === "stellplatz" ? 5.4 : 3.2;
  return (
    <svg viewBox={`${-gross / 2} ${-gross / 2} ${gross} ${gross}`} className="size-9" aria-hidden="true">
      <Form typ={typ} />
    </svg>
  );
}
