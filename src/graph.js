const EARTH_RADIUS_KM = 6371.0088;

export function haversineKm(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function buildGraph(branches, nearestCount = 2) {
  const nodes = [...branches];
  const edges = [];
  const seen = new Set();

  const addEdge = (a, b) => {
    if (a.id === b.id) return;
    const key = [a.id, b.id].sort().join('\u0000');
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from: a.id, to: b.id, km: haversineKm(a, b) });
  };

  // Un árbol de expansión conecta todas las sucursales, incluso si están aisladas
  // de sus vecinas más próximas.
  if (nodes.length > 1) {
    const visited = new Set([nodes[0].id]);
    while (visited.size < nodes.length) {
      let best = null;
      for (const a of nodes) {
        if (!visited.has(a.id)) continue;
        for (const b of nodes) {
          if (visited.has(b.id)) continue;
          const km = haversineKm(a, b);
          if (!best || km < best.km) best = { a, b, km };
        }
      }
      if (!best) break;
      addEdge(best.a, best.b);
      visited.add(best.b.id);
    }
  }

  // Dos vecinos por nodo hacen el grafo más útil para explorar rutas.
  for (const branch of nodes) {
    const nearest = nodes
      .filter((other) => other.id !== branch.id)
      .map((other) => ({ other, km: haversineKm(branch, other) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, nearestCount);
    for (const { other } of nearest) addEdge(branch, other);
  }

  return { nodes, edges };
}

export function shortestPath(graph, startId, endId) {
  const ids = new Set(graph.nodes.map((node) => node.id));
  if (!ids.has(startId) || !ids.has(endId)) return null;
  if (startId === endId) return { path: [startId], distanceKm: 0 };

  const adjacency = new Map([...ids].map((id) => [id, []]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ id: edge.to, km: edge.km });
    adjacency.get(edge.to)?.push({ id: edge.from, km: edge.km });
  }

  const distances = new Map([...ids].map((id) => [id, Infinity]));
  const previous = new Map();
  const unvisited = new Set(ids);
  distances.set(startId, 0);

  while (unvisited.size) {
    let current = null;
    for (const id of unvisited) {
      if (current === null || distances.get(id) < distances.get(current)) current = id;
    }
    if (current === null || distances.get(current) === Infinity) break;
    if (current === endId) break;
    unvisited.delete(current);
    for (const neighbor of adjacency.get(current)) {
      if (!unvisited.has(neighbor.id)) continue;
      const candidate = distances.get(current) + neighbor.km;
      if (candidate < distances.get(neighbor.id)) {
        distances.set(neighbor.id, candidate);
        previous.set(neighbor.id, current);
      }
    }
  }

  if (!Number.isFinite(distances.get(endId))) return null;
  const path = [];
  for (let id = endId; id !== undefined; id = previous.get(id)) path.unshift(id);
  return { path, distanceKm: distances.get(endId) };
}
