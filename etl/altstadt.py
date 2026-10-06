"""Karte der Altstadt für das Markieren.

Gebäude und Straßennamen aus OpenStreetMap, öffentliche Flächen (Straßen,
Plätze, Wege, Grün, Wasser) aus ALKIS Tatsächliche Nutzung. Alles in Meter um
die linke untere Ecke des Ausschnitts, geschrieben nach src/data/altstadt.json.

Aufruf aus der Repo-Wurzel:  python etl/altstadt.py
"""

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from quellen import NACH_UTM, WURZEL, knoten as lies_knoten, nutzung, osm, tags  # noqa: E402

# Ausschnitt: Altstadt mit Stadtplatz, Herrnstraße, Leinbergerstraße, Münster.
X0, Y0 = NACH_UTM.transform(11.9315, 48.4645)
X1, Y1 = NACH_UTM.transform(11.9405, 48.4705)

# Nutzungsarten, die als öffentlicher Raum gezeichnet werden.
ART = {
    "Straßenverkehr": "verkehr", "Weg": "verkehr", "Platz": "verkehr",
    "Sport-, Freizeit- und Erholungsfläche": "gruen", "Friedhof": "gruen", "Wald": "gruen", "Gehölz": "gruen",
    "Fließgewässer": "wasser", "Stehendes Gewässer": "wasser",
}


def m(p):
    return [round(p[0] - X0, 1), round(p[1] - Y0, 1)]


def main():
    flaechen = defaultdict(list)
    for rec, ringe in nutzung((X0, Y0, X1, Y1)):
        art = ART.get(rec["nutzart"])
        if art:
            flaechen[art].append([[m(p) for p in ring] for ring in ringe])

    root = osm(X0, Y0, X1, Y1, "altstadt.osm")
    knoten = lies_knoten(root)
    gebaeude = []
    strassen = defaultdict(list)  # Name -> Abschnitte
    for w in root.findall("way"):
        t = tags(w)
        pts = [knoten[nd.get("ref")] for nd in w.findall("nd") if nd.get("ref") in knoten]
        if len(pts) < 2:
            continue
        if "building" in t:
            gebaeude.append([m(p) for p in pts])
        elif t.get("name") and (t.get("highway") or t.get("waterway")):
            strassen[t["name"]].append(pts)

    # Eine Beschriftung je Name, mittig auf dem längsten Abschnitt, der im
    # Ausschnitt liegt. Ortsnamen ja, Betriebsnamen nein (Kanon K11).
    namen = []
    for name, abschnitte in strassen.items():
        best = None
        for pts in abschnitte:
            for a, b in zip(pts, pts[1:]):
                l = math.dist(a, b)
                mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                if X0 + 15 < mx < X1 - 15 and Y0 + 15 < my < Y1 - 15 and (not best or l > best[0]):
                    best = (l, mx, my, math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])))
        if best and best[0] > 12:
            namen.append({"name": name, "pos": m((best[1], best[2])), "winkel": round(best[3], 1)})

    daten = {
        "ort": "Altstadt",
        "einheit": "Meter, Ursprung unten links, x nach Osten, y nach Norden",
        "ursprung_utm32": [round(X0, 2), round(Y0, 2)],
        "groesse": [round(X1 - X0, 1), round(Y1 - Y0, 1)],
        "flaechen": flaechen,
        "gebaeude": gebaeude,
        "namen": namen,
        "quellen": [
            "Öffentliche Flächen: ALKIS Tatsächliche Nutzung, Bayerische Vermessungsverwaltung, CC BY 4.0",
            "Gebäude und Namen: © OpenStreetMap-Mitwirkende, ODbL",
        ],
    }
    ziel = WURZEL / "src" / "data" / "altstadt.json"
    ziel.write_text(json.dumps(daten, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{ziel.relative_to(WURZEL)}: {len(gebaeude)} Gebäude, "
          + ", ".join(f"{len(v)} {k}" for k, v in flaechen.items())
          + f", {len(namen)} Namen, {ziel.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
