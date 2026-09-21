/**
 * Convierte el bloque editable en una lista de vecinos. El grafo se trata como
 * no dirigido porque el Avance 1 propone usar el mismo peso en ambos sentidos.
 */
export function buildAdjacency(block) {
  const adjacency = new Map(block.nodes.map((node) => [node.id, []]));
  for (const edge of block.edges) {
    if (!adjacency.has(edge.from) || !adjacency.has(edge.to) || edge.from === edge.to) continue;
    const weight = Number(edge.weight);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    adjacency.get(edge.from).push({ id: edge.to, weight });
    adjacency.get(edge.to).push({ id: edge.from, weight });
  }
  return adjacency;
}

export function isConnected(adjacency, start) {
  if (!adjacency.size) return false;
  const visited = new Set([start]);
  const pending = [start];
  while (pending.length) {
    const current = pending.pop();
    for (const neighbor of adjacency.get(current) || []) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        pending.push(neighbor.id);
      }
    }
  }
  return visited.size === adjacency.size;
}

/**
 * Evalúa Dirac y Ore como criterios suficientes. Aunque uno no se cumpla,
 * el algoritmo de búsqueda aún puede encontrar un circuito hamiltoniano.
 */
export function evaluateHamiltonianCriteria(adjacency) {
  const ids = [...adjacency.keys()];
  const n = ids.length;
  const degrees = Object.fromEntries(ids.map((id) => [id, (adjacency.get(id) || []).length]));
  const connected = n > 0 && isConnected(adjacency, ids[0]);
  const minDegree = n ? Math.min(...Object.values(degrees)) : 0;
  const dirac = n >= 3 && minDegree >= n / 2;
  let ore = n >= 3;
  for (let index = 0; index < ids.length; index += 1) {
    for (let other = index + 1; other < ids.length; other += 1) {
      const adjacent = (adjacency.get(ids[index]) || []).some((neighbor) => neighbor.id === ids[other]);
      if (!adjacent && degrees[ids[index]] + degrees[ids[other]] < n) ore = false;
    }
  }
  return { n, connected, degrees, minDegree, dirac, ore, minimumDegree: minDegree >= 2 };
}

/**
 * Búsqueda con retroceso. No usa un recorrido fijo: explora las conexiones
 * que el usuario haya creado y conserva el ciclo válido de menor peso total.
 */
export function findHamiltonianCycle(block, startId) {
  const adjacency = buildAdjacency(block);
  const ids = [...adjacency.keys()];
  if (!ids.includes(startId) || ids.length < 3) return null;

  let best = null;
  const visited = new Set([startId]);
  const path = [startId];

  function search(current, totalWeight) {
    if (path.length === ids.length) {
      const closingEdge = (adjacency.get(current) || []).find((neighbor) => neighbor.id === startId);
      if (closingEdge) {
        const candidate = { path: [...path, startId], totalWeight: totalWeight + closingEdge.weight };
        if (!best || candidate.totalWeight < best.totalWeight) best = candidate;
      }
      return;
    }

    // Se prueban primero aristas cortas para encontrar pronto una buena solución.
    const candidates = [...(adjacency.get(current) || [])]
      .filter((neighbor) => !visited.has(neighbor.id))
      .sort((a, b) => a.weight - b.weight);
    for (const neighbor of candidates) {
      if (best && totalWeight + neighbor.weight >= best.totalWeight) continue;
      visited.add(neighbor.id);
      path.push(neighbor.id);
      search(neighbor.id, totalWeight + neighbor.weight);
      path.pop();
      visited.delete(neighbor.id);
    }
  }

  search(startId, 0);
  return best;
}
