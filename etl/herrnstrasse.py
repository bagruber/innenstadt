"""Geometrie der Herrnstraße für den Baukasten.

Holt die Straßenfläche aus ALKIS Tatsächliche Nutzung (Landkreis Freising) und
Gebäude sowie Bestand aus OpenStreetMap, rechnet alles in Meter um einen
festen Ursprung und schreibt

  src/data/herrnstrasse.json        für die App
  docs/herrnstrasse/vorlage.svg     zum Eintragen des Ist-Zustands

Aufruf aus der Repo-Wurzel:  python etl/herrnstrasse.py
Braucht pyshp und pyproj. Rohdaten landen in etl/roh/ und werden nur geladen,
wenn sie fehlen.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quellen import WURZEL, knoten as lies_knoten, nutzung, osm, tags  # noqa: E402

STRASSE = "Herrnstraße"
# Den Namen gibt es im Landkreis mehrfach; gemeint ist die in der Moosburger
# Altstadt (Stadtplatz, UTM 32).
ALTSTADT = (716900, 5372300, 717300, 5372700)
RAND = 25  # Meter Umgebung um die Straßenfläche


def strassenflaeche():
    treffer = [ringe for rec, ringe in nutzung(ALTSTADT) if rec["nutzart"] == "Straßenverkehr" and rec["name"] == STRASSE]
    if len(treffer) != 1:
        raise SystemExit(f"{len(treffer)} Flächen „{STRASSE}“ gefunden, erwartet genau eine")
    return treffer[0]


def main():
    ringe = strassenflaeche()
    xs = [p[0] for ring in ringe for p in ring]
    ys = [p[1] for ring in ringe for p in ring]
    x0, y0, x1, y1 = min(xs) - RAND, min(ys) - RAND, max(xs) + RAND, max(ys) + RAND

    # Ursprung unten links, Meter nach Osten (x) und Norden (y), 0,1 m genau.
    def m(x, y):
        return [round(x - x0, 1), round(y - y0, 1)]

    root = osm(x0, y0, x1, y1, "herrnstrasse.osm")
    knoten = lies_knoten(root)

    gebaeude, achse = [], []
    for w in root.findall("way"):
        t = tags(w)
        pts = [knoten[nd.get("ref")] for nd in w.findall("nd") if nd.get("ref") in knoten]
        if len(pts) < 2:
            continue
        if "building" in t:
            gebaeude.append([m(*p) for p in pts])
        elif t.get("highway") and t.get("name") == STRASSE:
            achse.append({
                "punkte": [m(*p) for p in pts],
                "einbahn": t.get("oneway") == "yes",
                "tempo": t.get("maxspeed"),
                "parken": {k: v for k, v in t.items() if k.startswith("parking")},
                "osm": int(w.get("id")),
            })

    # Bestand als Punkte. Bewusst ohne Namen von Betrieben (Kanon K11).
    arten = {
        ("natural", "tree"): "baum",
        ("amenity", "bench"): "bank",
        ("amenity", "fountain"): "brunnen",
        ("amenity", "drinking_water"): "trinkwasser",
        ("amenity", "bicycle_parking"): "fahrradstaender",
        ("amenity", "waste_basket"): "abfall",
        ("highway", "street_lamp"): "laterne",
        ("barrier", "bollard"): "poller",
    }
    bestand, laeden = [], []
    for n in root.findall("node"):
        t = tags(n)
        x, y = knoten[n.get("id")]
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            continue
        for (k, v), art in arten.items():
            if t.get(k) == v:
                bestand.append({"art": art, "pos": m(x, y), "osm": int(n.get("id"))})
        if "shop" in t or t.get("amenity") in ("cafe", "restaurant", "bar", "pub", "ice_cream"):
            laeden.append({"pos": m(x, y), "name": t.get("name", "")})

    daten = {
        "ort": STRASSE,
        "einheit": "Meter, Ursprung unten links, x nach Osten, y nach Norden",
        "ursprung_utm32": [round(x0, 2), round(y0, 2)],
        "groesse": [round(x1 - x0, 1), round(y1 - y0, 1)],
        "flaeche": [[m(*p) for p in ring] for ring in ringe],
        "achse": achse,
        "gebaeude": gebaeude,
        "bestand": bestand,
        "quellen": [
            "Straßenfläche: ALKIS Tatsächliche Nutzung, Bayerische Vermessungsverwaltung, CC BY 4.0",
            "Gebäude und Bestand: © OpenStreetMap-Mitwirkende, ODbL",
        ],
    }
    ziel = WURZEL / "src" / "data" / "herrnstrasse.json"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(daten, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    schreibe_vorlage(daten, laeden)
    flaeche = sum(abs(polygonflaeche(r)) for r in daten["flaeche"])
    print(f"{ziel.relative_to(WURZEL)}: {len(gebaeude)} Gebäude, {len(bestand)} Bestand, Straßenfläche {flaeche:.0f} m²")


def polygonflaeche(ring):
    return sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2


# Ebenen, in die der Ist-Zustand eingetragen wird. Reihenfolge = Reihenfolge
# im Ebenen-Bedienfeld. Form gibt vor, womit gezeichnet wird.
EBENEN = [
    ("stellplaetze", "Stellplätze", "Rechteck je Stellplatz"),
    ("stellplaetze-besonders", "Stellplätze mit Regel", "Rechteck, Regel als Ebenen- oder Objektname: Behinderte, Liefer, Kurzzeit, Anwohner"),
    ("gehwegkante", "Bordstein und Gehwegkante", "Linie"),
    ("baeume", "Bäume", "Kreis, Durchmesser = Krone"),
    ("kuebel", "Pflanzkübel und Beete", "Kreis oder Rechteck"),
    ("sitzen", "Bänke und Sitzgelegenheiten", "Rechteck"),
    ("fahrrad", "Fahrradständer", "Rechteck"),
    ("aussengastro", "Außengastronomie im Sommer", "Fläche"),
    ("deko", "Vorhandene Deko", "Punkt oder Linie: Lichterketten, Fahnen, Blumenampeln"),
    ("hindernisse", "Poller, Schaltkästen, Schilder, Laternen", "Punkt"),
    ("eingaenge", "Laden- und Hauseingänge", "kurze Linie an der Fassade"),
    ("anmerkungen", "Anmerkungen", "Text"),
]


def schreibe_vorlage(d, laeden):
    s = 10  # 1 m = 10 px, damit sich in Illustrator direkt messen lässt
    w, h = d["groesse"]
    W, H = round(w * s), round(h * s)

    def p(pt):
        return f"{pt[0] * s:.1f},{(h - pt[1]) * s:.1f}"

    def pfad(ring, zu=True):
        return "M" + " L".join(p(pt) for pt in ring) + (" Z" if zu else "")

    farbe = {"baum": "#1f3b2d", "bank": "#6e5a30", "brunnen": "#123b4a", "trinkwasser": "#123b4a",
             "fahrradstaender": "#6d0818", "abfall": "#6f6b63", "laterne": "#6f6b63", "poller": "#6f6b63"}
    z = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         "<!-- Maßstab 1 m = 10 px. Grundlage gesperrt lassen, in die leeren Ebenen zeichnen. -->",
         '<g id="grundlage">',
         f'<rect width="{W}" height="{H}" fill="#faf7f2"/>',
         '<g id="strassenflaeche-alkis">']
    for ring in d["flaeche"]:
        z.append(f'<path d="{pfad(ring)}" fill="#ece5d6" stroke="#b8964e" stroke-width="1.5"/>')
    z.append('</g><g id="gebaeude-osm">')
    for g in d["gebaeude"]:
        z.append(f'<path d="{pfad(g)}" fill="#1c1c1c" fill-opacity=".85"/>')
    z.append('</g><g id="achse-osm">')
    for a in d["achse"]:
        z.append(f'<path d="{pfad(a["punkte"], False)}" fill="none" stroke="#c8102e" stroke-width="1" stroke-dasharray="6 4"/>')
    z.append('</g><g id="bestand-osm">')
    for b in d["bestand"]:
        x, y = p(b["pos"]).split(",")
        z.append(f'<circle cx="{x}" cy="{y}" r="6" fill="{farbe[b["art"]]}"><title>{b["art"]} (OSM {b["osm"]})</title></circle>')
    z.append('</g><g id="laeden-osm" font-family="sans-serif" font-size="11" fill="#555">')
    for l in laeden:
        x, y = p(l["pos"]).split(",")
        z.append(f'<circle cx="{x}" cy="{y}" r="2.5" fill="#555"/>')
        if l["name"]:
            name = l["name"].replace("&", "&amp;").replace("<", "&lt;").replace('"', "&quot;")
            z.append(f'<text x="{float(x) + 5:.1f}" y="{float(y) + 4:.1f}">{name}</text>')
    z.append("</g>")
    # Maßstab und Nordpfeil
    z.append(f'<g id="massstab" font-family="sans-serif" font-size="12" fill="#1c1c1c">'
             f'<rect x="20" y="{H - 30}" width="{10 * s}" height="5"/><text x="20" y="{H - 36}">10 m</text>'
             f'<path d="M{W - 30},{H - 60} l8,22 h-16 z"/><text x="{W - 34}" y="{H - 64}">N</text></g>')
    z.append("</g>")
    for gid, name, _ in EBENEN:
        z.append(f'<g id="{gid}"><title>{name}</title></g>')
    z.append("</svg>")
    ziel = WURZEL / "docs" / "herrnstrasse" / "vorlage.svg"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text("\n".join(z), encoding="utf-8")


if __name__ == "__main__":
    main()
