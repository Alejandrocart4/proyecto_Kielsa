"""Verifica las coordenadas de Kielsa contra los enlaces de Google Maps del Excel.

Uso:
    python scripts/verificar_ubicaciones.py
    python scripts/verificar_ubicaciones.py --actualizar

El primer comando crea el reporte en datos/auditoria_ubicaciones_google_maps.csv.
Con --actualizar, las coordenadas verificadas sustituyen las del CSV que usa la app.
"""

from __future__ import annotations

import argparse
import csv
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as element_tree
import zipfile
from math import asin, cos, radians, sin, sqrt
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "datos"
EXCEL = DATA / "Datos Precisos-kielsa.xlsx"
BRANCHES = DATA / "sucursales_sin_K604_K094_K303.csv"
OFFICIAL_BRANCHES = DATA / "sucursales_kielsa_sps_2026-09-18.csv"
REPORT = DATA / "auditoria_ubicaciones_google_maps.csv"
NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Conserva la URL de destino que devuelve maps.app.goo.gl."""

    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


def distance_km(lat_1: float, lng_1: float, lat_2: float, lng_2: float) -> float:
    lat_1, lng_1, lat_2, lng_2 = map(radians, (lat_1, lng_1, lat_2, lng_2))
    value = sin((lat_2 - lat_1) / 2) ** 2 + cos(lat_1) * cos(lat_2) * sin((lng_2 - lng_1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(value))


def excel_rows() -> dict[str, dict[str, str]]:
    """Lee la hoja Sucursales sin modificar el libro de Excel."""
    with zipfile.ZipFile(EXCEL) as workbook:
        strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared = element_tree.fromstring(workbook.read("xl/sharedStrings.xml"))
            strings = ["".join(node.text or "" for node in item.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")) for item in shared]
        worksheet = element_tree.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
        table: list[list[str]] = []
        for row in worksheet.findall(".//m:sheetData/m:row", NAMESPACE):
            values = []
            for cell in row.findall("m:c", NAMESPACE):
                value = cell.findtext("m:v", default="", namespaces=NAMESPACE)
                if cell.attrib.get("t") == "s" and value:
                    value = strings[int(value)]
                values.append(value)
            table.append(values)
    headers = table[0]
    return {row[0]: dict(zip(headers, row)) for row in table[1:] if row and row[0].startswith("K")}


def google_coordinates(url: str) -> tuple[float, float, str]:
    """Obtiene el punto guardado por Google Maps en un enlace corto."""
    opener = urllib.request.build_opener(NoRedirect)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        response = opener.open(request, timeout=15)
        location = response.headers.get("Location", "")
    except urllib.error.HTTPError as error:
        location = error.headers.get("Location", "")

    decoded = urllib.parse.unquote(location)
    point = re.search(r"!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)", decoded)
    if not point:
        point = re.search(r"/maps/search/(-?\d+(?:\.\d+)?),\+?(-?\d+(?:\.\d+)?)", decoded)
    if not point:
        raise ValueError("El enlace no incluye coordenadas de Google Maps.")
    title = ""
    if "/maps/place/" in decoded:
        title = decoded.split("/maps/place/", 1)[1].split("/@", 1)[0].replace("+", " ")
    return float(point.group(1)), float(point.group(2)), title


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--actualizar", action="store_true", help="Actualiza el CSV usado por la aplicación.")
    update = parser.parse_args().actualizar

    excel = excel_rows()
    with BRANCHES.open(encoding="utf-8-sig", newline="") as file:
        branches = list(csv.DictReader(file))
        fields = file.seek(0) or csv.DictReader(file).fieldnames
    report = []
    reviewed_codes = set()
    changed = 0
    for branch in branches:
        reviewed_codes.add(branch["id"])
        source = excel.get(branch["id"])
        item = {
            "id": branch["id"], "nombre": branch["nombre"], "app_latitud": branch["latitud"],
            "app_longitud": branch["longitud"], "google_latitud": "", "google_longitud": "",
            "diferencia_km": "", "estado": "sin_enlace_excel", "titulo_google": "", "url_maps": "",
        }
        if source:
            item["url_maps"] = source.get("url_maps", "")
            try:
                latitude, longitude, title = google_coordinates(item["url_maps"])
                difference = distance_km(float(branch["latitud"]), float(branch["longitud"]), latitude, longitude)
                item.update({"google_latitud": latitude, "google_longitud": longitude, "diferencia_km": round(difference, 3), "estado": "verificada", "titulo_google": title})
                if update:
                    branch["latitud"] = f"{latitude:.7f}"
                    branch["longitud"] = f"{longitude:.7f}"
                    changed += 1
            except (OSError, ValueError) as error:
                item["estado"] = f"error: {error}"
        report.append(item)

    # K001 y K591 permanecen activos en la aplicación, pero no están en el Excel
    # de enlaces. Se conservan con la coordenada oficial obtenida de Kielsa.
    with OFFICIAL_BRANCHES.open(encoding="utf-8-sig", newline="") as file:
        official_rows = list(csv.DictReader(file))
    for official in official_rows:
        code = official["codigo"]
        if code in reviewed_codes or code not in {"K001", "K591"}:
            continue
        report.append({
            "id": code, "nombre": official["nombre_oficial"], "app_latitud": official["latitud"],
            "app_longitud": official["longitud"], "google_latitud": "", "google_longitud": "",
            "diferencia_km": "", "estado": "coordenada_oficial_kielsa", "titulo_google": "",
            "url_maps": official["enlace_mapa"],
        })

    report_fields = ["id", "nombre", "app_latitud", "app_longitud", "google_latitud", "google_longitud", "diferencia_km", "estado", "titulo_google", "url_maps"]
    with REPORT.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=report_fields)
        writer.writeheader()
        writer.writerows(report)
    if update:
        with BRANCHES.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            writer.writerows(branches)

    verified = sum(item["estado"] == "verificada" for item in report)
    official = sum(item["estado"] == "coordenada_oficial_kielsa" for item in report)
    print(f"Verificadas en Google Maps: {verified}. Conservadas de la fuente oficial de Kielsa: {official}. Coordenadas actualizadas: {changed}. Reporte: {REPORT}")


if __name__ == "__main__":
    main()
