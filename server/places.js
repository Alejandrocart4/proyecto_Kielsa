const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.addressComponents',
  'places.businessStatus',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

// Rectángulo de búsqueda alrededor del área urbana. La validación del municipio
// se hace por separado con los componentes de dirección de cada resultado.
export const SPS_SEARCH_RECTANGLE = {
  low: { latitude: 15.40, longitude: -88.14 },
  high: { latitude: 15.61, longitude: -87.89 },
};

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

export function isSanPedroSula(place) {
  const components = place.addressComponents ?? [];
  const localities = components.filter((component) => component.types?.includes('locality'));
  if (localities.length) {
    return localities.some((component) => normalize(component.longText) === 'san pedro sula');
  }
  return components.some((component) =>
    component.types?.includes('administrative_area_level_2')
    && normalize(component.longText) === 'san pedro sula');
}

export function toKielsaBranch(place) {
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!place.id || !name || !/\bkielsa\b/i.test(name)) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (place.businessStatus === 'CLOSED_PERMANENTLY') return null;
  if (!isSanPedroSula(place)) return null;

  return {
    id: place.id,
    name,
    lat,
    lng,
    address: place.formattedAddress || 'San Pedro Sula',
    googleMapsUri: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.id)}`,
  };
}

export async function fetchKielsaBranches(apiKey, fetchImpl = fetch) {
  if (!apiKey) throw new Error('Falta GOOGLE_MAPS_SERVER_KEY en el archivo .env.');

  const found = new Map();
  let excludedCount = 0;
  let pageToken;
  let pagesRead = 0;

  do {
    const body = {
      textQuery: 'Farmacia Kielsa',
      locationRestriction: { rectangle: SPS_SEARCH_RECTANGLE },
      pageSize: 20,
      languageCode: 'es',
      regionCode: 'HN',
      ...(pageToken ? { pageToken } : {}),
    };

    const response = await fetchImpl(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const reason = errorBody.error?.message || `HTTP ${response.status}`;
      throw new Error(`Google Places no pudo completar la búsqueda: ${reason}`);
    }

    const data = await response.json();
    for (const place of data.places ?? []) {
      const branch = toKielsaBranch(place);
      if (branch) found.set(branch.id, branch);
      else excludedCount += 1;
    }

    pageToken = data.nextPageToken;
    pagesRead += 1;
  } while (pageToken && pagesRead < 3);

  const branches = [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    branches,
    excludedCount,
    warning: pageToken
      ? 'Google alcanzó su límite de páginas; pueden faltar sucursales en los resultados.'
      : null,
  };
}
