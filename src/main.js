import './style.css';
import { avance1Blocks } from './data.js';
import { buildAdjacency, evaluateHamiltonianCriteria, findHamiltonianCycle } from './hamiltonian.js';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim();
const clone = (value) => JSON.parse(JSON.stringify(value));
const saved = localStorage.getItem('kielsa-hamiltonian-blocks');
let blocks = saved ? JSON.parse(saved) : clone(avance1Blocks);
let selectedBlockId = blocks[0].id;

const el = Object.fromEntries(['block-select', 'start-select', 'analyze-button', 'reset-button', 'node-form', 'node-name', 'node-list', 'edge-form', 'edge-from', 'edge-to', 'edge-weight', 'edge-list', 'analysis-result', 'road-route-button', 'map-status', 'map'].map((id) => [id, document.querySelector(`#${id}`)]));
const maps = { instance: null, markers: [], polylines: [], routeClass: null, ready: null };
let lastCycle = null;
const block = () => blocks.find((item) => item.id === selectedBlockId);
const persist = () => localStorage.setItem('kielsa-hamiltonian-blocks', JSON.stringify(blocks));
const escape = (text) => String(text).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));

function options(items, selected) { return items.map((item) => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escape(item.name)}</option>`).join(''); }
function render(preserveRoads = false) {
  const current = block();
  el['block-select'].innerHTML = options(blocks, selectedBlockId);
  const start = el['start-select'].value && current.nodes.some((item) => item.id === el['start-select'].value) ? el['start-select'].value : current.nodes[0]?.id;
  el['start-select'].innerHTML = options(current.nodes, start);
  el['edge-from'].innerHTML = options(current.nodes, current.nodes[0]?.id);
  el['edge-to'].innerHTML = options(current.nodes, current.nodes[1]?.id || current.nodes[0]?.id);
  el['node-list'].innerHTML = current.nodes.map((item) => `<li><span>${escape(item.name)}</span><button data-remove-node="${item.id}" aria-label="Eliminar ${escape(item.name)}">Eliminar</button></li>`).join('') || '<li>No hay nodos.</li>';
  const names = new Map(current.nodes.map((item) => [item.id, item.name]));
  el['edge-list'].innerHTML = current.edges.map((item, index) => `<div class="edge-row"><span>${escape(names.get(item.from) || item.from)}</span><strong>${Number(item.weight).toFixed(2)} km</strong><span>${escape(names.get(item.to) || item.to)}</span><button data-remove-edge="${index}">Eliminar</button></div>`).join('') || '<p class="hint">Agrega las conexiones del bloque.</p>';
  renderMapMarkers(preserveRoads);
}

function analyze() {
  const current = block();
  const adjacency = buildAdjacency(current);
  const criteria = evaluateHamiltonianCriteria(adjacency);
  const result = findHamiltonianCycle(current, el['start-select'].value);
  const names = new Map(current.nodes.map((item) => [item.id, item.name]));
  const degrees = Object.entries(criteria.degrees).map(([id, degree]) => `${escape(names.get(id) || id)}: ${degree}`).join(' · ');
  const cycle = result ? result.path.map((id) => escape(names.get(id) || id)).join(' → ') : 'No se encontró un circuito con las conexiones actuales.';
  lastCycle = result;
  el['road-route-button'].disabled = !result;
  el['analysis-result'].innerHTML = `<p><strong>Criterio de subdivisión:</strong> ${escape(current.criterion)}</p><div class="checks"><span class="${criteria.connected ? 'pass':'fail'}">${criteria.connected ? '✓':'✕'} Grafo conexo</span><span class="${criteria.minimumDegree ? 'pass':'fail'}">${criteria.minimumDegree ? '✓':'✕'} Grado mínimo ≥ 2</span><span class="${criteria.dirac ? 'pass':'fail'}">${criteria.dirac ? '✓':'✕'} Dirac</span><span class="${criteria.ore ? 'pass':'fail'}">${criteria.ore ? '✓':'✕'} Ore</span></div><p><strong>Grados:</strong> ${degrees || 'sin nodos'}</p><h3>${result ? `Circuito encontrado · ${result.totalWeight.toFixed(2)} km` : 'Sin circuito hamiltoniano'}</h3><p class="cycle">${cycle}</p><p class="hint">Dirac y Ore son criterios suficientes. Si no se cumplen, la búsqueda aún puede encontrar un circuito.</p>`;
}

// Carga Google Maps solo cuando existe una clave de navegador en .env.
function loadGoogleMaps() {
  if (maps.ready) return maps.ready;
  if (!MAPS_KEY) return Promise.reject(new Error('Falta VITE_GOOGLE_MAPS_BROWSER_KEY en el archivo .env.'));
  maps.ready = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly`;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
    document.head.append(script);
  });
  return maps.ready;
}

async function initialiseMap() {
  try {
    await loadGoogleMaps();
    const [{ Map }, { Route }] = await Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('routes')]);
    maps.routeClass = Route;
    maps.instance = new Map(el.map, { center: { lat: 15.5042, lng: -88.025 }, zoom: 12, mapTypeControl: true, streetViewControl: false });
    el['map-status'].textContent = 'Google Maps listo. Selecciona un bloque y luego solicita su recorrido.';
    renderMapMarkers();
  } catch (error) {
    el['map-status'].textContent = `${error.message} Habilita Maps JavaScript API y Routes API en el mismo proyecto de Google Cloud.`;
  }
}

