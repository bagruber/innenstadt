# Innenstadt Moosburg

Beteiligung zur Moosburger Innenstadt: Parken, Schatten, Läden, Lärm und
Plätze zum Bleiben. Statt eines klassischen Fragebogens ein Rundgang durch
Orte und Themen, mit Karte, Baukasten und Swipe-Fragen.

**Stand:** Platzhalterseite. Der Rundgang hängt bis zum Start als Anker
daran, Einstieg unter `/innenstadt/#start`: Rolle wählen, neun Stationen in
freier Reihenfolge, der Rainbow-Stripe zeigt den Fortschritt.

| Anker | Station |
|---|---|
| `#baukasten` | 1 · Die Herrnstraße umbauen, Citybuilder mit Budget |
| `#markieren` | 2 · Deine Altstadt: vier Fragen auf der Karte anmalen |
| `#pins` | 3 · Gefühlskarte: schön, laut, heiß, unsicher, Barriere, Sitzplatz fehlt |
| `#strassen` | 4 · Straßen beruhigen: Abschnitte antippen |
| `#swipe` | 5 · Dafür oder dagegen: 14 Vorschläge wischen, mit „Warum?“ |
| `#laerm` | 6 · Bis wann ist es okay? Uhrzeit-Regler für drei Abendszenen |
| `#anreise` | 7 · Wie kommst du her? Mit Schätzfrage für Geschäfte |
| `#kalender` | 8 · Ein Jahr Innenstadt: Wunschkalender |
| `#bild` | 9 · Im Bild: markieren und Dinge hineinstellen |
| `#abgeschaut` | außer der Reihe: Foto aus einer anderen Stadt mitbringen |

Alle Antworten bleiben im Prototyp im Browser (`localStorage`); es gibt
noch kein Backend.

🔗 [moosburg.eu/innenstadt](https://moosburg.eu/innenstadt/) ·
[bagruber.github.io/innenstadt](https://bagruber.github.io/innenstadt/)

## Starten

```bash
pnpm install
pnpm dev        # http://localhost:5173/innenstadt/
pnpm build      # nach dist/
pnpm test       # Regeln und Kennzahlen des Baukastens
pnpm data       # Geometrie der Herrnstraße neu erzeugen (Python mit pyshp und pyproj)
python etl/altstadt.py   # Karte der Altstadt neu erzeugen
```

Vite, React, TypeScript und Tailwind 4. Farben und Schriften kommen aus
[moosburg-design](https://github.com/bagruber/moosburg-design), Versionen aus
`hausbasis/baseline.json`. `pnpm-workspace.yaml` löst direkte Abhängigkeiten
auf die Untergrenze der Range auf, damit ein frisches Lockfile dieselben
Stände zieht wie die anderen Repos.

## Daten

Die Geometrie für den Baukasten kommt aus offenen Daten und wird vorab ins
Projekt geschrieben, nicht zur Laufzeit geladen:

- Gebäude, Straßen, Bänke, Brunnen: © OpenStreetMap-Mitwirkende, ODbL
- Tatsächliche Nutzung, Hausumringe, Einzelbäume: Bayerische
  Vermessungsverwaltung, CC BY 4.0

## Baukasten

Auf der echten Straßenfläche Objekte platzieren, mit begrenztem Budget.
Die Regeln stehen in `src/baukasten/welt.ts`: Objekte nur auf der
Straßenfläche, die Fahrgasse (3,5 m, Rettungsweg) bleibt frei, nichts
überlappt. Kennzahlen: Sitzplätze, Stellplätze, Kronenschatten (Anteil der
Fläche unter Baumkronen) und „Gehweg frei“ (Anteil der Querschnitte je Seite,
auf denen zwischen Fahrgasse und Fassade 1,5 m am Stück frei sind). Kosten
sind Platzhalter-Punkte, die Stellplätze bis zum gezählten Ist-Zustand aus
den OSM-Parkregeln geschätzt.

Bedienung wie in Citybuildern: Objekt wählen, das Raster zeigt grün, wo es
passt, und rot schraffiert, wo nicht. Am Handy setzt Antippen eine Vorschau,
die sich ziehen lässt und mit „Bauen ✓“ bestätigt wird; am Desktop folgt sie
der Maus, ein Klick baut. Bestehendes erst antippen, dann ziehen. Ein Finger
auf freier Fläche verschiebt die Karte, zwei Finger zoomen.

## Markieren

Die Altstadtkarte (`src/karte/`) ist ein Schwarzplan aus Kataster und OSM,
gemeinsam genutzt von Markieren, Gefühlskarte, Straßen und Abgeschaut.

Vier Fragen auf der Altstadtkarte (heute gern dort, gern dort wenn schöner,
Autos stören, gut abschalten), gemalt auf einem 8-m-Raster. Zellen in
Gebäuden bleiben frei, die Farbe läuft in Straßen, Plätze und Höfe. Die
Auswertung zeigt, wo jemand gern wäre, es heute aber nicht ist, mit den
nächstgelegenen Ortsnamen. Kamera und Gesten teilen sich beide Prototypen
(`src/karte/kamera.ts`).

Dokumentation: `README.md` (dieses), `PLATTFORM.md` (Adressen, Deploy),
`OFFENE-PUNKTE.md` (was liegen geblieben ist).
