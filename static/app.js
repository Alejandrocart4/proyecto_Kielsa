let blocks = [];
let selectedId = null;
let map, Route, markers = [], polylines = [], lastCycle = null;
const $ = (id) => document.getElementById(id);
const current = () => blocks.find((item) => item.id === selectedId);
const names = () => new Map(current().nodes.map((item) => [item.id, item.name]));
const valid = (node) => Number.isFinite(Number(node.lat)) && Number.isFinite(Number(node.lng));

function save() { localStorage.setItem('kielsa-python-blocks', JSON.stringify(blocks)); }
function option(items, selected) { return items.map((item) => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${item.name}</option>`).join(''); }
function render() {
  const block = current();
  $('block').innerHTML = option(blocks, selectedId);
  const start = block.nodes.some((node) => node.id === $('start').value) ? $('start').value : block.nodes[0]?.id;
  $('start').innerHTML = option(block.nodes, start);
  $('from').innerHTML = option(block.nodes, block.nodes[0]?.id);
  $('to').innerHTML = option(block.nodes, block.nodes[1]?.id);
  $('nodes').innerHTML = block.nodes.map((node) => `<li><span>${node.name}</span><button data-node="${node.id}">Eliminar</button></li>`).join('');
  const label = names();
  $('edges').innerHTML = block.edges.map((edge, index) => `<div class="edge"><span>${label.get(edge.from)}</span><strong>${Number(edge.weight).toFixed(2)} km</strong><span>${label.get(edge.to)}</span><button data-edge="${index}">Eliminar</button></div>`).join('');
  drawMarkers();
}

async function analyze() {
  const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block: current(), start_id: $('start').value }) });
  const data = await response.json();
  if (!response.ok) { $('result').textContent = data.error; return; }
  lastCycle = data.cycle;
  const c = data.criteria;
  const label = names();
  const cycle = data.cycle ? data.cycle.path.map((id) => label.get(id)).join(' → ') : 'No hay circuito con las aristas actuales.';
  $('result').innerHTML = `<p><b>Conexo:</b> <span class="${c.connected ? 'ok':'bad'}">${c.connected ? 'sí':'no'}</span> · <b>Grado mínimo 2:</b> ${c.minimum_degree ? 'sí':'no'} · <b>Dirac:</b> ${c.dirac ? 'cumple':'no cumple'} · <b>Ore:</b> ${c.ore ? 'cumple':'no cumple'}</p><p><b>Circuito:</b> ${cycle}</p>${data.cycle ? `<p><b>Distancia total:</b> ${data.cycle.total_weight.toFixed(2)} km</p>` : ''}`;
}

function loadMaps() {
  return new Promise((resolve, reject) => {
    if (!window.MAPS_KEY) return reject(new Error('Falta la clave de Google Maps en .env'));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.MAPS_KEY)}&v=weekly`;
    script.onload = resolve; script.onerror = () => reject(new Error('Google Maps no pudo cargarse.'));
    document.head.append(script);
  });
}
async function initialiseMap() {
  try {
    await loadMaps();
    const mapsLibrary = await google.maps.importLibrary('maps');
    ({ Route } = await google.maps.importLibrary('routes'));
    map = new mapsLibrary.Map($('map'), { center: { lat: 15.5042, lng: -88.025 }, zoom: 12, streetViewControl: false });
    $('status').textContent = 'Mapa listo.'; drawMarkers();
  } catch (error) { $('status').textContent = `${error.message} Verifica Maps JavaScript API y Routes API.`; }
}
function clearMap() { markers.forEach((item) => item.setMap(null)); polylines.forEach((item) => item.setMap(null)); markers = []; polylines = []; }
function drawMarkers() {
  if (!map || !current()) return;
  clearMap(); const points = current().nodes.filter(valid); const bounds = new google.maps.LatLngBounds();
  points.forEach((node) => { const position = { lat: Number(node.lat), lng: Number(node.lng) }; markers.push(new google.maps.Marker({ map, position, title: node.name })); bounds.extend(position); });
  if (points.length) map.fitBounds(bounds, 50);
}
function updateWeight(from, to, km) { const edge = current().edges.find((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from)); if (edge) edge.weight = Math.round(km * 100) / 100; }
async function drawRoads() {
  if (!map || !Route || !lastCycle) { $('status').textContent = 'Primero busca un circuito y espera a que cargue el mapa.'; return; }
  const byId = new Map(current().nodes.map((node) => [node.id, node]));
  const legs = lastCycle.path.slice(0, -1).map((from, index) => [from, lastCycle.path[index + 1]]);
  if (legs.some(([from, to]) => !valid(byId.get(from)) || !valid(byId.get(to)))) { $('status').textContent = 'Faltan coordenadas en un nodo del circuito.'; return; }
  polylines.forEach((item) => item.setMap(null)); polylines = []; $('status').textContent = 'Consultando caminos por carretera…';
  try {
    for (const [fromId, toId] of legs) {
      const from = byId.get(fromId), to = byId.get(toId);
      const { routes } = await Route.computeRoutes({ origin: { lat: +from.lat, lng: +from.lng }, destination: { lat: +to.lat, lng: +to.lng }, travelMode: 'DRIVING', fields: ['path', 'distanceMeters'] });
      const route = routes?.[0]; if (!route?.path?.length) throw new Error(`No hay ruta para ${from.name}.`);
      polylines.push(new google.maps.Polyline({ map, path: route.path, strokeColor: '#087365', strokeWeight: 5 }));
      updateWeight(fromId, toId, route.distanceMeters / 1000);
    }
    save(); render(); await analyze(); $('status').textContent = 'Caminos dibujados y pesos actualizados con kilómetros reales.';
  } catch (error) { $('status').textContent = error.message; }
}

$('block').addEventListener('change', (event) => { selectedId = event.target.value; render(); analyze(); });
$('analyze').addEventListener('click', analyze); $('roads').addEventListener('click', drawRoads);
$('reset').addEventListener('click', async () => { const data = await (await fetch('/api/blocks')).json(); blocks = data.blocks; selectedId = blocks[0].id; save(); render(); analyze(); });
$('node-form').addEventListener('submit', (event) => { event.preventDefault(); const name = $('node-name').value.trim(); if (!name) return; current().nodes.push({ id: `N${Date.now()}`, name, lat: +$('node-lat').value || null, lng: +$('node-lng').value || null }); event.target.reset(); save(); render(); analyze(); });
$('edge-form').addEventListener('submit', (event) => { event.preventDefault(); const from = $('from').value, to = $('to').value, weight = +$('weight').value; if (from !== to && weight > 0 && !current().edges.some((edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))) current().edges.push({ from, to, weight }); event.target.reset(); save(); render(); analyze(); });
$('nodes').addEventListener('click', (event) => { const id = event.target.dataset.node; if (!id) return; current().nodes = current().nodes.filter((node) => node.id !== id); current().edges = current().edges.filter((edge) => edge.from !== id && edge.to !== id); save(); render(); analyze(); });
$('edges').addEventListener('click', (event) => { if (event.target.dataset.edge === undefined) return; current().edges.splice(+event.target.dataset.edge, 1); save(); render(); analyze(); });

(async () => { const stored = localStorage.getItem('kielsa-python-blocks'); blocks = stored ? JSON.parse(stored) : (await (await fetch('/api/blocks')).json()).blocks; selectedId = blocks[0].id; render(); analyze(); initialiseMap(); })();
