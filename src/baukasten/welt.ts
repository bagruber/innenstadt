import roh from "@/data/herrnstrasse.json";
import { KATALOG, type Objekt, type Typ } from "./katalog";
import {
  abstandLinie, inFlaeche, inKonvex, kantenpunkte, radius, richtungBei, ueberlappen, umriss, type P,
} from "./geometrie";

// Zeichenkoordinaten: Meter, x nach Osten, y nach SÜDEN (wie SVG).
const H = roh.groesse[1];
const zeichen = (p: number[]): P => [p[0], H - p[1]];

export const FAHRGASSE = 3.5; // Rettungsweg, Einbahn
export const GEHWEG = 1.5; // lichte Breite, die frei bleiben soll

export const welt = {
  groesse: roh.groesse as [number, number],
  flaeche: roh.flaeche.map((r) => r.map(zeichen)),
  gebaeude: roh.gebaeude.map((g) => g.map(zeichen)),
  achsen: roh.achse.map((a) => ({ ...a, punkte: a.punkte.map(zeichen) })),
};
const linien = welt.achsen.map((a) => a.punkte);

// Gebäude mit Hüllrechteck, damit die Prüfung nur nahe Gebäude ansieht. Die
// Straßenfläche aus dem Kataster reicht stellenweise unter Gebäude (Arkaden
// oder Abweichung zu OSM); dort wird trotzdem nicht gebaut.
const haeuser = welt.gebaeude.map((g) => ({
  ring: g,
  x0: Math.min(...g.map((p) => p[0])), x1: Math.max(...g.map((p) => p[0])),
  y0: Math.min(...g.map((p) => p[1])), y1: Math.max(...g.map((p) => p[1])),
}));
export const imGebaeude = (p: P) =>
  haeuser.some((h) => p[0] >= h.x0 && p[0] <= h.x1 && p[1] >= h.y0 && p[1] <= h.y1 && inFlaeche(p, [h.ring]));

export type Grund = "ausserhalb" | "fahrgasse" | "belegt";

export const GRUND_TEXT: Record<Grund, string> = {
  ausserhalb: "Nur auf der Straßenfläche, nicht in Gebäuden.",
  fahrgasse: "Die Fahrgasse bleibt frei, sie ist auch der Rettungsweg.",
  belegt: "Da steht schon etwas.",
};

export function pruefe(o: Objekt, andere: Objekt[]): Grund | null {
  const u = umriss(o);
  const punkte = [...kantenpunkte(u), [o.x, o.y] as P];
  if (punkte.some((p) => !inFlaeche(p, welt.flaeche) || imGebaeude(p))) return "ausserhalb";
  if (punkte.some((p) => linien.some((l) => abstandLinie(p, l) < FAHRGASSE / 2))) return "fahrgasse";
  const r = radius(o);
  for (const a of andere) {
    if (a.id === o.id) continue;
    if (Math.hypot(a.x - o.x, a.y - o.y) > r + radius(a)) continue;
    if (ueberlappen(u, umriss(a))) return "belegt";
  }
  return null;
}

export const richtung = (p: P) => richtungBei(p, linien);

// --- Straßenrahmen und Raster ------------------------------------------------
// Ein Raster wie in einem Citybuilder, ausgerichtet an der Hauptrichtung der
// Straße. Im Knick liegt es dadurch leicht schräg zu den Fassaden.

