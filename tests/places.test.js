import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchKielsaBranches, toKielsaBranch } from '../server/places.js';

function place(id, city, name = 'Farmacia Kielsa') {
  return {
    id,
    displayName: { text: name },
    location: { latitude: 15.5, longitude: -88.0 },
    formattedAddress: `${name}, ${city}, Honduras`,
    addressComponents: [{ longText: city, types: ['locality'] }],
    businessStatus: 'OPERATIONAL',
  };
}

test('acepta solo sucursales Kielsa de San Pedro Sula con municipio verificado', () => {
  assert.ok(toKielsaBranch(place('sps', 'San Pedro Sula')));
  assert.equal(toKielsaBranch(place('choloma', 'Choloma')), null);
  assert.equal(toKielsaBranch(place('other', 'San Pedro Sula', 'Otra farmacia')), null);
  assert.equal(toKielsaBranch({ ...place('unknown', 'San Pedro Sula'), addressComponents: [] }), null);
  assert.equal(toKielsaBranch({
    ...place('conflict', 'Choloma'),
    addressComponents: [
      { longText: 'Choloma', types: ['locality'] },
      { longText: 'San Pedro Sula', types: ['administrative_area_level_2'] },
    ],
  }), null);
  assert.equal(toKielsaBranch({ ...place('closed', 'San Pedro Sula'), businessStatus: 'CLOSED_PERMANENTLY' }), null);
});

test('lee las páginas, elimina duplicados y mantiene fuera otras ciudades', async () => {
  const requested = [];
  const pages = [
    { places: [place('a', 'San Pedro Sula'), place('b', 'Choloma')], nextPageToken: 'second' },
    { places: [place('a', 'San Pedro Sula'), place('c', 'San Pedro Sula')] },
  ];
  const fakeFetch = async (_url, options) => {
    requested.push(JSON.parse(options.body));
    return { ok: true, json: async () => pages.shift() };
  };

  const result = await fetchKielsaBranches('test-key', fakeFetch);
  assert.deepEqual(result.branches.map(({ id }) => id), ['a', 'c']);
  assert.equal(result.excludedCount, 1);
  assert.equal(requested[0].pageToken, undefined);
  assert.equal(requested[1].pageToken, 'second');
});
