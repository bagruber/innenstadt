import roh from "@/data/altstadt.json";
import { inFlaeche, type P } from "@/baukasten/geometrie";

// Zeichenkoordinaten: Meter, x nach Osten, y nach SÜDEN (wie SVG).
const [W, H] = roh.groesse;
const zeichen = (p: number[]): P => [p[0], H - p[1]];

export const karte = {
  groesse: [W, H] as [number, number],
  flaechen: Object.fromEntries(
    Object.entries(roh.flaechen).map(([art, liste]) => [art, (liste as number[][][][]).map((f) => f.map((r) => r.map(zeichen)))]),
  ) as Record<"verkehr" | "gruen" | "wasser", P[][][]>,
  gebaeude: roh.gebaeude.map((g) => g.map(zeichen)),
  // Im Modell zeigt y nach Norden, beim Zeichnen nach Süden: Winkel spiegeln.
  namen: roh.namen.map((n) => ({ name: n.name, pos: zeichen(n.pos), winkel: -n.winkel })),
  /** Fahrstraßen, an Kreuzungen geteilt. `heute`: Zustand laut OSM. */
  abschnitte: roh.abschnitte.map((a) => ({ ...a, heute: a.heute as "heute" | "beruhigt" | "fussgaenger", punkte: a.punkte.map(zeichen) })),
};

export const ZELLE = 8; // Meter
export const SPALTEN = Math.ceil(W / ZELLE);
export const ZEILEN = Math.ceil(H / ZELLE);
const PINSEL = ZELLE * 1.2; // Radius in Metern

export const mittelpunkt = (i: number): P => [((i % SPALTEN) + 0.5) * ZELLE, (Math.floor(i / SPALTEN) + 0.5) * ZELLE];

const haeuser = karte.gebaeude.map((g) => ({
  ring: g,
  x0: Math.min(...g.map((p) => p[0])), x1: Math.max(...g.map((p) => p[0])),
  y0: Math.min(...g.map((p) => p[1])), y1: Math.max(...g.map((p) => p[1])),
}));
const imGebaeude = (p: P) =>
  haeuser.some((h) => p[0] >= h.x0 && p[0] <= h.x1 && p[1] >= h.y0 && p[1] <= h.y1 && inFlaeche(p, [h.ring]));

/** Zellen, deren Mitte in einem Gebäude liegt, lassen sich nicht bemalen.
 *  So läuft die Farbe in Straßen, Plätze und Höfe. */
export const frei: boolean[] = Array.from({ length: SPALTEN * ZEILEN }, (_, i) => !imGebaeude(mittelpunkt(i)));

/** Freie Zellen unter einem Pinselabdruck bei p. */
export function pinsel(p: P): number[] {
  const out: number[] = [];
  const r = Math.ceil(PINSEL / ZELLE);
  const c0 = Math.floor(p[0] / ZELLE), z0 = Math.floor(p[1] / ZELLE);
  for (let z = z0 - r; z <= z0 + r; z++)
    for (let c = c0 - r; c <= c0 + r; c++) {
      if (c < 0 || z < 0 || c >= SPALTEN || z >= ZEILEN) continue;
      const i = z * SPALTEN + c;
      const m = mittelpunkt(i);
      if (frei[i] && Math.hypot(m[0] - p[0], m[1] - p[1]) <= PINSEL) out.push(i);
    }
  return out;
}

/** Alle Zellen entlang eines Strichs, ohne Lücken bei schnellen Bewegungen. */
export function strich(a: P, b: P): number[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (ZELLE / 2)));
  const out = new Set<number>();
  for (let k = 0; k <= n; k++) for (const i of pinsel([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])) out.add(i);
  return [...out];
}

export const zellPfad = (zellen: Iterable<number>) => {
  let d = "";
  for (const i of zellen) d += `M${(i % SPALTEN) * ZELLE} ${Math.floor(i / SPALTEN) * ZELLE}h${ZELLE}v${ZELLE}h-${ZELLE}Z`;
  return d;
};

/** Die Ortsnamen, denen die Zellen am nächsten liegen, häufigste zuerst. */
export function orte(zellen: Iterable<number>, hoechstens = 3): string[] {
  const zaehler = new Map<string, number>();
  for (const i of zellen) {
    const m = mittelpunkt(i);
    let best: string | null = null, d = 60; // weiter weg zählt nicht
    for (const n of karte.namen) {
      const dn = Math.hypot(n.pos[0] - m[0], n.pos[1] - m[1]);
      if (dn < d) { d = dn; best = n.name; }
    }
    if (best) zaehler.set(best, (zaehler.get(best) ?? 0) + 1);
  }
  return [...zaehler].sort((a, b) => b[1] - a[1]).slice(0, hoechstens).map(([n]) => n);
}

/** Der nächstgelegene Ortsname zu einem Punkt, höchstens 60 m entfernt. */
export function ortVon(p: P): string | null {
  let best: string | null = null, d = 60;
  for (const n of karte.namen) {
    const dn = Math.hypot(n.pos[0] - p[0], n.pos[1] - p[1]);
    if (dn < d) { d = dn; best = n.name; }
  }
  return best;
}
