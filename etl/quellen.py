"""Gemeinsame Quellen der Geometrie-Skripte: ALKIS Tatsächliche Nutzung
(Landkreis Freising) und OpenStreetMap. Rohdaten landen in etl/roh/ und
werden nur geladen, wenn sie fehlen."""

import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

import shapefile  # pyshp
from pyproj import Transformer

WURZEL = Path(__file__).resolve().parent.parent
ROH = WURZEL / "etl" / "roh"
TN_ZIP = "https://download1.bayernwolke.de/a/tn/lkr/tn_09178.zip"
NACH_UTM = Transformer.from_crs(4326, 25832, always_xy=True)
NACH_WGS = Transformer.from_crs(25832, 4326, always_xy=True)


def lade(url, ziel):
    if not ziel.exists():
        ziel.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "innenstadt-etl/0.1"})
        with urllib.request.urlopen(req, timeout=300) as r:
            ziel.write_bytes(r.read())
    return ziel


def nutzung(bbox):
    """Flächen der Tatsächlichen Nutzung, die das Rechteck (UTM 32) berühren:
    Liste von (Datensatz, Ringe)."""
    z = lade(TN_ZIP, ROH / "tn_09178.zip")
    ordner = ROH / "tn"
    if not (ordner / "Nutzung.shp").exists():
        zipfile.ZipFile(z).extractall(ordner)
    r = shapefile.Reader(str(ordner / "Nutzung"), encoding="utf-8")
    out = []
    for i, sh in enumerate(r.iterShapes()):
        b = sh.bbox
        if b[0] < bbox[2] and b[2] > bbox[0] and b[1] < bbox[3] and b[3] > bbox[1]:
            teile = list(sh.parts) + [len(sh.points)]
            out.append((r.record(i), [sh.points[teile[k]:teile[k + 1]] for k in range(len(teile) - 1)]))
    return out


def osm(x0, y0, x1, y1, datei):
    """OSM-Daten im Rechteck (UTM 32), zwischengespeichert in etl/roh/<datei>."""
    lon0, lat0 = NACH_WGS.transform(x0, y0)
    lon1, lat1 = NACH_WGS.transform(x1, y1)
    url = f"https://api.openstreetmap.org/api/0.6/map?bbox={lon0:.6f},{lat0:.6f},{lon1:.6f},{lat1:.6f}"
    return ET.parse(lade(url, ROH / datei)).getroot()


def tags(e):
    return {t.get("k"): t.get("v") for t in e.findall("tag")}


def knoten(root):
    return {n.get("id"): NACH_UTM.transform(float(n.get("lon")), float(n.get("lat"))) for n in root.findall("node")}
