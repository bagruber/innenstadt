# Offene Punkte

## Vor dem ersten Deploy

- Actions-Secrets `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` setzen (siehe
  `PLATTFORM.md`).
- GitHub Pages in den Repo-Einstellungen auf „GitHub Actions“ stellen.
- `innenstadt/**` in die `exclude`-Liste von
  `moosburg-eu/.github/workflows/moosburg-eu.yml` eintragen.

## Baukasten Herrnstraße

- Ist-Zustand: Stellplätze, Bänke, Bäume, Pflanzkübel, Fahrradständer,
  Außengastro, Gehwegkanten. Vorlage siehe `docs/herrnstrasse/`.
- Richtkosten der Objekte vom Bauamt oder Bauhof; bis dahin Platzhalter-Punkte
  in `src/baukasten/katalog.ts`.
- Einlesen des eingetragenen Ist-Zustands: wird gegen die tatsächliche
  Illustrator-Ausgabe geschrieben, sobald sie vorliegt. Danach den
  Speicher-Schlüssel in `Baukasten.tsx` hochzählen, sonst sehen Rückkehrer
  ihren alten Stand mit geschätzten Stellplätzen.
- Der Durchgang im Osten gehört zur ALKIS-Fläche und ist damit bespielbar.
  Gewollt?
- Platzieren geht nur mit Zeiger oder Finger, nicht per Tastatur.
- Das Raster folgt der Hauptrichtung der Straße. Im Knick liegt es deshalb
  rund 20° schräg zu den Fassaden; ein Raster je Abschnitt wäre möglich.
- Die Katasterfläche reicht am Westende unter ein Gebäude (Arkaden oder
  Abweichung zu OSM). Gebäude blockieren, deshalb harmlos; vor Ort klären.

## Markieren

- Die Antworten bleiben im Browser. Zusammenführen aller Karten fehlt, ebenso
  die Ansicht „So haben andere gemalt“.
- Lärm fehlt als Frage.
- Zellen, deren Mitte frei ist, können halb unter einem Gebäude liegen; die
  Farbe ist dort nur teilweise sichtbar.

## Weitere Stationen

- Im Bild: Die Straßenskizze ist Platzhalter. Braucht zwei, drei Fotos der
  Herrnstraße aus Augenhöhe, dann ersetzt eines die Skizze; Horizont und
  Fluchtpunkt in `src/bild/Bild.tsx` daran anpassen.
- Swipe: Die 14 Vorschläge sind ein Entwurf. Pressestelle und Nicole sollten
  sie auf Ausgewogenheit und Lokalbezug prüfen.
- Lärm und Anreise: Der Vergleich nach Rollen (Anwohner gegen Gastronomie,
  Händlerschätzung gegen Kundschaft) braucht gesammelte Antworten.
- Abgeschaut: Hochladen, Prüfen und die gemeinsame Sammlung brauchen ein
  Backend mit Moderation. Bilder werden schon im Browser auf 1200 px
  verkleinert und neu kodiert, damit fallen Metadaten samt Aufnahmeort weg.
- Leerstand-QR („Was wäre hier drin?“) ist nicht gebaut: braucht eine
  Leerstandsliste und die Zustimmung der Eigentümer.
- Straßen: Abschnitte kommen aus OSM und sind teils sehr kurz (unter 10 m).
  Für die Auswertung reicht das, zum Antippen wären längere Abschnitte
  angenehmer.

## Bis zum Start

- `noindex` aus `index.html` nehmen, Eintrag in `llms.txt` und
  `sitemap.xml` von moosburg-eu.
- Impressum und Datenschutzerklärung für den Betrieb der Beteiligung.
