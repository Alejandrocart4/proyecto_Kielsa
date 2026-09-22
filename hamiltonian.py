"""Algoritmo de circuitos hamiltonianos y criterios de la Entrega 2."""

from __future__ import annotations

from math import inf


def build_adjacency(block: dict) -> dict[str, list[tuple[str, float]]]:
    """Construye un grafo no dirigido desde las aristas editables del bloque."""
    adjacency = {node["id"]: [] for node in block.get("nodes", [])}
    for edge in block.get("edges", []):
        origin, destination = edge.get("from"), edge.get("to")
        weight = float(edge.get("weight", 0))
        # Dos sucursales pueden estar dentro del mismo centro comercial y compartir
        # coordenadas. Una arista de 0 km sigue siendo válida entre nodos distintos.
        if origin not in adjacency or destination not in adjacency or origin == destination or weight < 0:
            continue
        adjacency[origin].append((destination, weight))
        adjacency[destination].append((origin, weight))
    return adjacency


def is_connected(adjacency: dict[str, list[tuple[str, float]]]) -> bool:
    """Verifica conectividad, condición básica antes de buscar un circuito."""
    if not adjacency:
        return False
    visited, pending = {next(iter(adjacency))}, [next(iter(adjacency))]
    while pending:
        current = pending.pop()
        for neighbor, _ in adjacency[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                pending.append(neighbor)
    return len(visited) == len(adjacency)


def evaluate_criteria(adjacency: dict[str, list[tuple[str, float]]]) -> dict:
    """Evalúa grado mínimo, Dirac y Ore; Dirac/Ore son suficientes, no obligatorios."""
    size = len(adjacency)
    degrees = {node: len(neighbors) for node, neighbors in adjacency.items()}
    minimum = min(degrees.values(), default=0)
    ore = size >= 3
    for node, neighbors in adjacency.items():
        adjacent = {neighbor for neighbor, _ in neighbors}
        for other in adjacency:
            if other != node and other not in adjacent and degrees[node] + degrees[other] < size:
                ore = False
    return {
        "n": size,
        "connected": is_connected(adjacency),
        "degrees": degrees,
        "minimum_degree": minimum >= 2,
        "dirac": size >= 3 and minimum >= size / 2,
        "ore": ore,
    }


def find_hamiltonian_cycle(block: dict, start_id: str) -> dict | None:
    """Busca por retroceso el ciclo válido con menor peso; nunca usa una ruta fija."""
    adjacency = build_adjacency(block)
    if start_id not in adjacency or len(adjacency) < 3:
        return None
    best_weight, best_path = inf, None
    visited, path = {start_id}, [start_id]

    def search(current: str, total: float) -> None:
        nonlocal best_weight, best_path
        if len(path) == len(adjacency):
            closing = next((weight for neighbor, weight in adjacency[current] if neighbor == start_id), None)
            if closing is not None and total + closing < best_weight:
                best_weight, best_path = total + closing, [*path, start_id]
            return
        for neighbor, weight in sorted(adjacency[current], key=lambda item: item[1]):
            if neighbor not in visited and total + weight < best_weight:
                visited.add(neighbor)
                path.append(neighbor)
                search(neighbor, total + weight)
                path.pop()
                visited.remove(neighbor)

    search(start_id, 0)
    return None if best_path is None else {"path": best_path, "total_weight": round(best_weight, 2)}


def analyze_block(block: dict, start_id: str) -> dict:
    adjacency = build_adjacency(block)
    return {"criteria": evaluate_criteria(adjacency), "cycle": find_hamiltonian_cycle(block, start_id)}