const innen = linien.flat().filter((p) => inFlaeche(p, welt.flaeche));
export const mitte: P = [innen.reduce((s, p) => s + p[0], 0) / innen.length, innen.reduce((s, p) => s + p[1], 0) / innen.length];
/** Hauptrichtung der Straße in Grad (Hauptachse der Achspunkte). */
export const phi = (() => {
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of innen) {
    const dx = x - mitte[0], dy = y - mitte[1];
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  return (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
})();

/** Dreht um die Straßenmitte. */
export function drehe([x, y]: P, grad: number): P {
  const a = (grad * Math.PI) / 180;
  const dx = x - mitte[0], dy = y - mitte[1];
  return [mitte[0] + dx * Math.cos(a) - dy * Math.sin(a), mitte[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

export const ZELLE = 1; // Meter, sichtbares Raster
/** Auf die Mitte der Rasterzelle einrasten, im Straßenrahmen gerechnet.
 *  Dieselben Punkte, an denen `erlaubt` prüft: grün angetippt passt. */
export function schnapp(p: P): P {
  const [u, v] = drehe(p, -phi);
  const r = (w: number, m: number) => m + (Math.floor((w - m) / ZELLE) + 0.5) * ZELLE;
  return drehe([r(u, mitte[0]), r(v, mitte[1])], phi);
}

/** Drehung auf dem Raster: entlang der Straße oder quer. */
export const rasterRot = (viertel: number) => phi + 90 * (((viertel % 2) + 2) % 2);

/** Zellen auf der Straßenfläche. `u, v` = linke obere Ecke im Straßenrahmen,
 *  `m` = Mittelpunkt im Modell. */
export const zellen: { u: number; v: number; m: P }[] = (() => {
  const pts = welt.flaeche.flat().map((p) => drehe(p, -phi));
  const out: { u: number; v: number; m: P }[] = [];
  const u0 = mitte[0] + Math.floor((Math.min(...pts.map((p) => p[0])) - mitte[0]) / ZELLE) * ZELLE;
  const v0 = mitte[1] + Math.floor((Math.min(...pts.map((p) => p[1])) - mitte[1]) / ZELLE) * ZELLE;
  const u1 = Math.max(...pts.map((p) => p[0]));
  const v1 = Math.max(...pts.map((p) => p[1]));
  for (let u = u0; u < u1; u += ZELLE)
    for (let v = v0; v < v1; v += ZELLE) {
      const m = drehe([u + ZELLE / 2, v + ZELLE / 2], phi);
      if (inFlaeche(m, welt.flaeche) && !imGebaeude(m)) out.push({ u, v, m });
    }
  return out;
})();

/** Für jede Zelle: Passt das Objekt, auf ihre Mitte gesetzt? */
export function erlaubt(typ: Typ, rot: number, objekte: Objekt[]): boolean[] {
  return zellen.map(({ m }) => !pruefe({ id: "probe", typ, x: m[0], y: m[1], rot }, objekte));
}

let zaehler = 0;
export const neueId = () => `o${Date.now().toString(36)}${(zaehler++).toString(36)}`;

// --- Bestand ---------------------------------------------------------------

const OSM_TYP: Record<string, Typ> = {
  baum: "baum", bank: "bank", fahrradstaender: "fahrrad",
  brunnen: "brunnen", trinkwasser: "klein", abfall: "klein", laterne: "klein", poller: "klein",
};

export function bestand(): Objekt[] {
  const liste: Objekt[] = [];
  for (const b of roh.bestand) {
    const typ = OSM_TYP[b.art];
    if (!typ) continue;
    const [x, y] = zeichen(b.pos);
    if (!inFlaeche([x, y], welt.flaeche)) continue;
    liste.push({
      id: `osm${b.osm}`, typ, x, y, rot: richtung([x, y]), bestand: true,
      fest: typ === "baum" || typ === "brunnen" || typ === "klein",
    });
  }
  return [...liste, ...stellplaetzeAusOsm(liste)];
}

/** Platzhalter, bis der gezählte Ist-Zustand vorliegt: parallele Stellplätze
 *  auf den Seiten, für die OSM Parken ausweist, so dicht wie es passt. */
function stellplaetzeAusOsm(hindernisse: Objekt[]): Objekt[] {
  const [laenge, breite] = (KATALOG.stellplatz.form as { rechteck: [number, number] }).rechteck;
  const abstand = FAHRGASSE / 2 + 0.1 + breite / 2;
  const plaetze: Objekt[] = [];
  for (const a of welt.achsen) {
    const pk = a.parken as Record<string, string | undefined>;
    const seite = (s: "left" | "right") => {
      const v = pk[`parking:${s}`] ?? pk["parking:both"];
      return v === "yes" || v === "street_side" || v === "lane";
    };
    // Links in Wegrichtung liegt bei y nach Süden auf der Normalen (dy, -dx).
    const seiten = [seite("left") ? 1 : 0, seite("right") ? -1 : 0].filter(Boolean);
    const pts = a.punkte;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const l = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / l, uy = (by - ay) / l;
      const rot = (Math.atan2(uy, ux) * 180) / Math.PI;
      for (const s of seiten) {
        for (let t = laenge / 2; t <= l - laenge / 2; t += 0.25) {
          const o: Objekt = {
            id: `p${plaetze.length}`, typ: "stellplatz",
            x: ax + ux * t + uy * abstand * s, y: ay + uy * t - ux * abstand * s,
            rot, bestand: true, platzhalter: true,
          };
          if (!pruefe(o, [...hindernisse, ...plaetze])) {
            plaetze.push(o);
            t += laenge + 0.5 - 0.25; // Lücke zum nächsten Platz
          }
        }
      }
    }
  }
  return plaetze;
}

// --- Kennzahlen -------------------------------------------------------------

/** Rasterpunkte (1 m) auf der Fläche, für den Kronenschatten. */
const raster: P[] = (() => {
  const xs = welt.flaeche.flat().map((p) => p[0]);
  const ys = welt.flaeche.flat().map((p) => p[1]);
  const out: P[] = [];
  for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++)
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++)
      if (inFlaeche([x + 0.5, y + 0.5], welt.flaeche)) out.push([x + 0.5, y + 0.5]);
  return out;
})();

/** Querschnitte alle 1 m entlang der Achse, je Seite die Punkte zwischen
 *  Fahrgasse und Fassade. Darauf wird die freie Gehbreite gemessen. */
const querschnitte: P[][] = (() => {
  const out: P[][] = [];
  for (const a of welt.achsen) {
    const pts = a.punkte;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const l = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / l, uy = (by - ay) / l;
      for (let t = 0.5; t < l; t += 1) {
        const m: P = [ax + ux * t, ay + uy * t];
        if (!inFlaeche(m, welt.flaeche)) continue;
        for (const s of [1, -1]) {
          const seite: P[] = [];
          for (let d = FAHRGASSE / 2 + 0.125; d < 20; d += 0.25) {
            const p: P = [m[0] + uy * d * s, m[1] - ux * d * s];
            if (!inFlaeche(p, welt.flaeche)) break;
            seite.push(p);
          }
          if (seite.length) out.push(seite);
        }
      }
    }
  }
  return out;
})();

