import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGraph, shortestPath } from '../src/graph.js';

const branches = [
  { id: 'A', lat: 15.5, lng: -88.0 },
  { id: 'B', lat: 15.5, lng: -87.99 },
  { id: 'C', lat: 15.51, lng: -87.99 },
  { id: 'D', lat: 15.51, lng: -88.0 },
];

test('el grafo conecta todas las sucursales y no repite aristas', () => {
  const graph = buildGraph(branches, 1);
  const keys = graph.edges.map(({ from, to }) => [from, to].sort().join(':'));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(graph.edges.length >= branches.length - 1);
  assert.ok(shortestPath(graph, 'A', 'C'));
});

test('Dijkstra elige el camino de menor peso dentro del grafo', () => {
  const graph = {
    nodes: branches,
    edges: [
      { from: 'A', to: 'B', km: 1 },
      { from: 'B', to: 'C', km: 1 },
      { from: 'A', to: 'C', km: 5 },
    ],
  };
  assert.deepEqual(shortestPath(graph, 'A', 'C'), {
    path: ['A', 'B', 'C'],
    distanceKm: 2,
  });
  assert.equal(shortestPath(graph, 'A', 'missing'), null);
});
