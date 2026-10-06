import { KATALOG, type Objekt } from "./katalog";

export type P = [number, number];

/** Gerade-ungerade-Regel über alle Ringe, damit Löcher stimmen. */
export function inFlaeche(p: P, ringe: P[][]): boolean {
  let drin = false;
  for (const ring of ringe) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) drin = !drin;
    }
  }
  return drin;
}

export function abstandStrecke(p: P, a: P, b: P): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function abstandLinie(p: P, linie: P[]): number {
  let d = Infinity;
  for (let i = 0; i < linie.length - 1; i++) d = Math.min(d, abstandStrecke(p, linie[i], linie[i + 1]));
  return d;
}

/** Richtung (Grad) des nächstgelegenen Abschnitts einer der Linien. */
export function richtungBei(p: P, linien: P[][]): number {
  let best = Infinity;
  let winkel = 0;
  for (const l of linien) {
    for (let i = 0; i < l.length - 1; i++) {
      const d = abstandStrecke(p, l[i], l[i + 1]);
      if (d < best) {
        best = d;
        winkel = (Math.atan2(l[i + 1][1] - l[i][1], l[i + 1][0] - l[i][0]) * 180) / Math.PI;
      }
    }
  }
  // Auf (-90, 90] falten: Ein Objekt hat keine Fahrtrichtung.
  while (winkel > 90) winkel -= 180;
  while (winkel <= -90) winkel += 180;
  return winkel;
}

export function umriss(o: Pick<Objekt, "typ" | "x" | "y" | "rot">): P[] {
  const f = KATALOG[o.typ].form;
  if ("kreis" in f) {
    const n = 12;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * 2 * Math.PI;
      return [o.x + f.kreis * Math.cos(a), o.y + f.kreis * Math.sin(a)] as P;
    });
  }
  const [l, b] = f.rechteck;
  const a = (o.rot * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return ([[-l / 2, -b / 2], [l / 2, -b / 2], [l / 2, b / 2], [-l / 2, b / 2]] as P[]).map(
    ([x, y]) => [o.x + x * c - y * s, o.y + x * s + y * c] as P,
  );
}

export function radius(o: Pick<Objekt, "typ">): number {
  const f = KATALOG[o.typ].form;
  return "kreis" in f ? f.kreis : Math.hypot(f.rechteck[0], f.rechteck[1]) / 2;
}

/** Trennende Achse für zwei konvexe Polygone. */
export function ueberlappen(a: P[], b: P[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const nx = p2[1] - p1[1];
      const ny = p1[0] - p2[0];
      let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
      for (const p of a) { const v = p[0] * nx + p[1] * ny; aMin = Math.min(aMin, v); aMax = Math.max(aMax, v); }
      for (const p of b) { const v = p[0] * nx + p[1] * ny; bMin = Math.min(bMin, v); bMax = Math.max(bMax, v); }
      // Berühren ist erlaubt: zwei Bänke Kante an Kante.
      if (aMax <= bMin + 1e-6 || bMax <= aMin + 1e-6) return false;
    }
  }
  return true;
}

export function inKonvex(p: P, poly: P[]): boolean {
  let vorzeichen = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const k = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (k !== 0) {
      if (vorzeichen === 0) vorzeichen = Math.sign(k);
      else if (Math.sign(k) !== vorzeichen) return false;
    }
  }
  return true;
}

/** Punkte entlang der Kanten, alle `schritt` Meter. */
export function kantenpunkte(poly: P[], schritt = 0.5): P[] {
  const out: P[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / schritt));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