export type Kennzahlen = {
  kosten: number;
  sitze: number;
  stellplaetze: number;
  radplaetze: number;
  baeume: number;
  schatten: number; // Anteil 0..1
  gehweg: number; // Anteil der Querschnittsseiten mit ≥ 1,5 m frei
  /** Mitte jeder Querschnittsseite, auf der keine 1,5 m frei sind. */
  engstellen: P[];
};

export function kennzahlen(objekte: Objekt[]): Kennzahlen {
  let kosten = 0, sitze = 0, stellplaetze = 0, radplaetze = 0, baeume = 0;
  const kronen: { x: number; y: number; r: number }[] = [];
  for (const o of objekte) {
    const a = KATALOG[o.typ];
    if (!o.bestand) kosten += a.kosten;
    sitze += a.sitze ?? 0;
    stellplaetze += a.stellplaetze ?? 0;
    radplaetze += a.radplaetze ?? 0;
    if (o.typ === "baum") { baeume++; kronen.push({ x: o.x, y: o.y, r: a.krone ?? 0 }); }
  }
  const beschattet = raster.filter(([x, y]) => kronen.some((k) => Math.hypot(x - k.x, y - k.y) <= k.r)).length;

  const umrisse = objekte.map((o) => ({ u: umriss(o), x: o.x, y: o.y, r: radius(o) }));
  let frei = 0;
  const engstellen: P[] = [];
  for (const seite of querschnitte) {
    let lauf = 0, best = 0;
    for (const p of seite) {
      const belegt = umrisse.some((o) => Math.hypot(p[0] - o.x, p[1] - o.y) <= o.r && inKonvex(p, o.u));
      lauf = belegt ? 0 : lauf + 0.25;
      best = Math.max(best, lauf);
    }
    if (best >= GEHWEG) frei++;
    else engstellen.push(seite[Math.floor(seite.length / 2)]);
  }
  return {
    kosten, sitze, stellplaetze, radplaetze, baeume,
    schatten: raster.length ? beschattet / raster.length : 0,
    gehweg: querschnitte.length ? frei / querschnitte.length : 0,
    engstellen,
  };
}

export const flaecheQm = raster.length;
