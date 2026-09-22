"""Inventario activo y bloques geográficos de Kielsa SPS.

La asignación A, B y C y las coordenadas precisas proceden del CSV entregado
por el equipo. K001 se añadió al bloque B por su cercanía con K058 y K264;
K591 se añadió al bloque A por su cercanía con K003. K094, K303 y K604 se
excluyeron por decisión del equipo.
"""

from __future__ import annotations

import csv
from pathlib import Path
from urllib.parse import quote


BLOCKS = {
    "A": {"name": "Bloque A", "zone": "Oeste / Noroeste", "color": "#1677e8"},
    "B": {"name": "Bloque B", "zone": "Centro / Norte", "color": "#11a65b"},
    "C": {"name": "Bloque C", "zone": "Sur / Este", "color": "#f5a900"},
}

BLOCK_ASSIGNMENTS = {
    **{code: "A" for code in "K002 K003 K008 K024 K037 K046 K049 K050 K075 K091 K101 K112 K156 K222 K017 K018 K085 K054 K591".split()},
    **{code: "B" for code in "K056 K058 K067 K072 K076 K084 K090 K093 K099 K150 K194 K207 K142 K052 K053 K171 K253 K264 K001".split()},
    **{code: "C" for code in "K012 K014 K019 K066 K092 K102 K145 K168 K602 K226 K231 K063 K283 K301".split()},
}


def _coordinate(value: str) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def load_active_branches() -> list[dict]:
    """Devuelve las 52 sucursales activas con coordenadas precisas para el mapa."""
    data_directory = Path(__file__).parent / "datos"
    source = data_directory / "sucursales_kielsa_sps_2026-09-18.csv"
    with source.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    precise_source = data_directory / "sucursales_sin_K604_K094_K303.csv"
    with precise_source.open(encoding="utf-8-sig", newline="") as file:
        precise_rows = {row["id"]: row for row in csv.DictReader(file)}

    branches = []
    for row in rows:
        code = row["codigo"]
        precise = precise_rows.get(code)
        name = precise["nombre"] if precise else row["nombre_oficial"]
        address = precise["direccion"] if precise else row["direccion_oficial"]
        lat = _coordinate(precise["latitud"] if precise else row["latitud"])
        lng = _coordinate(precise["longitud"] if precise else row["longitud"])
        if lat == 0 and lng == 0:
            lat = lng = None
        map_url = f"https://www.google.com/maps/search/?api=1&query={quote(f'{lat},{lng}')}" if lat is not None else row["enlace_mapa"]
        branches.append(
            {
                "id": code,
                "name": f"{code} {name}",
                "address": address,
                "lat": lat,
                "lng": lng,
                "block": BLOCK_ASSIGNMENTS[code],
                "map_url": map_url,
            }
        )
    return branches
