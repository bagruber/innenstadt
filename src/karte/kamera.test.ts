import { describe, expect, it } from "vitest";
import { begrenze, passend, zoomeUm } from "./kamera";

const rahmen = { x: 0, y: 0, w: 100, h: 200 };
const buehne = { w: 400, h: 400 };

describe("Kamera", () => {
  it("zoomt nicht weiter heraus als „alles sichtbar“", () => {
    expect(passend(rahmen, buehne)).toBe(2);
    expect(begrenze({ x: 0, y: 0, s: 0.5 }, rahmen, buehne, 40).s).toBe(2);
    expect(begrenze({ x: 0, y: 0, s: 99 }, rahmen, buehne, 40).s).toBe(40);
  });

  it("hält die Sicht im Rahmen, an beiden Enden erreichbar", () => {
    const s = 8; // Sicht 50 × 50 m
    expect(begrenze({ x: -30, y: -30, s }, rahmen, buehne, 40)).toEqual({ x: 0, y: 0, s });
    expect(begrenze({ x: 500, y: 500, s }, rahmen, buehne, 40)).toEqual({ x: 50, y: 150, s });
  });

  it("zeigt einen schmalen Rahmen mittig", () => {
    const k = begrenze({ x: 0, y: 0, s: 2 }, rahmen, buehne, 40);
    expect(k.x).toBe(-50); // 200 m Sicht, 100 m Rahmen
  });

  it("lässt beim Zoomen den Punkt unter dem Finger stehen", () => {
    const k = { x: 10, y: 20, s: 4 };
    const vorher = [k.x + 100 / k.s, k.y + 60 / k.s];
    const z = zoomeUm(k, 100, 60, 2.5);
    expect([z.x + 100 / z.s, z.y + 60 / z.s]).toEqual(vorher);
  });
});
