import { describe, expect, it } from "vitest";
import { massstab } from "./Bild";

describe("Perspektive der Sticker", () => {
  it("wird nach hinten kleiner, nie null, vorn höchstens etwas größer", () => {
    expect(massstab(600)).toBeGreaterThan(massstab(450));
    expect(massstab(450)).toBeGreaterThan(massstab(300));
    expect(massstab(285)).toBeGreaterThan(0);
    expect(massstab(10_000)).toBeLessThanOrEqual(1.15);
  });
});
