import { describe, expect, it } from "vitest";
import { groesse, zielmass } from "./bild";

describe("Verkleinern", () => {
  it("begrenzt die längste Seite und hält das Seitenverhältnis", () => {
    expect(zielmass(4032, 3024)).toEqual([1200, 900]);
    expect(zielmass(3024, 4032)).toEqual([900, 1200]);
  });
  it("vergrößert kleine Bilder nicht", () => {
    expect(zielmass(800, 600)).toEqual([800, 600]);
  });
  it("schreibt Größen deutsch", () => {
    expect(groesse(3_400_000)).toBe("3,4 MB");
    expect(groesse(182_000)).toBe("182 KB");
  });
});
