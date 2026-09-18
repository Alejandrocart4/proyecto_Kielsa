import './style.css';
import { buildGraph, shortestPath } from './graph.js';

const MAP_CENTER = { lat: 15.5042, lng: -88.0250 };
const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY?.trim();

const elements = {
  branchCount: document.querySelector('#branch-count'),
  edgeCount: document.querySelector('#edge-count'),
  listCount: document.querySelector('#list-count'),
  dataNotice: document.querySelector('#data-notice'),
  branchList: document.querySelector('#branch-list'),
  origin: document.querySelector('#origin-select'),
  destination: document.querySelector('#destination-select'),
  swap: document.querySelector('#swap-button'),
  routeResult: document.querySelector('#route-result'),
  map: document.querySelector('#map'),
  mapOverlay: document.querySelector('#map-overlay'),
  mapOverlayTitle: document.querySelector('#map-overlay-title'),
  mapOverlayMessage: document.querySelector('#map-overlay-message'),
};

const state = {
  branches: [],
  branchById: new Map(),
  graph: null,
  map: null,
  infoWindow: null,
  markers: new Map(),
  edges: [],
  routeLine: null,
  routeIds: new Set(),
  focusedId: null,
};

function setNotice(message, isError = false) {
  elements.dataNotice.textContent = message || '';
  elements.dataNotice.hidden = !message;
  elements.dataNotice.classList.toggle('is-error', isError);
}

function setMapOverlay(title, message) {
  elements.mapOverlayTitle.textContent = title;
  elements.mapOverlayMessage.textContent = message;
  elements.mapOverlay.hidden = false;
}

function showResult(message) {
  const label = document.createElement('span');
  label.className = 'result-label';
  label.textContent = 'Ruta más corta';
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  elements.routeResult.replaceChildren(label, paragraph);
}

