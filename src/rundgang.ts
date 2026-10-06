import { useEffect, useState } from "react";

// Der Rundgang: neun Stationen, je eine Interaktion. Die Reihenfolge ist frei,
// der Stripe im Kopf zeigt, welche erledigt sind (Kanon: neun feste Segmente).
export const STATIONEN = [
  { nr: 1, anker: "#baukasten", titel: "Die Herrnstraße", kurz: "Umbauen, mit begrenztem Platz und Budget" },
  { nr: 2, anker: "#markieren", titel: "Deine Altstadt", kurz: "Orte auf der Karte anmalen" },
  { nr: 3, anker: "#pins", titel: "Gefühlskarte", kurz: "Schön, laut, heiß, unsicher: Pins setzen" },
  { nr: 4, anker: "#strassen", titel: "Straßen beruhigen", kurz: "Abschnitte antippen" },
  { nr: 5, anker: "#swipe", titel: "Dafür oder dagegen", kurz: "Vorschläge wegwischen oder behalten" },
  { nr: 6, anker: "#laerm", titel: "Bis wann ist es okay?", kurz: "Abends draußen, Lärm und Ruhe" },
  { nr: 7, anker: "#anreise", titel: "Wie kommst du her?", kurz: "Wege in die Altstadt" },
  { nr: 8, anker: "#kalender", titel: "Ein Jahr Innenstadt", kurz: "Was fehlt dir wann?" },
  { nr: 9, anker: "#bild", titel: "Im Bild", kurz: "Markieren und Dinge hineinstellen" },
] as const;

export const ROLLEN = [
  { id: "anwohner", name: "Ich wohne in der Altstadt" },
  { id: "geschaeft", name: "Ich habe hier ein Geschäft oder Lokal" },
  { id: "eigentum", name: "Mir gehört hier ein Haus oder Laden" },
  { id: "besuch", name: "Ich komme zum Einkaufen oder Ausgehen" },
] as const;
export type Rolle = (typeof ROLLEN)[number]["id"];

type Stand = { rolle: Rolle | null; erledigt: number[] };
const SPEICHER = "rundgang-1";
const EREIGNIS = "rundgang";

function lesen(): Stand {
  try {
    const s = localStorage.getItem(SPEICHER);
    if (s) return JSON.parse(s);
  } catch { /* privates Fenster */ }
  return { rolle: null, erledigt: [] };
}

function schreiben(s: Stand) {
  try { localStorage.setItem(SPEICHER, JSON.stringify(s)); } catch { /* egal */ }
  dispatchEvent(new Event(EREIGNIS));
}

export function useRundgang() {
  const [stand, setStand] = useState(lesen);
  useEffect(() => {
    const f = () => setStand(lesen());
    addEventListener(EREIGNIS, f);
    return () => removeEventListener(EREIGNIS, f);
  }, []);
  return {
    ...stand,
    setRolle: (rolle: Rolle) => schreiben({ ...lesen(), rolle }),
    erledige: (nr: number) => {
      const s = lesen();
      if (!s.erledigt.includes(nr)) schreiben({ ...s, erledigt: [...s.erledigt, nr] });
    },
    vergessen: () => schreiben({ rolle: null, erledigt: [] }),
  };
}
