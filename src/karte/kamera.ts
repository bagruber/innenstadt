import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from "react";

/** Ausschnitt in Ansichtskoordinaten (Meter). */
export type Rahmen = { x: number; y: number; w: number; h: number };
/** Linke obere Ecke der Sicht in Metern, s = Pixel pro Meter. */
export type Kamera = { x: number; y: number; s: number };
export type Groesse = { w: number; h: number };

/** Maßstab, bei dem der ganze Rahmen in die Bühne passt. */
export function passend(r: Rahmen, b: Groesse): number {
  return Math.min(b.w / r.w, b.h / r.h);
}

/** Nicht weiter heraus als „alles sichtbar“, nicht über den Rand hinaus.
 *  Ist der Rahmen in einer Richtung kleiner als die Sicht, wird er mittig gezeigt. */
export function begrenze(k: Kamera, r: Rahmen, b: Groesse, sMax: number): Kamera {
  const s = Math.min(Math.max(k.s, passend(r, b)), sMax);
  const achse = (pos: number, start: number, laenge: number, sicht: number) =>
    sicht >= laenge ? start - (sicht - laenge) / 2 : Math.min(Math.max(pos, start), start + laenge - sicht);
  return { s, x: achse(k.x, r.x, r.w, b.w / s), y: achse(k.y, r.y, r.h, b.h / s) };
}

/** Zoomen, ohne dass der Punkt unter Finger oder Maus wegrutscht. px, py relativ zur Bühne. */
export function zoomeUm(k: Kamera, px: number, py: number, faktor: number): Kamera {
  const mx = k.x + px / k.s;
  const my = k.y + py / k.s;
  const s = k.s * faktor;
  return { s, x: mx - px / s, y: my - py / s };
}

export type EinFinger = {
  runter: (e: RPE<SVGSVGElement>) => void;
  bewegen: (e: RPE<SVGSVGElement>) => void;
  hoch: (e: RPE<SVGSVGElement>) => void;
  /** Ein zweiter Finger kam dazu oder der Browser hat abgebrochen. */
  abbruch: () => void;
  /** Maus ohne gedrückte Taste. */
  schweben?: (e: RPE<SVGSVGElement>) => void;
};

/**
 * Kamera für eine Karte: ein Finger gehört der Anwendung (malen, ziehen,
 * verschieben), zwei Finger zoomen und verschieben, das Mausrad zoomt.
 * `schluessel` setzt die Kamera zurück, etwa wenn die Ausrichtung wechselt.
 */
export function useKamera(rahmen: Rahmen, start: (b: Groesse) => Kamera, schluessel: unknown, sMax = 40) {
  const buehne = useRef<HTMLDivElement>(null);
  const [groesse, setGroesse] = useState<Groesse | null>(null);
  const [kamera, setKamera] = useState<Kamera | null>(null);
  const stand = useRef({ rahmen, groesse, sMax });
  stand.current = { rahmen, groesse, sMax };

  useLayoutEffect(() => {
    const el = buehne.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setGroesse({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Neu einrichten, wenn sich der Schlüssel ändert oder die Bühne erstmals Maß hat.
  const zuletzt = useRef<unknown>(Symbol());
  useLayoutEffect(() => {
    if (!groesse) return;
    if (kamera && zuletzt.current === schluessel) return;
    zuletzt.current = schluessel;
    setKamera(begrenze(start(groesse), rahmen, groesse, sMax));
  });

  function aendere(f: (k: Kamera) => Kamera) {
    setKamera((k) => {
      const { rahmen: r, groesse: b, sMax: m } = stand.current;
      return k && b ? begrenze(f(k), r, b, m) : k;
    });
  }

  const verschiebe = (dxPx: number, dyPx: number) => aendere((k) => ({ ...k, x: k.x - dxPx / k.s, y: k.y - dyPx / k.s }));

  function zoome(clientX: number, clientY: number, faktor: number) {
    const r = buehne.current?.getBoundingClientRect();
    if (!r) return;
    aendere((k) => zoomeUm(k, clientX - r.left, clientY - r.top, faktor));
  }

  const zoomeMitte = (faktor: number) => {
    const r = buehne.current?.getBoundingClientRect();
    if (r) zoome(r.left + r.width / 2, r.top + r.height / 2, faktor);
  };

  useEffect(() => {
    const el = buehne.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      zoome(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    el.addEventListener("wheel", rad, { passive: false });
    return () => el.removeEventListener("wheel", rad);
  });

  // Zeiger mitzählen: ab zwei Fingern ist es eine Kamera-Geste.
  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; mx: number; my: number } | null>(null);
  const stumm = useRef(false); // nach einer Pinch-Geste, bis alle Finger weg sind

  function gesten(f: EinFinger) {
    const messe = () => {
      const [a, b] = [...zeiger.current.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    };
    return {
      onPointerDown(e: RPE<SVGSVGElement>) {
        // Ein neuer erster Finger beginnt eine neue Geste. Verlorene pointerup
        // der letzten dürfen nicht als Geisterfinger hängen bleiben.
        if (e.isPrimary) { zeiger.current.clear(); pinch.current = null; }
        e.currentTarget.setPointerCapture(e.pointerId);
        zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (zeiger.current.size === 1) { stumm.current = false; f.runter(e); }
        else if (zeiger.current.size === 2) { f.abbruch(); stumm.current = true; pinch.current = messe(); }
      },
      onPointerMove(e: RPE<SVGSVGElement>) {
        if (!zeiger.current.has(e.pointerId)) { if (e.pointerType === "mouse") f.schweben?.(e); return; }
        zeiger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (zeiger.current.size >= 2 && pinch.current) {
          const n = messe();
          verschiebe(n.mx - pinch.current.mx, n.my - pinch.current.my);
          if (pinch.current.d > 0) zoome(n.mx, n.my, n.d / pinch.current.d);
          pinch.current = n;
        } else if (!stumm.current) f.bewegen(e);
      },
      onPointerUp(e: RPE<SVGSVGElement>) {
        const war = zeiger.current.delete(e.pointerId);
        if (zeiger.current.size < 2) pinch.current = null;
        if (war && zeiger.current.size === 0 && !stumm.current) f.hoch(e);
      },
      onPointerCancel(e: RPE<SVGSVGElement>) {
        zeiger.current.delete(e.pointerId);
        pinch.current = null;
        f.abbruch();
      },
    };
  }

  const viewBox = kamera && groesse ? `${kamera.x} ${kamera.y} ${groesse.w / kamera.s} ${groesse.h / kamera.s}` : undefined;
  return { buehne, kamera, groesse, viewBox, verschiebe, zoomeMitte, gesten };
}
