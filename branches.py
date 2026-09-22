"""Inventario activo y bloques geográficos de Kielsa SPS.

La asignación A, B y C procede de la hoja ``Bloques`` de
``Datos Precisos-kielsa.xlsx`` entregada por el equipo. K001 se añadió al
bloque A por su cercanía con K058 y K264. K094, K303 y K604 se excluyeron
por decisión del equipo.
"""

from __future__ import annotations

import csv
from pathlib import Path


BLOCKS = {
    "A": {"name": "Bloque A", "zone": "Oeste / Noroeste", "color": "#1677e8"},
    "B": {"name": "Bloque B", "zone": "Centro / Norte", "color": "#11a65b"},
    "C": {"name": "Bloque C", "zone": "Sur / Este", "color": "#f5a900"},
}

BLOCK_ASSIGNMENTS = {
    **{code: "A" for code in "K001 K003 K008 K046 K049 K050 K052 K058 K067 K075 K076 K091 K099 K112 K156 K171 K591 K264".split()},
    **{code: "B" for code in "K002 K019 K037 K053 K054 K056 K072 K084 K090 K093 K101 K142 K150 K194 K207 K222 K231 K253".split()},
    **{code: "C" for code in "K012 K014 K017 K018 K024 K063 K066 K085 K092 K102 K145 K168 K602 K226 K283 K301".split()},
}


def _coordinate(value: str) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def load_active_branches() -> list[dict]:
    """Devuelve las 52 sucursales activas, listas para el mapa."""
    source = Path(__file__).parent / "datos" / "sucursales_kielsa_sps_2026-09-18.csv"
    with source.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    branches = []
    for row in rows:
        lat, lng = _coordinate(row["latitud"]), _coordinate(row["longitud"])
        if lat == 0 and lng == 0:
            lat = lng = None
        code = row["codigo"]
        branches.append(
            {
                "id": code,
                "name": row["nombre_oficial"],
                "address": row["direccion_oficial"],
                "lat": lat,
                "lng": lng,
                "block": BLOCK_ASSIGNMENTS[code],
                "map_url": row["enlace_mapa"],
            }
        )
    return branches

