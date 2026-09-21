import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateHamiltonianCriteria, buildAdjacency, findHamiltonianCycle } from '../src/hamiltonian.js';

const square = { nodes:[{id:'A'},{id:'B'},{id:'C'},{id:'D'}], edges:[{from:'A',to:'B',weight:2},{from:'B',to:'C',weight:1},{from:'C',to:'D',weight:3},{from:'D',to:'A',weight:4}] };
test('encuentra el ciclo de cuatro nodos y suma sus pesos', () => {
  const cycle = findHamiltonianCycle(square, 'A');
  assert.deepEqual(cycle.path, ['A','B','C','D','A']);
  assert.equal(cycle.totalWeight, 10);
});
test('reconoce Dirac y Ore en un ciclo de cuatro nodos', () => {
  const result = evaluateHamiltonianCriteria(buildAdjacency(square));
  assert.equal(result.connected, true); assert.equal(result.dirac, true); assert.equal(result.ore, true);
});