function mapsUrl(branch) {
  if (branch.googleMapsUri) {
    try {
      const url = new URL(branch.googleMapsUri);
      if (url.protocol === 'https:' && (url.hostname === 'google.com' || url.hostname.endsWith('.google.com') || url.hostname === 'goo.gl')) {
        return url.href;
      }
    } catch { /* Use the safe search link below. */ }
  }
  const query = encodeURIComponent(`${branch.name} ${branch.address || 'San Pedro Sula, Honduras'}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function displayName(branch) {
  return branch?.name || 'Sucursal Kielsa';
}

function renderBranchList() {
  const items = state.branches.map((branch, index) => {
    const item = document.createElement('li');
    item.className = 'branch-item';
    item.dataset.branchId = String(branch.id);

    const number = document.createElement('span');
    number.className = 'branch-number';
    number.textContent = String(index + 1);

    const main = document.createElement('div');
    main.className = 'branch-main';
    const button = document.createElement('button');
    button.className = 'branch-button';
    button.type = 'button';
    button.textContent = displayName(branch);
    button.addEventListener('click', () => focusBranch(String(branch.id)));

    const address = document.createElement('span');
    address.className = 'branch-address';
    address.textContent = branch.address || 'San Pedro Sula, Cortés';

    const link = document.createElement('a');
    link.className = 'branch-link';
    link.href = mapsUrl(branch);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Ver en Google Maps ↗';

    main.append(button, address, link);
    item.append(number, main);
    return item;
  });
  elements.branchList.replaceChildren(...items);
}

function renderSelectors() {
  for (const select of [elements.origin, elements.destination]) {
    const options = state.branches.map((branch) => {
      const option = document.createElement('option');
      option.value = String(branch.id);
      option.textContent = displayName(branch);
      return option;
    });
    select.replaceChildren(...options);
    select.disabled = state.branches.length === 0;
  }
  elements.swap.disabled = state.branches.length < 2;
  if (state.branches.length > 1) {
    elements.destination.selectedIndex = 1;
  }
}

function renderRoute() {
  state.routeLine?.setMap(null);
  state.routeLine = null;
  state.routeIds.clear();

  if (!state.graph || state.branches.length === 0) {
    showResult('No hay sucursales disponibles para calcular una ruta.');
    updateMarkerStyles();
    return;
  }

  const origin = state.branchById.get(elements.origin.value);
  const destination = state.branchById.get(elements.destination.value);
  if (!origin || !destination) {
    showResult('Selecciona un origen y un destino.');
    updateMarkerStyles();
    return;
  }

  const result = String(origin.id) === String(destination.id)
    ? { path: [origin.id], distanceKm: 0 }
    : shortestPath(state.graph, origin.id, destination.id);

  if (!result || !Array.isArray(result.path) || result.path.length === 0) {
    showResult('No hay una conexión entre las sucursales seleccionadas.');
    updateMarkerStyles();
    return;
  }

  const pathBranches = result.path.map((id) => state.branchById.get(String(id))).filter(Boolean);
  if (pathBranches.length !== result.path.length) {
    showResult('No se pudo mostrar la ruta con los datos disponibles.');
    updateMarkerStyles();
    return;
  }

  state.routeIds = new Set(result.path.map(String));
  const label = document.createElement('span');
  label.className = 'result-label';
  label.textContent = 'Ruta más corta';
  const distance = document.createElement('strong');
  distance.className = 'route-distance';
  distance.textContent = Number(result.distanceKm).toLocaleString('es-HN', { maximumFractionDigits: 2 });
  const unit = document.createElement('small');
  unit.textContent = ' km';
  distance.append(unit);
  const explanation = document.createElement('p');
  explanation.textContent = pathBranches.length === 1
    ? 'El origen y el destino son la misma sucursal.'
    : `${pathBranches.length} sucursales en el recorrido del grafo.`;
  const steps = document.createElement('ol');
  steps.className = 'route-path';
  for (const branch of pathBranches) {
    const step = document.createElement('li');
    step.textContent = displayName(branch);
    steps.append(step);
  }
  elements.routeResult.replaceChildren(label, distance, explanation, steps);

  if (state.map && pathBranches.length > 1) {
    state.routeLine = new google.maps.Polyline({
      map: state.map,
      path: pathBranches.map(({ lat, lng }) => ({ lat, lng })),
      geodesic: true,
      strokeColor: '#e7474e',
      strokeOpacity: 1,
      strokeWeight: 5,
      zIndex: 5,
    });
  }
  updateMarkerStyles();
}

function markerIcon(isOnRoute) {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isOnRoute ? 14 : 12,
    fillColor: isOnRoute ? '#e7474e' : '#17384a',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function updateMarkerStyles() {
  for (const [id, marker] of state.markers) {
    const isOnRoute = state.routeIds.has(id);
    marker.setIcon(markerIcon(isOnRoute));
    marker.setZIndex(isOnRoute ? 10 : 2);
  }
}

function focusBranch(id) {
  const branch = state.branchById.get(id);
  if (!branch) return;
  state.focusedId = id;
  for (const item of elements.branchList.children) {
    item.classList.toggle('is-active', item.dataset.branchId === id);
  }
  if (!state.map) return;
  state.map.panTo({ lat: branch.lat, lng: branch.lng });
  state.map.setZoom(Math.max(state.map.getZoom() || 12, 14));
  const marker = state.markers.get(id);
  if (!marker) return;

  const content = document.createElement('div');
  content.style.maxWidth = '230px';
  const title = document.createElement('strong');
  title.textContent = displayName(branch);
  const address = document.createElement('p');
  address.style.margin = '6px 0';
  address.textContent = branch.address || 'San Pedro Sula, Cortés';
  const link = document.createElement('a');
  link.href = mapsUrl(branch);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Abrir en Google Maps';
  content.append(title, address, link);
  state.infoWindow.setContent(content);
  state.infoWindow.open({ map: state.map, anchor: marker });
}

function drawGraph() {
  if (!state.map || !state.graph) return;
  for (const edge of state.edges) edge.setMap(null);
  for (const marker of state.markers.values()) marker.setMap(null);
  state.edges = [];
  state.markers.clear();

  for (const edge of state.graph.edges || []) {
    const from = state.branchById.get(String(edge.from));
    const to = state.branchById.get(String(edge.to));
    if (!from || !to) continue;
    state.edges.push(new google.maps.Polyline({
      map: state.map,
      path: [{ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }],
      geodesic: true,
      strokeColor: '#7293a3',
      strokeOpacity: 0.55,
      strokeWeight: 2,
      zIndex: 1,
    }));
  }

  const bounds = new google.maps.LatLngBounds();
  state.branches.forEach((branch, index) => {
    const id = String(branch.id);
    const position = { lat: branch.lat, lng: branch.lng };
    const marker = new google.maps.Marker({
      map: state.map,
      position,
      title: displayName(branch),
      icon: markerIcon(state.routeIds.has(id)),
      label: {
        text: String(index + 1),
        color: '#ffffff',
        fontSize: '10px',
        fontWeight: '700',
      },
      zIndex: state.routeIds.has(id) ? 10 : 2,
    });
    marker.addListener('click', () => focusBranch(id));
    state.markers.set(id, marker);
    bounds.extend(position);
  });

  if (state.branches.length > 1) {
    state.map.fitBounds(bounds, 65);
  } else if (state.branches.length === 1) {
    state.map.setCenter({ lat: state.branches[0].lat, lng: state.branches[0].lng });
    state.map.setZoom(14);
  }
  renderRoute();
}

function loadGoogleMaps(key) {
  return new Promise((resolve, reject) => {
    const callbackName = '__kielsaMapLoaded';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };
    const script = document.createElement('script');
    const parameters = new URLSearchParams({
      key,
      loading: 'async',
      callback: callbackName,
      language: 'es',
      region: 'HN',
      v: 'weekly',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${parameters}`;
    script.async = true;
    script.onerror = () => reject(new Error('No se pudo descargar Google Maps.'));
    document.head.append(script);
  });
}

