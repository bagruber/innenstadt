import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, MapPin } from "@phosphor-icons/react";
import { Altstadtkarte, RAHMEN, modellPunkt } from "@/karte/Altstadtkarte";
import { ortVon } from "@/karte/altstadt";
import type { P } from "@/baukasten/geometrie";
import { Knopf, Kopf } from "@/ui";
import { groesse, verkleinere } from "./bild";

const SPEICHER = "abgeschaut-1";

type Mitbringsel = { id: string; bild: string; stadt: string; was: string; link: string; ort: P | null; zeigen: boolean };

function laden(): Mitbringsel[] {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return [];
}

const alsDataUrl = (b: Blob) => new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(b); });

export default function Abgeschaut() {
  const [liste, setListe] = useState(laden);
  const [bild, setBild] = useState<{ url: string; vorher: number; nachher: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [stadt, setStadt] = useState("");
  const [was, setWas] = useState("");
  const [link, setLink] = useState("");
  const [ort, setOrt] = useState<P | null>(null);
  const [eigenes, setEigenes] = useState(false);
  const [zeigen, setZeigen] = useState(false);
  const gruppe = useRef<SVGGElement>(null);

  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify(liste)); }
    catch { setFehler("Der Speicher dieses Browsers ist voll. Entferne ein Mitbringsel."); }
  }, [liste]);

  async function waehle(datei: File | undefined) {
    if (!datei) return;
    setFehler(null);
    try {
      const klein = await verkleinere(datei);
      setBild({ url: await alsDataUrl(klein), vorher: datei.size, nachher: klein.size });
    } catch {
      setFehler("Dieses Bild ließ sich nicht öffnen. Versuch ein JPEG, PNG oder HEIC aus der Kamera-App.");
    }
  }

  function mitbringen() {
    if (!bild) return;
    setListe([{ id: `m${Date.now().toString(36)}`, bild: bild.url, stadt, was, link, ort, zeigen }, ...liste]);
    setBild(null); setStadt(""); setWas(""); setLink(""); setOrt(null); setEigenes(false); setZeigen(false);
  }

  const bereit = bild && eigenes && was.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      <Kopf titel="Abgeschaut" unterzeile="Etwas Schönes in einer anderen Stadt gesehen? Bring es mit." />
      <main className="mx-auto grid w-full max-w-xl flex-1 content-start gap-5 px-4 py-5">
        <section className="grid gap-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-ink-soft/60 px-4 py-6 text-sm font-semibold">
            <Camera size={22} />
            {bild ? "Anderes Foto wählen" : "Foto wählen"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => waehle(e.target.files?.[0])} />
          </label>
          {fehler && <p className="text-sm text-blockiert" role="alert">{fehler}</p>}
          {bild && (
            <figure className="grid gap-1.5">
              <img src={bild.url} alt="Dein Foto, verkleinert" className="max-h-80 w-full rounded-[10px] object-contain bg-cream-dark" />
              <figcaption className="text-[12.5px] text-ink-muted">
                Verkleinert von {groesse(bild.vorher)} auf {groesse(bild.nachher)}. Dabei sind alle Metadaten weggefallen, auch der Aufnahmeort.
              </figcaption>
            </figure>
          )}
        </section>

        {bild && (
          <section className="grid gap-4">
            <Feld id="ab-was" label="Was ist darauf zu sehen?">
              <textarea id="ab-was" rows={2} maxLength={400} value={was} onChange={(e) => setWas(e.target.value)} placeholder="Zum Beispiel: Sitzstufen am Wasser, abends beleuchtet" className="eingabe" />
            </Feld>
            <Feld id="ab-stadt" label="Wo hast du das gesehen?" frei>
              <input id="ab-stadt" value={stadt} maxLength={80} onChange={(e) => setStadt(e.target.value)} placeholder="Nur die Stadt, zum Beispiel Landshut" className="eingabe" />
            </Feld>
            <Feld id="ab-link" label="Link mit mehr dazu" frei>
              <input id="ab-link" type="url" inputMode="url" value={link} maxLength={300} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="eingabe" />
            </Feld>
            <div className="grid gap-1.5">
              <p className="text-sm font-semibold">Wo in Moosburg wünschst du dir das? <span className="font-normal text-ink-muted">(freiwillig, antippen)</span></p>
              <div className="relative aspect-square w-full overflow-hidden rounded-[10px] border border-ink-line">
                <svg viewBox={`${RAHMEN.x} ${RAHMEN.y} ${RAHMEN.w} ${RAHMEN.h}`} className="absolute inset-0 size-full cursor-crosshair"
                  onClick={(e) => setOrt(modellPunkt(gruppe.current!, e.clientX, e.clientY))} role="img" aria-label="Altstadtkarte zum Antippen">
                  <Altstadtkarte gruppeRef={gruppe} schrift={9}
                    oben={ort && <g transform={`translate(${ort[0]} ${ort[1]})`}><circle r={9} className="fill-gold-700 stroke-cream" strokeWidth={2} vectorEffect="non-scaling-stroke" /></g>} />
                </svg>
              </div>
              {ort && <p className="flex items-center gap-1 text-[13px] text-ink-soft"><MapPin size={14} />{ortVon(ort) ? `Bei ${ortVon(ort)}` : "Gesetzt"} · <button type="button" className="underline" onClick={() => setOrt(null)}>entfernen</button></p>}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={eigenes} onChange={(e) => setEigenes(e.target.checked)} className="mt-1 accent-gold-700" />
              <span>Das Foto habe ich selbst gemacht. <span className="text-ink-muted">Bilder aus dem Netz bitte nur als Link.</span></span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={zeigen} onChange={(e) => setZeigen(e.target.checked)} className="mt-1 accent-gold-700" />
              <span>Es darf nach Prüfung öffentlich gezeigt werden. <span className="text-ink-muted">Ohne Haken sieht es nur das Team.</span></span>
            </label>
            <div><Knopf onClick={mitbringen} stark aus={!bereit}>Mitbringen</Knopf></div>
          </section>
        )}

        {liste.length > 0 && (
          <section className="grid gap-3 border-t border-ink-line pt-5">
            <h2 className="font-display text-xl font-semibold">Deine Mitbringsel</h2>
            <ul className="grid gap-4">
              {liste.map((m) => (
                <li key={m.id} className="grid grid-cols-[6rem_1fr] gap-3">
                  <img src={m.bild} alt="" className="aspect-square w-24 rounded-md object-cover" />
                  <div className="grid content-start gap-0.5 text-sm">
                    <p className="font-semibold">{m.was}</p>
                    <p className="text-ink-soft">{[m.stadt && `Gesehen in ${m.stadt}`, m.ort && (ortVon(m.ort) ? `gewünscht bei ${ortVon(m.ort)}` : "Ort in Moosburg gesetzt")].filter(Boolean).join(" · ")}</p>
                    <p className="text-[12.5px] text-ink-muted">{m.zeigen ? "Darf nach Prüfung gezeigt werden" : "Nur für das Team"}</p>
                    <button type="button" className="w-fit text-[13px] text-ink-soft underline" onClick={() => setListe(liste.filter((x) => x.id !== m.id))}>Entfernen</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="text-[12.5px] text-ink-muted">Im Prototyp bleibt alles in diesem Browser. Im Betrieb geht es nach Prüfung in die gemeinsame Sammlung.</p>
      </main>
    </div>
  );
}

function Feld({ id, label, frei, children }: { id: string; label: string; frei?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-semibold">{label}{frei && <span className="font-normal text-ink-muted"> (freiwillig)</span>}</label>
      {children}
    </div>
  );
}
