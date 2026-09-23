"""Inventario activo y bloques geográficos de Kielsa SPS.

La asignación A, B y C y las coordenadas precisas proceden del CSV entregado
por el equipo. K001 se añadió al bloque B por su cercanía con K058 y K264;
K591 se añadió al bloque A por su cercanía con K003. K094, K303 y K604 se
excluyeron por decisión del equipo.
"""

from __future__ import annotations

import csv
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from copy import deepcopy
from urllib.parse import quote


BLOCKS = {
    "A": {"name": "Bloque A", "zone": "Oeste / Noroeste", "color": "#1677e8"},
    "B": {"name": "Bloque B", "zone": "Centro / Norte", "color": "#11a65b"},
    "C": {"name": "Bloque C", "zone": "Sur / Este", "color": "#f5a900"},
}

EXCLUDED_BRANCHES = {"K001", "K591", "K094", "K303", "K604"}

BLOCK_ASSIGNMENTS = {
    **{code: "A" for code in "K002 K003 K008 K024 K037 K046 K049 K050 K091 K101 K112 K156 K222 K017 K018 K085 K054".split()},
    **{code: "B" for code in "K056 K058 K067 K072 K075 K076 K084 K090 K093 K099 K150 K194 K207 K142 K052 K053 K171 K253 K260 K264".split()},
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
        if code in EXCLUDED_BRANCHES:
            continue
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


def _distance_km(first: dict, second: dict) -> float:
    """Calcula una distancia geográfica solo para proponer vecinos iniciales."""
    latitude_1, longitude_1 = radians(first["lat"]), radians(first["lng"])
    latitude_2, longitude_2 = radians(second["lat"]), radians(second["lng"])
    value = sin((latitude_2 - latitude_1) / 2) ** 2 + cos(latitude_1) * cos(latitude_2) * sin((longitude_2 - longitude_1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(value))


def _nearest_cycle(nodes: list[dict]) -> list[dict]:
    """Ordena nodos por vecinos cercanos para crear un ciclo editable de partida."""
    pending = nodes.copy()
    current = min(pending, key=lambda node: (node["lat"], node["lng"]))
    ordered = [current]
    pending.remove(current)
    while pending:
        following = min(pending, key=lambda node: _distance_km(current, node))
        ordered.append(following)
        pending.remove(following)
        current = following
    return ordered


def build_real_route_blocks() -> list[dict]:
    """Crea los subgrafos A, B y C con todas las sucursales y dos vecinos por nodo.

    Los pesos iniciales son distancias geográficas para que Python pueda comprobar
    el ciclo. La interfaz los sustituye con distancias reales de Google Maps antes
    de presentar el recorrido final.
    """
    branches = load_active_branches()
    route_blocks = []
    for identifier, info in BLOCKS.items():
        assigned = [branch for branch in branches if branch["block"] == identifier and branch["lat"] is not None]
        ordered = _nearest_cycle(assigned)
        nodes = [{"id": branch["id"], "name": branch["name"], "lat": branch["lat"], "lng": branch["lng"]} for branch in ordered]
        edges = []
        for index, origin in enumerate(ordered):
            destination = ordered[(index + 1) % len(ordered)]
            edges.append({"from": origin["id"], "to": destination["id"], "weight": round(_distance_km(origin, destination), 2)})
        route_blocks.append(
            {
                "id": identifier,
                "name": f"Bloque {identifier} ({len(nodes)} sucursales)",
                "criterion": f"{info['zone']}. Conexión inicial de cada sucursal con dos vecinos cercanos.",
                "weight_source": "Estimación geográfica inicial. Actualiza con Google Maps antes de usar el resultado final.",
                "nodes": nodes,
                "edges": edges,
            }
        )
    return route_blocks


def prepare_route_from_candidate(block: dict, candidate: dict) -> dict:
    """Inserta una sede en un ciclo de sucursales como salida y regreso.

    Se sustituye una arista del ciclo por dos aristas que pasan por la sede.
    Así la sede aparece solo como inicio y final, y cada sucursal se visita una vez.
    """
    required = {"id", "name", "lat", "lng"}
    if not required.issubset(candidate):
        raise ValueError("La sede seleccionada no tiene coordenadas completas.")
    result = deepcopy(block)
    if any(node["id"] == candidate["id"] for node in result["nodes"]):
        return result
    nodes_by_id = {node["id"]: node for node in result["nodes"]}
    candidate_node = {"id": candidate["id"], "name": candidate["name"], "lat": float(candidate["lat"]), "lng": float(candidate["lng"])}
    if not result["edges"]:
        raise ValueError("El bloque no tiene conexiones para formar un circuito.")

    def detour(edge: dict) -> float:
        origin, destination = nodes_by_id[edge["from"]], nodes_by_id[edge["to"]]
        return _distance_km(candidate_node, origin) + _distance_km(candidate_node, destination) - float(edge["weight"])

    replaced = min(result["edges"], key=detour)
    result["edges"].remove(replaced)
    origin, destination = nodes_by_id[replaced["from"]], nodes_by_id[replaced["to"]]
    result["nodes"].append(candidate_node)
    result["edges"].extend(
        [
            {"from": candidate_node["id"], "to": origin["id"], "weight": round(_distance_km(candidate_node, origin), 2)},
            {"from": candidate_node["id"], "to": destination["id"], "weight": round(_distance_km(candidate_node, destination), 2)},
        ]
    )
    result["name"] = f"{block['name']} desde {candidate['name']}"
    result["weight_source"] = "Estimación inicial incluida la sede. Actualiza con Google Maps antes de usar el resultado final."
    return result