async function initializeMap() {
  if (!browserKey) {
    setMapOverlay('Falta la clave de Google Maps', 'Configura VITE_GOOGLE_MAPS_BROWSER_KEY en el archivo .env y reinicia la aplicación.');
    return;
  }
  let authFailed = false;
  window.gm_authFailure = () => {
    authFailed = true;
    setMapOverlay('No se pudo autorizar Google Maps', 'Revisa que la clave del navegador permita Maps JavaScript API y este dominio.');
  };
  try {
    await loadGoogleMaps(browserKey);
    state.map = new google.maps.Map(elements.map, {
      center: MAP_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      styles: [
        { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });
    state.infoWindow = new google.maps.InfoWindow();
    if (!authFailed) elements.mapOverlay.hidden = true;
    drawGraph();
  } catch {
    setMapOverlay('No se pudo cargar el mapa', 'Revisa la conexión, la clave de Google Maps y los dominios autorizados.');
  }
}

async function loadBranches() {
  try {
    const response = await fetch('/api/branches');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.branches)) throw new Error('Respuesta sin lista de sucursales');

    state.branches = data.branches.filter((branch) =>
      branch.id != null && Number.isFinite(Number(branch.lat)) && Number.isFinite(Number(branch.lng))
    ).map((branch) => ({ ...branch, lat: Number(branch.lat), lng: Number(branch.lng) }));
    state.branchById = new Map(state.branches.map((branch) => [String(branch.id), branch]));
    state.graph = buildGraph(state.branches);

    elements.branchCount.textContent = String(state.branches.length);
    elements.edgeCount.textContent = String(state.graph.edges?.length || 0);
    elements.listCount.textContent = String(state.branches.length);
    if (state.branches.length === 0) {
      elements.branchList.replaceChildren(Object.assign(document.createElement('li'), {
        className: 'list-message',
        textContent: 'No se encontraron sucursales de Kielsa en San Pedro Sula.',
      }));
      renderSelectors();
      showResult('No hay sucursales disponibles para calcular una ruta.');
    } else {
      renderBranchList();
      renderSelectors();
      renderRoute();
    }
    if (data.warning) {
      setNotice(data.warning);
    } else if (Number(data.excludedCount) > 0) {
      setNotice(`Se excluyeron ${data.excludedCount} ubicaciones que no pertenecen a San Pedro Sula.`);
    }
    drawGraph();
  } catch {
    elements.branchCount.textContent = '0';
    elements.edgeCount.textContent = '0';
    elements.branchList.replaceChildren(Object.assign(document.createElement('li'), {
      className: 'list-message',
      textContent: 'No fue posible cargar las sucursales.',
    }));
    renderSelectors();
    showResult('No fue posible calcular rutas sin los datos de sucursales.');
    setNotice('No se pudieron obtener las sucursales. Revisa la conexión y la configuración de Google Places.', true);
  }
}

elements.origin.addEventListener('change', renderRoute);
elements.destination.addEventListener('change', renderRoute);
elements.swap.addEventListener('click', () => {
  const previousOrigin = elements.origin.value;
  elements.origin.value = elements.destination.value;
  elements.destination.value = previousOrigin;
  renderRoute();
});

void initializeMap();
void loadBranches();
