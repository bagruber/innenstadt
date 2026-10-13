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


# Straßen, deren Abschnitte sich in „Straßen beruhigen“ antippen lassen.
FAHRSTRASSEN = {"primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "pedestrian"}


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
    fahr = []  # (Tags, Knoten-IDs) der Fahrstraßen
    for w in root.findall("way"):
        t = tags(w)
        if t.get("highway") in FAHRSTRASSEN and t.get("area") != "yes":
            fahr.append((t, [nd.get("ref") for nd in w.findall("nd") if nd.get("ref") in knoten]))
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

    # An Kreuzungen teilen: ein Knoten, den mehrere Fahrstraßen nutzen, oder
    # der mehrfach in derselben vorkommt, beendet einen Abschnitt.
    nutzung_knoten = defaultdict(int)
    for _, ids in fahr:
        for i in ids:
            nutzung_knoten[i] += 1
    roh = []  # (Tags, Knoten-IDs) je Stück zwischen Teilungspunkten
    for t, ids in fahr:
        stueck = [ids[0]]
        for i in ids[1:]:
            stueck.append(i)
            if nutzung_knoten[i] > 1 or i == ids[-1]:
                roh.append((t, stueck))
                stueck = [i]

    # OSM teilt Wege auch dort, wo sich nur ein Merkmal ändert (Parkregel,
    # Belag). Solche Fortsetzungen wieder zusammenfügen: an dem Punkt enden
    # genau zwei Stücke, und Name, Zustand und Einbahn stimmen überein.
    def zustand(t):
        return "fussgaenger" if t["highway"] == "pedestrian" else "beruhigt" if t["highway"] == "living_street" else "heute"

    def passt(a, b):
        return (a[0].get("name", "") == b[0].get("name", "") and zustand(a[0]) == zustand(b[0])
                and (a[0].get("oneway") == "yes") == (b[0].get("oneway") == "yes"))

    geaendert = True
    while geaendert:
        geaendert = False
        enden = defaultdict(list)
        for k, (_, ids) in enumerate(roh):
            enden[ids[0]].append(k)
            enden[ids[-1]].append(k)
        for knoten_id, ks in enden.items():
            if len(ks) != 2 or ks[0] == ks[1] or not passt(roh[ks[0]], roh[ks[1]]):
                continue
            (ta, a), (tb, b) = roh[ks[0]], roh[ks[1]]
            einbahn = ta.get("oneway") == "yes"
            if a[-1] == knoten_id and b[0] == knoten_id:
                ids = a + b[1:]
            elif b[-1] == knoten_id and a[0] == knoten_id:
                ids = b + a[1:]
            elif einbahn:
                continue  # Gegenläufige Einbahn-Stücke nicht verbinden
            elif a[-1] == knoten_id:
                ids = a + b[::-1][1:]
            else:
                ids = a[::-1] + b[1:]
            roh = [x for k, x in enumerate(roh) if k not in ks] + [(ta, ids)]
            geaendert = True
            break

    abschnitte = []
    for t, stueck in roh:
        pts = [knoten[k] for k in stueck]
        laenge = sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
        mitte_ = pts[len(pts) // 2]
        if laenge >= 6 and X0 < mitte_[0] < X1 and Y0 < mitte_[1] < Y1:
            abschnitte.append({
                # Mit dem zweiten Knoten: Bei Schleifen (Auf dem Plan) verbinden
                # zwei Wege dieselben Endpunkte.
                "id": f"{stueck[0]}-{stueck[1]}-{stueck[-1]}",
                "name": t.get("name", ""),
                "heute": zustand(t),
                "tempo": t.get("maxspeed"),
                "einbahn": t.get("oneway") == "yes",
                "laenge": round(laenge),
                "punkte": [m(p) for p in pts],
            })

    daten = {
        "ort": "Altstadt",
        "einheit": "Meter, Ursprung unten links, x nach Osten, y nach Norden",
        "ursprung_utm32": [round(X0, 2), round(Y0, 2)],
        "groesse": [round(X1 - X0, 1), round(Y1 - Y0, 1)],
        "flaechen": flaechen,
        "gebaeude": gebaeude,
        "namen": namen,
        "abschnitte": abschnitte,
        "quellen": [
            "Öffentliche Flächen: ALKIS Tatsächliche Nutzung, Bayerische Vermessungsverwaltung, CC BY 4.0",
            "Gebäude und Namen: © OpenStreetMap-Mitwirkende, ODbL",
        ],
    }
    ziel = WURZEL / "src" / "data" / "altstadt.json"
    ziel.write_text(json.dumps(daten, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{ziel.relative_to(WURZEL)}: {len(gebaeude)} Gebäude, "
          + ", ".join(f"{len(v)} {k}" for k, v in flaechen.items())
          + f", {len(namen)} Namen, {len(abschnitte)} Abschnitte, {ziel.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
