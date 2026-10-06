// Die Objekte des Baukastens. Maße in Metern, Länge entlang der Drehrichtung.
// Kosten sind Platzhalter-Punkte, bis es Richtwerte vom Bauamt gibt.

export type Typ =
  | "stellplatz" | "bank" | "sitzgross" | "tisch"
  | "baum" | "strauch" | "spiel" | "fahrrad"
  | "brunnen" | "klein";

export type Gegenstand = "wege" | "natur" | "begegnung" | "fest";

export type Art = {
  name: string;
  /** Rechteck (laenge × breite) oder Kreis (radius = Standfläche). */
  form: { rechteck: [number, number] } | { kreis: number };
  kosten: number;
  sitze?: number;
  stellplaetze?: number;
  radplaetze?: number;
  /** Kronenradius, nur Bäume. Darf über andere Objekte ragen. */
  krone?: number;
  gegenstand: Gegenstand;
};

export const BUDGET = 100;

export const KATALOG: Record<Typ, Art> = {
  stellplatz: { name: "Stellplatz", form: { rechteck: [5.0, 2.2] }, kosten: 2, stellplaetze: 1, gegenstand: "wege" },
  bank: { name: "Bank", form: { rechteck: [2.0, 0.7] }, kosten: 4, sitze: 3, gegenstand: "begegnung" },
  sitzgross: { name: "Sitzstufe", form: { rechteck: [4.0, 1.6] }, kosten: 12, sitze: 8, gegenstand: "begegnung" },
  tisch: { name: "Tisch mit Bänken", form: { rechteck: [2.0, 1.9] }, kosten: 8, sitze: 6, gegenstand: "begegnung" },
  baum: { name: "Baum", form: { kreis: 1.25 }, krone: 3, kosten: 15, gegenstand: "natur" },
  strauch: { name: "Beet", form: { kreis: 0.8 }, kosten: 3, gegenstand: "natur" },
  spiel: { name: "Spielgerät", form: { rechteck: [2.6, 2.6] }, kosten: 10, gegenstand: "begegnung" },
  fahrrad: { name: "Radbügel", form: { rechteck: [2.6, 1.8] }, kosten: 3, radplaetze: 6, gegenstand: "wege" },
  // Nur Bestand, nicht im Angebot.
  brunnen: { name: "Brunnen", form: { kreis: 1.0 }, kosten: 0, gegenstand: "fest" },
  klein: { name: "Laterne, Poller oder Abfalleimer", form: { kreis: 0.3 }, kosten: 0, gegenstand: "fest" },
};

/** Reihenfolge in der Leiste. */
export const ANGEBOT: Typ[] = ["bank", "tisch", "sitzgross", "baum", "strauch", "spiel", "fahrrad", "stellplatz"];

export type Objekt = {
  id: string;
  typ: Typ;
  x: number;
  y: number;
  /** Grad, im Uhrzeigersinn, 0 = Länge entlang x. */
  rot: number;
  /** Stand heute. Entfernen kostet nichts (vereinfacht). */
  bestand?: boolean;
  /** Bleibt stehen: Bestandsbäume, Brunnen, Laternen. */
  fest?: boolean;
  /** Aus OSM-Regeln geschätzt, nicht gezählt. */
  platzhalter?: boolean;
};
