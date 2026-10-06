import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Bicycle, Bus, Car, Motorcycle, PersonSimpleWalk, Train, type IconProps } from "@phosphor-icons/react";
import { Geschafft, Knopf, Kopf, RollenZeile } from "@/ui";
import { useRundgang } from "@/rundgang";

const STATION = 7;
const SPEICHER = "anreise-1";

const WEGE: { id: string; name: string; Symbol: ComponentType<IconProps> }[] = [
  { id: "fuss", name: "Zu Fuß", Symbol: PersonSimpleWalk },
  { id: "rad", name: "Mit dem Rad", Symbol: Bicycle },
  { id: "bus", name: "Flexbus oder Bus", Symbol: Bus },
  { id: "auto", name: "Mit dem Auto", Symbol: Car },
  { id: "roller", name: "Motorrad oder Roller", Symbol: Motorcycle },
  { id: "bahn", name: "Bahn, dann zu Fuß", Symbol: Train },
];
const OFT = ["Täglich", "Mehrmals pro Woche", "Etwa einmal pro Woche", "Seltener"];
const AUSGABE = ["Meist nichts", "Bis 10 €", "10 bis 30 €", "30 bis 100 €", "Mehr"];
const FLEXBUS = ["Nutze ich", "Kenne ich, nutze ich nicht", "Kenne ich nicht"];

type Antworten = { weg?: string; oft?: string; ausgabe?: string; flexbus?: string; schaetzung?: number };

function laden(): { a: Antworten; fertig: boolean } {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { a: {}, fertig: false };
}

export default function Anreise() {
  const [stand, setStand] = useState(laden);
  const { a, fertig } = stand;
  const { rolle, setRolle, erledige } = useRundgang();
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(stand)); } catch { /* egal */ }
  }, [stand]);
  useEffect(() => { if (fertig) erledige(STATION); }, [fertig]); // eslint-disable-line react-hooks/exhaustive-deps

  const setze = (k: keyof Antworten, v: string | number) => setStand((s) => ({ ...s, a: { ...s.a, [k]: v } }));
  const geschaeft = rolle === "geschaeft";
  const schaetzung = a.schaetzung ?? 30;

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf station={STATION} titel="Wie kommst du her?" />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-6 px-4 py-5">
        {fertig ? (
          <Geschafft station={STATION} titel="Deine Wege" onAendern={() => setStand({ ...stand, fertig: false })}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {[["Meistens", WEGE.find((w) => w.id === a.weg)?.name], ["Wie oft", a.oft], ["Ausgaben", a.ausgabe], ["Flexbus", a.flexbus],
                ...(geschaeft ? [["Deine Schätzung", `${schaetzung} von 100 kommen mit dem Auto`]] : [])].map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold">{v ?? "keine Angabe"}</dd></div>
              ))}
            </dl>
            <p className="text-sm text-ink-soft">
              {geschaeft
                ? "Im fertigen Rundgang legen wir deine Schätzung neben das, was die Kundschaft selbst angibt. In anderen Städten lagen beide weit auseinander."
                : "Im fertigen Rundgang zeigen wir, wie alle in die Altstadt kommen, und was sie dort ausgeben."}
            </p>
          </Geschafft>
        ) : (
          <>
            <RollenZeile rolle={rolle} setRolle={setRolle} />
            <Frage titel="Wie kommst du meistens in die Altstadt?">
              <div className="grid grid-cols-3 gap-2">
                {WEGE.map((w) => (
                  <button key={w.id} type="button" aria-pressed={a.weg === w.id} onClick={() => setze("weg", w.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-[10px] border px-2 py-3 text-center text-[13px] font-semibold leading-tight ${a.weg === w.id ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
                    <w.Symbol size={26} weight={a.weg === w.id ? "fill" : "regular"} />
                    {w.name}
                  </button>
                ))}
              </div>
            </Frage>
            <Frage titel="Wie oft bist du dort?"><Chips werte={OFT} wahl={a.oft} setze={(v) => setze("oft", v)} /></Frage>
            <Frage titel="Was gibst du bei einem Besuch ungefähr aus?"><Chips werte={AUSGABE} wahl={a.ausgabe} setze={(v) => setze("ausgabe", v)} /></Frage>
            <Frage titel="Kennst du den Flexbus, der in Moosburg auf Bestellung fährt?"><Chips werte={FLEXBUS} wahl={a.flexbus} setze={(v) => setze("flexbus", v)} /></Frage>
            {geschaeft && (
              <Frage titel="Was schätzt du: Wie viele von 100 deiner Kundinnen und Kunden kommen mit dem Auto?">
                <div className="grid grid-cols-10 gap-1" role="img" aria-label={`${schaetzung} von 100 mit dem Auto`}>
                  {Array.from({ length: 100 }, (_, i) => (
                    <span key={i} className={`grid aspect-square place-items-center rounded-full ${i < schaetzung ? "bg-thema-isarpetrol text-cream" : "bg-ink-line/70 text-ink-muted"}`}>
                      {i < schaetzung ? <Car size={10} weight="fill" /> : <PersonSimpleWalk size={10} />}
                    </span>
                  ))}
                </div>
                <p className="font-display text-2xl font-semibold [font-variant-numeric:lining-nums_tabular-nums]">{schaetzung} von 100</p>
                <input type="range" min={0} max={100} value={schaetzung} onChange={(e) => setze("schaetzung", +e.target.value)}
                  aria-label="Anteil der Kundschaft, die mit dem Auto kommt" className="w-full accent-gold-700" />
              </Frage>
            )}
            <div><Knopf onClick={() => setStand({ ...stand, fertig: true })} stark>Fertig</Knopf></div>
          </>
        )}
      </main>
    </div>
  );
}

function Frage({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className="grid gap-2.5 border-t border-ink-line pt-5">
      <h2 className="font-display text-lg leading-snug font-semibold text-balance">{titel}</h2>
      {children}
    </section>
  );
}

function Chips({ werte, wahl, setze }: { werte: string[]; wahl?: string; setze: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {werte.map((w) => (
        <button key={w} type="button" aria-pressed={wahl === w} onClick={() => setze(w)}
          className={`rounded-full border px-3 py-1.5 text-sm ${wahl === w ? "border-ink bg-ink text-cream" : "border-ink-line"}`}>
          {w}
        </button>
      ))}
    </div>
  );
}
