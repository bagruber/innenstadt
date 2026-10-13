import { describe, expect, it } from "vitest";
import { SPALTEN, ZEILEN, ZELLE, frei, karte, mittelpunkt, orte, pinsel, strich } from "./altstadt";

const stadtplatz = karte.namen.find((n) => n.name === "Stadtplatz")!.pos;

describe("Raster der Altstadt", () => {
  it("überdeckt die Karte", () => {
    expect(SPALTEN * ZELLE).toBeGreaterThanOrEqual(karte.groesse[0]);
    expect(ZEILEN * ZELLE).toBeGreaterThanOrEqual(karte.groesse[1]);
  });

  it("sperrt Zellen in Gebäuden, lässt Straßen frei", () => {
    const gesperrt = frei.filter((f) => !f).length;
    expect(gesperrt).toBeGreaterThan(frei.length * 0.1);
    expect(gesperrt).toBeLessThan(frei.length * 0.7);
    expect(pinsel(stadtplatz).length).toBeGreaterThan(0);
  });

  it("malt mit dem Pinsel nur freie Zellen rund um den Finger", () => {
    const z = pinsel(stadtplatz);
    for (const i of z) {
      expect(frei[i]).toBe(true);
      const m = mittelpunkt(i);
      expect(Math.hypot(m[0] - stadtplatz[0], m[1] - stadtplatz[1])).toBeLessThanOrEqual(ZELLE * 1.2);
    }
  });

  it("füllt schnelle Striche ohne Lücken", () => {
    const a = stadtplatz;
    const b: [number, number] = [a[0] + 80, a[1]];
    const s = new Set(strich(a, b));
    // jeder Pinselabdruck alle 4 m auf der Strecke ist enthalten
    for (let t = 0; t <= 80; t += 4) for (const i of pinsel([a[0] + t, a[1]])) expect(s.has(i)).toBe(true);
  });

  it("benennt die Gegend einer Markierung", () => {
    expect(orte(pinsel(stadtplatz))).toContain("Stadtplatz");
  });
});

describe("Straßenabschnitte", () => {
  it("fügt OSM-Fortsetzungen zusammen: die Herrnstraße ist ein Abschnitt", () => {
    const herrn = karte.abschnitte.filter((a) => a.name === "Herrnstraße");
    expect(herrn).toHaveLength(1);
    expect(herrn[0].laenge).toBeGreaterThan(140);
  });

  it("lässt kaum Splitter übrig", () => {
    const kurz = karte.abschnitte.filter((a) => a.laenge < 15).length;
    expect(kurz / karte.abschnitte.length).toBeLessThan(0.08);
  });
  it("hat eindeutige Kennungen und mindestens zwei Punkte je Abschnitt", () => {
    const ids = karte.abschnitte.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(karte.abschnitte.every((a) => a.punkte.length >= 2)).toBe(true);
  });
});
