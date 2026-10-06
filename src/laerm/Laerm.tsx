import { useEffect, useState } from "react";
import { Geschafft, Knopf, Kopf, RollenZeile } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 6;
const SPEICHER = "laerm-1";

const SZENARIEN = [
  { id: "fr-draussen", titel: "Freitagabend im Juli", text: "Am Stadtplatz sitzen Leute draußen vor Café und Bar, reden und lachen." },
  { id: "di-draussen", titel: "Dienstagabend im Juli", text: "Dasselbe, aber unter der Woche. Am nächsten Morgen ist Arbeit und Schule." },
  { id: "sa-musik", titel: "Samstagabend", text: "In einer Bar läuft Musik, die Tür steht offen, auf der Straße hört man sie." },
];

// 0 = gar nicht, 1 … 13 = 20:00 bis 02:00 in halben Stunden, 14 = ohne Grenze
const STUFEN = 15;
const uhrzeit = (i: number) => {
  const min = 20 * 60 + (i - 1) * 30;
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
};
const beschreibe = (i: number) => (i === 0 ? "Gar nicht" : i === STUFEN - 1 ? "Ohne Grenze" : `Bis ${uhrzeit(i)} Uhr`);

// Abend bis Nacht als abgestufte Flächen von Creme zu Tinte, kein Verlauf.
const mische = (t: number) => {
  const a = [0xfa, 0xf7, 0xf2], b = [0x1c, 0x1c, 0x2a];
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
};

function laden(): { werte: Record<string, number>; fertig: boolean } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { werte: {}, fertig: false };
}

export default function Laerm() {
  const [stand, setStand] = useState(laden);
  const { rolle, setRolle, erledige } = useRundgang();
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (stand.fertig) erledige(STATION); }, [stand.fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  const wert = (id: string) => stand.werte[id] ?? 7; // Start: 23:00
  const setze = (id: string, w: number) => setStand((s) => ({ ...s, werte: { ...s.werte, [id]: w } }));

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf station={STATION} titel="Bis wann ist es okay?" />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-6 px-4 py-5">
        {stand.fertig ? (
          <Geschafft station={STATION} titel="Deine Grenzen" onAendern={() => setStand({ ...stand, fertig: false })}>
            <ul className="grid gap-1.5 text-sm">
              {SZENARIEN.map((s) => (
                <li key={s.id} className="flex justify-between gap-3"><span className="text-ink-soft">{s.titel}</span><span className="font-semibold [font-variant-numeric:lining-nums_tabular-nums]">{beschreibe(wert(s.id))}</span></li>
              ))}
            </ul>
            <p className="text-sm text-ink-soft">
              Im fertigen Rundgang legen wir die Antworten nach Rollen übereinander. Wo sich Menschen, die hier wohnen, und Menschen, die hier ein Lokal haben, treffen, liegt der Kompromiss.
            </p>
          </Geschafft>
        ) : (
          <>
            <RollenZeile rolle={rolle} setRolle={setRolle} />
            {SZENARIEN.map((s) => {
              const w = wert(s.id);
              return (
                <section key={s.id} className="grid gap-3 border-t border-ink-line pt-5" aria-labelledby={`t-${s.id}`}>
                  <div>
                    <h2 id={`t-${s.id}`} className="font-display text-xl leading-snug font-semibold">{s.titel}</h2>
                    <p className="text-sm text-ink-soft">{s.text}</p>
                  </div>
                  <p className="font-display text-3xl font-semibold [font-variant-numeric:lining-nums_tabular-nums]" aria-live="polite">{beschreibe(w)}</p>
                  <div className="grid gap-1.5">
                    <div className="grid h-8 grid-cols-15 overflow-hidden rounded-[10px] border border-ink-line" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${STUFEN}, 1fr)` }}>
                      {Array.from({ length: STUFEN }, (_, i) => (
                        <span key={i} style={{ background: i <= w && w > 0 ? mische(i / (STUFEN - 1)) : "transparent" }} />
                      ))}
                    </div>
                    <input type="range" min={0} max={STUFEN - 1} step={1} value={w} onChange={(e) => setze(s.id, +e.target.value)}
                      aria-label={`${s.titel}: bis wann ist es in Ordnung?`} aria-valuetext={beschreibe(w)} className="w-full accent-gold-700" />
                    <div className="flex justify-between text-[12px] text-ink-muted [font-variant-numeric:lining-nums_tabular-nums]">
                      <span>gar nicht</span><span>22:00</span><span>00:00</span><span>ohne Grenze</span>
                    </div>
                  </div>
                </section>
              );
            })}
            <div><Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf></div>
          </>
        )}
      </main>
    </div>
  );
}
