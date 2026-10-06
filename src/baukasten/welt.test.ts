import { describe, expect, it } from "vitest";
import type { Objekt } from "./katalog";
import { bestand, erlaubt, kennzahlen, phi, pruefe, rasterRot, schnapp, welt, zellen } from "./welt";

const start = bestand();
const achse = welt.achsen.reduce((a, b) => (a.punkte.length >= b.punkte.length ? a : b)).punkte;
const mitte = achse[Math.floor(achse.length / 2)];

function bank(x: number, y: number): Objekt {
  return { id: "test", typ: "bank", x, y, rot: 0 };
}

/** Erste freie Stelle für ein Objekt, im Raster gesucht. */
function freieStelle(objekte: Objekt[], typ: Objekt["typ"] = "bank"): Objekt {
  const [w, h] = welt.groesse;
  for (let x = 0; x < w; x += 0.5)
    for (let y = 0; y < h; y += 0.5) {
      const o = { ...bank(x, y), typ };
      if (!pruefe(o, objekte)) return o;
    }
  throw new Error("keine freie Stelle");
}

describe("Bestand", () => {
  it("enthält Bäume, die stehen bleiben", () => {
    const baeume = start.filter((o) => o.typ === "baum");
    expect(baeume.length).toBeGreaterThan(0);
    expect(baeume.every((b) => b.fest)).toBe(true);
  });

  it("schätzt eine plausible Zahl Stellplätze", () => {
    const n = start.filter((o) => o.platzhalter).length;
    expect(n).toBeGreaterThan(10);
    expect(n).toBeLessThan(60);
  });

  it("überlappt nicht und liegt nicht auf der Fahrgasse", () => {
    for (const o of start.filter((o) => o.platzhalter)) expect(pruefe(o, start)).toBeNull();
  });
});

describe("Regeln", () => {
  it("lässt die Fahrgasse frei", () => {
    expect(pruefe(bank(mitte[0], mitte[1]), start)).toBe("fahrgasse");
  });

  it("verbietet Plätze außerhalb der Straße", () => {
    expect(pruefe(bank(1, 1), start)).toBe("ausserhalb");
  });

  it("findet freie Stellen auf dem Gehweg", () => {
    const b = freieStelle(start);
    expect(pruefe(b, start)).toBeNull();
    expect(pruefe({ ...b, id: "zwei" }, [...start, b])).toBe("belegt");
  });
});

describe("Kennzahlen", () => {
  const heute = kennzahlen(start);

  it("zählt den Stand heute", () => {
    expect(heute.kosten).toBe(0);
    expect(heute.stellplaetze).toBe(start.filter((o) => o.typ === "stellplatz").length);
    expect(heute.gehweg).toBeGreaterThan(0);
    expect(heute.gehweg).toBeLessThanOrEqual(1);
  });

  it("mehr Schatten mit einem neuen Baum, Kosten steigen", () => {
    const ohne = start.filter((o) => o.typ !== "stellplatz");
    const baum: Objekt = { ...freieStelle(ohne, "baum"), id: "baum" };
    const k = kennzahlen([...ohne, baum]);
    expect(k.schatten).toBeGreaterThan(kennzahlen(ohne).schatten);
    expect(k.kosten).toBe(15);
  });

  it("Stellplätze weg macht Gehwege nicht schmaler", () => {
    const ohne = start.filter((o) => o.typ !== "stellplatz");
    expect(kennzahlen(ohne).gehweg).toBeGreaterThanOrEqual(heute.gehweg);
  });
});

describe("Raster", () => {
  it("rastet idempotent und nah am Punkt ein", () => {
    const p = schnapp([mitte[0] + 3.37, mitte[1] - 1.12]);
    const q = schnapp(p);
    expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeLessThan(1e-9);
    expect(Math.hypot(p[0] - mitte[0] - 3.37, p[1] - mitte[1] + 1.12)).toBeLessThanOrEqual(Math.SQRT1_2 + 1e-9);
  });

  it("dreht nur entlang oder quer zur Straße", () => {
    expect(rasterRot(0)).toBe(phi);
    expect(rasterRot(1)).toBe(phi + 90);
    expect(rasterRot(2)).toBe(phi);
  });

  it("rastet auf Zellmitten ein: was grün ist, passt", () => {
    const ok = erlaubt("bank", rasterRot(0), start);
    const i = ok.findIndex(Boolean);
    const z = zellen[i];
    const [x, y] = schnapp([z.m[0] + 0.3, z.m[1] - 0.2]);
    expect(Math.hypot(x - z.m[0], y - z.m[1])).toBeLessThan(1e-9);
    expect(pruefe({ id: "b", typ: "bank", x, y, rot: rasterRot(0) }, start)).toBeNull();
  });

  it("baut nie in Gebäuden", () => {
    const [x, y] = welt.gebaeude[0].reduce((s, p) => [s[0] + p[0] / welt.gebaeude[0].length, s[1] + p[1] / welt.gebaeude[0].length], [0, 0]);
    expect(pruefe({ id: "b", typ: "strauch", x, y, rot: 0 }, [])).toBe("ausserhalb");
  });

  it("deckt die Straßenfläche ab und sperrt die Fahrgasse", () => {
    expect(zellen.length).toBeGreaterThan(2000);
    const ok = erlaubt("bank", rasterRot(0), start);
    expect(ok.some(Boolean)).toBe(true);
    // Die Zelle, die der Achsmitte am nächsten liegt, ist blockiert.
    const naechste = zellen.reduce((b, z, i) =>
      Math.hypot(z.m[0] - mitte[0], z.m[1] - mitte[1]) < Math.hypot(zellen[b].m[0] - mitte[0], zellen[b].m[1] - mitte[1]) ? i : b, 0);
    expect(ok[naechste]).toBe(false);
  });
});