function validCoordinates(item) { return Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)); }
function clearMapMarkers() {
  maps.markers.forEach((marker) => marker.setMap(null));
  maps.markers = [];
}
function clearRoadPolylines() {
  maps.polylines.forEach((polyline) => polyline.setMap(null));
  maps.polylines = [];
}
function renderMapMarkers(preserveRoads = false) {
  if (!maps.instance) return;
  clearMapMarkers();
  if (!preserveRoads) clearRoadPolylines();
  const points = block().nodes.filter(validCoordinates);
  const bounds = new google.maps.LatLngBounds();
  for (const item of points) {
    const position = { lat: Number(item.lat), lng: Number(item.lng) };
    maps.markers.push(new google.maps.Marker({ map: maps.instance, position, title: item.name, label: item.id.replace(/^K/, '').slice(0, 2) }));
    bounds.extend(position);
  }
  if (points.length) maps.instance.fitBounds(bounds, 55);
}

function setRoadWeight(from, to, km) {
  const current = block();
  const edge = current.edges.find((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from));
  if (edge) edge.weight = Math.round(km * 100) / 100;
}

// Cada tramo del ciclo se consulta a Google Routes. Así se dibuja el camino real
// y el peso del grafo se actualiza con distancia vial, no con línea recta.
async function drawRoadCircuit() {
  if (!lastCycle || !maps.routeClass || !maps.instance) { el['map-status'].textContent = 'El mapa aún no está listo o no hay circuito que dibujar.'; return; }
  const current = block();
  const byId = new Map(current.nodes.map((item) => [item.id, item]));
  const legs = lastCycle.path.slice(0, -1).map((from, index) => [from, lastCycle.path[index + 1]]);
  if (legs.some(([from, to]) => !validCoordinates(byId.get(from)) || !validCoordinates(byId.get(to)))) { el['map-status'].textContent = 'Todos los nodos del circuito necesitan latitud y longitud para consultar el camino real.'; return; }
  clearRoadPolylines();
  el['road-route-button'].disabled = true;
  el['map-status'].textContent = `Consultando ${legs.length} tramos por carretera en Google Maps…`;
  try {
    for (const [fromId, toId] of legs) {
      const from = byId.get(fromId); const to = byId.get(toId);
      const { routes } = await maps.routeClass.computeRoutes({
        origin: { lat: Number(from.lat), lng: Number(from.lng) }, destination: { lat: Number(to.lat), lng: Number(to.lng) },
        travelMode: 'DRIVING', fields: ['path', 'distanceMeters', 'durationMillis'],
      });
      const route = routes?.[0];
      if (!route?.path?.length) throw new Error(`Google Maps no devolvió una ruta para ${from.name} → ${to.name}.`);
      maps.polylines.push(new google.maps.Polyline({ map: maps.instance, path: route.path, strokeColor: '#117866', strokeOpacity: 0.9, strokeWeight: 5 }));
      setRoadWeight(fromId, toId, Number(route.distanceMeters) / 1000);
    }
    persist(); render(true); analyze();
    el['map-status'].textContent = 'Caminos reales dibujados. Los pesos fueron actualizados con los kilómetros devueltos por Google Maps.';
  } catch (error) { el['map-status'].textContent = `No se pudo calcular la ruta: ${error.message}`; }
  finally { el['road-route-button'].disabled = !lastCycle; }
}

el['block-select'].addEventListener('change', (event) => { selectedBlockId = event.target.value; render(); analyze(); });
el['analyze-button'].addEventListener('click', analyze);
el['road-route-button'].addEventListener('click', drawRoadCircuit);
el['reset-button'].addEventListener('click', () => { blocks = clone(avance1Blocks); selectedBlockId = blocks[0].id; persist(); render(); analyze(); });
el['node-form'].addEventListener('submit', (event) => { event.preventDefault(); const name = el['node-name'].value.trim(); if (!name) return; block().nodes.push({ id: `N${Date.now()}`, name }); el['node-name'].value = ''; persist(); render(); analyze(); });
el['edge-form'].addEventListener('submit', (event) => { event.preventDefault(); const from = el['edge-from'].value; const to = el['edge-to'].value; const weight = Number(el['edge-weight'].value); if (from === to || !Number.isFinite(weight) || weight <= 0) return; const exists = block().edges.some((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from)); if (!exists) block().edges.push({ from, to, weight }); el['edge-weight'].value = ''; persist(); render(); analyze(); });
el['node-list'].addEventListener('click', (event) => { const id = event.target.dataset.removeNode; if (!id) return; const current = block(); current.nodes = current.nodes.filter((item) => item.id !== id); current.edges = current.edges.filter((item) => item.from !== id && item.to !== id); persist(); render(); analyze(); });
el['edge-list'].addEventListener('click', (event) => { const index = event.target.dataset.removeEdge; if (index === undefined) return; block().edges.splice(Number(index), 1); persist(); render(); analyze(); });

render();
analyze();
initialiseMap();
