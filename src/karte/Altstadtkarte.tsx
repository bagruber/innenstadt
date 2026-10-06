import type { ReactNode, Ref } from "react";
import type { P } from "@/baukasten/geometrie";
import { karte } from "./altstadt";

export const pfad = (ring: P[]) => "M" + ring.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
export const RAHMEN = { x: 0, y: 0, w: karte.groesse[0], h: karte.groesse[1] };
export const stadtplatz: P = karte.namen.find((n) => n.name === "Stadtplatz")?.pos ?? [karte.groesse[0] / 2, karte.groesse[1] / 2];

/**
 * Die Altstadt als Schwarzplan: Grundstücke cremedunkel, öffentlicher Raum
 * hell, Grün und Wasser getönt, Gebäude in Tinte, Straßennamen obenauf.
 * `unten` liegt unter den Gebäuden (Farbe läuft in die Straßen), `oben` darüber.
 * Gehört in ein <svg>; `gruppeRef` ist das Koordinatensystem in Metern.
 */
export function Altstadtkarte({ gruppeRef, schrift, unten, oben }: { gruppeRef?: Ref<SVGGElement>; schrift: number; unten?: ReactNode; oben?: ReactNode }) {
  return (
    <>
      <rect x={-1e4} y={-1e4} width={2e4} height={2e4} className="fill-cream-dark" />
      <g ref={gruppeRef}>
        {karte.flaechen.verkehr.map((f, i) => <path key={`v${i}`} d={f.map(pfad).join("")} className="fill-cream" fillRule="evenodd" />)}
        {karte.flaechen.gruen.map((f, i) => <path key={`g${i}`} d={f.map(pfad).join("")} className="fill-thema-tannengruen/15" fillRule="evenodd" />)}
        {karte.flaechen.wasser.map((f, i) => <path key={`w${i}`} d={f.map(pfad).join("")} className="fill-thema-isarpetrol/30" fillRule="evenodd" />)}
        {unten}
        {karte.gebaeude.map((g, i) => <path key={i} d={pfad(g)} className="fill-ink/85 stroke-cream-dark" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
        {oben}
        {karte.namen.map((n) => {
          const w = n.winkel > 90 ? n.winkel - 180 : n.winkel < -90 ? n.winkel + 180 : n.winkel; // nie auf dem Kopf
          return (
            <text key={n.name} transform={`translate(${n.pos[0]} ${n.pos[1]}) rotate(${w})`} fontSize={schrift} textAnchor="middle" dominantBaseline="middle"
              className="fill-ink-soft font-sans" style={{ fontWeight: 600, paintOrder: "stroke" }} stroke="var(--color-cream)" strokeWidth={schrift * 0.25} pointerEvents="none">
              {n.name}
            </text>
          );
        })}
      </g>
    </>
  );
}

/** Umrechnung Bildschirm → Meter über die Gruppe der Karte. */
export function modellPunkt(g: SVGGElement, cx: number, cy: number): P {
  const pt = g.ownerSVGElement!.createSVGPoint();
  pt.x = cx; pt.y = cy;
  const m = pt.matrixTransform(g.getScreenCTM()!.inverse());
  return [m.x, m.y];
}
