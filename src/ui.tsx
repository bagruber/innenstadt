import { useEffect, useState, type ReactNode } from "react";
import { ROLLEN, useRundgang, type Rolle } from "./rundgang";

// Volle Klassennamen, damit Tailwind die Theme-Farben mit ausgibt.
const STRIPE = ["bg-rb-1", "bg-rb-2", "bg-rb-3", "bg-rb-4", "bg-rb-5", "bg-rb-6", "bg-rb-7", "bg-rb-8", "bg-rb-9"];

/** Der Rainbow-Stripe als Fortschritt: erledigte Stationen in voller Farbe,
 *  die aktuelle blass, der Rest grau. Neun feste Segmente, nie als Verlauf. */
export function Stripe({ erledigt, aktuell }: { erledigt: number[]; aktuell?: number }) {
  return (
    <div className="grid h-1 grid-cols-9" role="img" aria-label={`${erledigt.length} von 9 Stationen erledigt`}>
      {STRIPE.map((c, i) => (
        <span key={c} className={erledigt.includes(i + 1) ? c : aktuell === i + 1 ? `${c} opacity-40` : "bg-ink-line"} />
      ))}
    </div>
  );
}

export function Kopf({ station, titel, unterzeile, rechts }: { station?: number; titel: string; unterzeile?: string; rechts?: ReactNode }) {
  const { erledigt } = useRundgang();
  return (
    <header className="shrink-0 border-b border-ink-line">
      <Stripe erledigt={erledigt} aktuell={station} />
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2.5">
        <div className="min-w-0">
          <a href="#start" className="text-[13px] font-semibold text-gold-700 underline-offset-4 hover:underline">
            {station ? `Station ${station} von 9` : "Mitmachen"} <span className="font-normal text-ink-muted">· Übersicht</span>
          </a>
          <h1 className="font-display text-[1.6rem] leading-tight font-semibold">{titel}</h1>
          {unterzeile && <p className="mt-0.5 text-sm text-ink-soft">{unterzeile}</p>}
        </div>
        {rechts}
      </div>
    </header>
  );
}

export function Knopf({ children, onClick, stark, aus }: { children: ReactNode; onClick: () => void; stark?: boolean; aus?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={aus}
      className={`rounded-[10px] px-3.5 py-2 text-sm font-semibold disabled:opacity-40 ${stark ? "bg-gold-700 text-cream" : "border border-ink-line bg-cream text-ink"}`}>
      {children}
    </button>
  );
}

export function Kartenknopf({ children, label, onClick, aus }: { children: ReactNode; label: string; onClick: () => void; aus?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={aus}
      className="grid size-10 place-items-center rounded-[10px] border border-ink-line bg-cream/95 text-lg leading-none shadow-sm disabled:opacity-40">
      {children}
    </button>
  );
}

/** Abschluss einer Station: was sie ergeben hat, und weiter. */
export function Geschafft({ station, titel, children, onAendern }: { station: number; titel: string; children: ReactNode; onAendern: () => void }) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="text-[13px] font-semibold text-gold-700">Station {station} geschafft</p>
        <h2 className="font-display text-xl leading-snug font-semibold">{titel}</h2>
      </div>
      {children}
      <div className="flex flex-wrap gap-2">
        <a href="#start" className="rounded-[10px] bg-gold-700 px-3.5 py-2 text-sm font-semibold text-cream">Zur Übersicht</a>
        <Knopf onClick={onAendern}>Noch einmal ändern</Knopf>
      </div>
    </div>
  );
}

/** Kurzer Hinweis über der Karte, verschwindet nach gut drei Sekunden. */
export function useHinweis(): [ReactNode, (text: string) => void] {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), 3200);
    return () => clearTimeout(t);
  }, [text]);
  const knoten = (
    <p role="status" className={`pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit max-w-[90%] rounded-[10px] bg-ink px-4 py-2.5 text-center text-sm text-cream shadow-lg transition-opacity ${text ? "opacity-100" : "opacity-0"}`}>
      {text}
    </p>
  );
  return [knoten, setText];
}

/** Die Rolle aus dem Einstieg, hier änderbar: Sie entscheidet die Auswertung. */
export function RollenZeile({ rolle, setRolle }: { rolle: Rolle | null; setRolle: (r: Rolle) => void }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-[13px] font-semibold text-ink-soft">{rolle ? "Du antwortest als:" : "Wer bist du hier? Das hilft bei der Auswertung."}</p>
      <div className="flex flex-wrap gap-1.5">
        {ROLLEN.map((r) => (
          <button key={r.id} type="button" aria-pressed={rolle === r.id} onClick={() => setRolle(r.id)}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${rolle === r.id ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}
