let branches = [], blockInfo = {}, baseBlocks = [], workingBlocks = [];
let selectedZone = "A", activeFilter = "all", selectedId = null;
let selectedCandidateId = "A";
let map, Route, infoWindow, dashboardMarkers = [], candidateMarkers = [], routePolylines = [], lastCycle = null;

const $ = (id) => document.getElementById(id);
const colors = { A: "#1677e8", B: "#11a65b", C: "#f5a900" };
const candidates = {
  A: { name: "Galería Guamilito", lat: 15.5125222, lng: -88.02658734, price: "L. 7,000/mes" },
  B: { name: "Plaza Los Caminantes", lat: 15.5122975, lng: -88.03203119, price: "L. 11,800/mes" },
  C: { name: "Plaza Trejo", lat: 15.4980516, lng: -88.0461595, price: "USD 2,868/mes" },
};
const currentWork = () => workingBlocks.find((item) => item.id === selectedId);
const valid = (node) => Number.isFinite(Number(node?.lat)) && Number.isFinite(Number(node?.lng)) && !(Number(node.lat) === 0 && Number(node.lng) === 0);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function blockBranches(zone = selectedZone) { return branches.filter((branch) => branch.block === zone); }

function renderCounters() {
  const count = (zone) => branches.filter((branch) => branch.block === zone).length;
  $("list-total").textContent = `(${branches.length})`;
  $("all-count").textContent = branches.length;
  $("indicator-branches").textContent = branches.length;
  ["A", "B", "C"].forEach((zone) => $(zone.toLowerCase() + "-count").textContent = count(zone));
}

function renderBranchList() {
  const query = $("search").value.trim().toLowerCase();
  const visible = branches.filter((branch) => {
    const filterOk = activeFilter === "all" || branch.block === activeFilter;
    const text = `${branch.id} ${branch.name} ${branch.address} ${branch.block}`.toLowerCase();
    return filterOk && text.includes(query);
  });
  $("branch-list").innerHTML = visible.map((branch) => `
    <article class="branch" data-branch="${branch.id}">
      <i class="pin ${branch.block.toLowerCase()}"></i>
      <div class="branch-copy"><b>${escapeHtml(branch.name.replace(/^K\d+\s+KIELSA\s+SPS\s+/i, ""))}</b><small>${escapeHtml(branch.address)}</small></div>
      <span class="branch-code">${branch.id}</span>
    </article>`).join("");
  $("list-footer").textContent = `Mostrando ${visible.length} de ${branches.length} sucursales`;
}

function renderSelectedBlock() {
  const data = blockInfo[selectedZone] || { name: `Bloque ${selectedZone}`, zone: "" };
  const total = blockBranches().length;
  $("selected-name").textContent = `${data.name} seleccionado`;
  $("selected-count").textContent = total;
  $("map-label").textContent = `${data.name} · ${data.zone}`;
  const dot = $("selected-card").querySelector(".dot");
  dot.className = `dot ${selectedZone.toLowerCase()}`;
}

function markerIcon(zone, focused) {
  return { path: google.maps.SymbolPath.CIRCLE, fillColor: colors[zone], fillOpacity: focused ? 1 : .84, strokeColor: "#fff", strokeWeight: focused ? 3 : 1.5, scale: focused ? 9 : 6 };
}

function clearDashboardMarkers() { dashboardMarkers.forEach((marker) => marker.setMap(null)); dashboardMarkers = []; }
function clearCandidateMarkers() { candidateMarkers.forEach((marker) => marker.setMap(null)); candidateMarkers = []; }

function drawDashboardMarkers() {
  if (!map) return;
  clearDashboardMarkers();
  branches.filter((branch) => (activeFilter === "all" || branch.block === activeFilter) && valid(branch)).forEach((branch) => {
    const highlighted = activeFilter !== "all" && branch.block === selectedZone;
    const marker = new google.maps.Marker({ map, position: { lat: Number(branch.lat), lng: Number(branch.lng) }, title: `${branch.id} · ${branch.name}`, icon: markerIcon(branch.block, highlighted), zIndex: highlighted ? 3 : 1 });
    marker.addListener("click", () => {
      infoWindow.setContent(`<b>${escapeHtml(branch.id)} · ${escapeHtml(branch.name)}</b><br><span>${escapeHtml(branch.address)}</span><br><a target="_blank" rel="noreferrer" href="${branch.map_url}">Abrir en Google Maps</a>`);
      infoWindow.open({ map, anchor: marker });
    });
    dashboardMarkers.push(marker);
  });
}

function drawCandidateMarkers() {
  if (!map) return;
  clearCandidateMarkers();
  Object.entries(candidates).filter(([id]) => id === selectedCandidateId).forEach(([id, candidate]) => {
    const marker = new google.maps.Marker({
      map,
      position: { lat: candidate.lat, lng: candidate.lng },
      title: candidate.name,
      label: { text: id, color: "#ffffff", fontWeight: "800" },
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: "#7d3ee6", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2, scale: 10 },
      zIndex: 8,
    });
    marker.addListener("click", () => selectCandidate(id));
    candidateMarkers.push(marker);
  });
}

function selectCandidate(id) {
  selectedCandidateId = id;
  const candidate = candidates[id];
  document.querySelectorAll(".candidate").forEach((card) => card.classList.toggle("active", card.dataset.candidate === id));
  if ($("candidate-select")) $("candidate-select").value = id;
  drawCandidateMarkers();
  if (!$("constructor").hidden && baseBlocks.length) refreshCandidateRoutes();
  if (!map) return;
  map.panTo({ lat: candidate.lat, lng: candidate.lng });
  map.setZoom(15);
  infoWindow.setContent(`<b>${candidate.name}</b><br>${candidate.price}`);
  infoWindow.setPosition({ lat: candidate.lat, lng: candidate.lng });
  infoWindow.open({ map });
}

function fitToBranches(items) {
  if (!map) return;
  const validItems = items.filter(valid);
  if (!validItems.length) return;
  const bounds = new google.maps.LatLngBounds();
  validItems.forEach((branch) => bounds.extend({ lat: Number(branch.lat), lng: Number(branch.lng) }));
  map.fitBounds(bounds, 56);
}

function setZone(zone, shouldFocus = false) {
  selectedZone = zone;
  renderSelectedBlock();
  drawDashboardMarkers();
  if (shouldFocus) fitToBranches(blockBranches());
}

function loadMaps() {
  return new Promise((resolve, reject) => {
    if (!window.MAPS_KEY) return reject(new Error("Falta la clave de Google Maps en .env"));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(window.MAPS_KEY)}&v=weekly`;
    script.onload = resolve; script.onerror = () => reject(new Error("Google Maps no pudo cargarse."));
    document.head.append(script);
  });
}

async function initialiseMap() {
  try {
    await loadMaps();
    const mapsLibrary = await google.maps.importLibrary("maps");
    ({ Route } = await google.maps.importLibrary("routes"));
    map = new mapsLibrary.Map($("map"), { center: { lat: 15.5042, lng: -88.025 }, zoom: 12, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
    infoWindow = new google.maps.InfoWindow();
    drawDashboardMarkers(); drawCandidateMarkers(); fitToBranches(blockBranches());
  } catch (error) { $("map").textContent = `${error.message} Verifica Maps JavaScript API y Routes API.`; }
}

function saveWorkingBlocks() { localStorage.setItem("kielsa-real-blocks-v2", JSON.stringify(workingBlocks)); }
function candidatePayload(id = selectedCandidateId) { const candidate = candidates[id]; return { id: `SEDE_${id}`, name: `Sede: ${candidate.name}`, lat: candidate.lat, lng: candidate.lng }; }
async function buildCandidateRoutes(id = selectedCandidateId) {
  return Promise.all(baseBlocks.map(async (block) => {
    const response = await fetch("/api/prepare-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block, candidate: candidatePayload(id) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo preparar el circuito desde la sede.");
    return data.block;
  }));
}
async function refreshCandidateRoutes() {
  try {
    routePolylines.forEach((line) => line.setMap(null)); routePolylines = []; lastCycle = null;
    const previousId = selectedId;
    workingBlocks = await buildCandidateRoutes();
    selectedId = workingBlocks.some((block) => block.id === previousId) ? previousId : workingBlocks[0].id;
    saveWorkingBlocks(); renderConstructor(); await analyze();
  } catch (error) { $("status").textContent = error.message; }
}
function option(items, selected) { return items.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join(""); }
function workNames() { return new Map(currentWork().nodes.map((item) => [item.id, item.name])); }

function renderConstructor() {
  const block = currentWork(); if (!block) return;
  $("block").innerHTML = option(workingBlocks, selectedId);
  $("candidate-select").value = selectedCandidateId;
  const depotId = `SEDE_${selectedCandidateId}`;
  const start = block.nodes.some((node) => node.id === depotId) ? depotId : block.nodes[0]?.id;
  $("start").innerHTML = option(block.nodes, start);
  $("from").innerHTML = option(block.nodes, block.nodes[0]?.id);
  $("to").innerHTML = option(block.nodes, block.nodes[1]?.id);
  $("nodes").innerHTML = block.nodes.map((node) => `<li><span>${escapeHtml(node.name)}</span><button data-node="${node.id}">Eliminar</button></li>`).join("");
  const labels = workNames();
  $("edges").innerHTML = block.edges.map((edge, index) => `<div class="edge"><span>${escapeHtml(labels.get(edge.from))}</span><strong>${Number(edge.weight).toFixed(2)} km</strong><span>${escapeHtml(labels.get(edge.to))}</span><button data-edge="${index}">Eliminar</button></div>`).join("");
}

async function analyze() {
  clearRouteLines(); lastCycle = null;
  const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: currentWork(), start_id: $("start").value }) });
  const data = await response.json();
  if (!response.ok) { $("result").textContent = data.error; return; }
  lastCycle = data.cycle; const criteria = data.criteria, labels = workNames();
  const cycle = data.cycle ? data.cycle.path.map((id) => escapeHtml(labels.get(id))).join(" → ") : "No hay circuito con las aristas actuales.";
  const returnPoint = data.cycle ? escapeHtml(labels.get(data.cycle.path[0])) : "—";
  $("result").innerHTML = `<p><b>Pesos:</b> ${escapeHtml(currentWork().weight_source || "Configurados manualmente.")}</p><p><b>Conexo:</b> <span class="${criteria.connected ? "ok" : "bad"}">${criteria.connected ? "sí" : "no"}</span> · <b>Grado mínimo 2:</b> ${criteria.minimum_degree ? "sí" : "no"} · <b>Dirac:</b> ${criteria.dirac ? "cumple" : "no cumple"} · <b>Ore:</b> ${criteria.ore ? "cumple" : "no cumple"}</p><p><b>Inicio y retorno:</b> ${returnPoint}</p><p><b>Circuito:</b> ${cycle}</p>${data.cycle ? `<p><b>Distancia total:</b> ${data.cycle.total_weight.toFixed(2)} km</p>` : ""}`;
  if (data.cycle) { $("circuit-message").textContent = "Hay un circuito en el subgrafo de trabajo."; $("route-distance").textContent = `${data.cycle.total_weight.toFixed(2)} km en el subgrafo trabajado`; drawCircuitEdges(); }
}

function updateEdgeWeight(from, to, km) {
  const edge = currentWork().edges.find((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from));
  if (edge) edge.weight = Math.round(km * 100) / 100;
}

function clearRouteLines() { routePolylines.forEach((line) => line.setMap(null)); routePolylines = []; }
function routeWeight(from, to) { return currentWork().edges.find((edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))?.weight; }
function addRouteLine(from, to, km) {
  const line = new google.maps.Polyline({ map, path: [{ lat: +from.lat, lng: +from.lng }, { lat: +to.lat, lng: +to.lng }], strokeColor: "#7d3ee6", strokeOpacity: .9, strokeWeight: 5, zIndex: 6 });
  const position = { lat: (+from.lat + +to.lat) / 2, lng: (+from.lng + +to.lng) / 2 };
  const content = `<div><b>${escapeHtml(from.name)}</b><br>↓ ${Number(km).toFixed(2)} km<br><b>${escapeHtml(to.name)}</b></div>`;
  line.addListener("mouseover", (event) => { infoWindow.setContent(content); infoWindow.setPosition(event.latLng || position); infoWindow.open({ map }); });
  line.addListener("mouseout", () => infoWindow.close());
  routePolylines.push(line);
}
function drawCircuitEdges() {
  if (!map || !lastCycle || $("constructor").hidden) return;
  const nodes = new Map(currentWork().nodes.map((node) => [node.id, node]));
  const legs = lastCycle.path.slice(0, -1).map((from, index) => [from, lastCycle.path[index + 1]]);
  clearRouteLines();
  legs.forEach(([fromId, toId]) => {
    const from = nodes.get(fromId), to = nodes.get(toId), km = routeWeight(fromId, toId);
    if (valid(from) && valid(to) && Number.isFinite(Number(km))) addRouteLine(from, to, km);
  });
}

async function drawRoads() {
  if (!map || !Route || !lastCycle) { $("status").textContent = "Primero busca un circuito y espera a que cargue el mapa."; return; }
  const nodes = new Map(currentWork().nodes.map((node) => [node.id, node]));
  const legs = lastCycle.path.slice(0, -1).map((from, index) => [from, lastCycle.path[index + 1]]);
  if (legs.some(([from, to]) => !valid(nodes.get(from)) || !valid(nodes.get(to)))) { $("status").textContent = "Faltan coordenadas en un nodo del circuito."; return; }
  clearRouteLines(); $("status").textContent = "Consultando caminos por carretera…";
  try {
    for (const [fromId, toId] of legs) {
      const from = nodes.get(fromId), to = nodes.get(toId);
      const { routes } = await Route.computeRoutes({ origin: { lat: +from.lat, lng: +from.lng }, destination: { lat: +to.lat, lng: +to.lng }, travelMode: "DRIVING", fields: ["distanceMeters"] });
      const route = routes?.[0]; if (!route?.distanceMeters) throw new Error(`No hay ruta para ${from.name}.`);
      updateEdgeWeight(fromId, toId, route.distanceMeters / 1000);
    }
    currentWork().weight_source = "Kilómetros por carretera consultados con Google Maps Routes API.";
    saveWorkingBlocks(); renderConstructor(); await analyze(); $("status").textContent = "Líneas rectas dibujadas y pesos actualizados con kilómetros reales.";
  } catch (error) { $("status").textContent = error.message; }
}

function bindEvents() {
  $("fullscreen-map").addEventListener("click", async () => {
    const mapShell = document.querySelector(".map-wrap");
    if (document.fullscreenElement === mapShell) await document.exitFullscreen();
    else await mapShell.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => {
    const expanded = document.fullscreenElement === document.querySelector(".map-wrap");
    $("fullscreen-map").textContent = expanded ? "× Cerrar pantalla completa" : "⛶ Pantalla completa";
    if (map && window.google) { google.maps.event.trigger(map, "resize"); fitToBranches(activeFilter === "all" ? branches : blockBranches(activeFilter)); }
  });
  $("search").addEventListener("input", renderBranchList);
  $("filters").addEventListener("click", (event) => {
    const button = event.target.closest("button"); if (!button) return;
    activeFilter = button.dataset.filter;
    [...$("filters").querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item === button));
    if (activeFilter !== "all") { selectedZone = activeFilter; renderSelectedBlock(); }
    renderBranchList(); drawDashboardMarkers();
    fitToBranches(activeFilter === "all" ? branches : blockBranches(activeFilter));
  });
  $("branch-list").addEventListener("click", (event) => { const item = event.target.closest("[data-branch]"); const branch = branches.find((entry) => entry.id === item?.dataset.branch); if (branch && map && valid(branch)) { map.panTo({ lat: Number(branch.lat), lng: Number(branch.lng) }); map.setZoom(15); } });
  $("load-branches").addEventListener("click", async () => { const data = await (await fetch("/api/branches")).json(); branches = data.branches; blockInfo = data.block_info; renderCounters(); renderBranchList(); renderSelectedBlock(); drawDashboardMarkers(); drawCandidateMarkers(); });
  $("open-constructor").addEventListener("click", () => { $("constructor").hidden = false; $("constructor").scrollIntoView({ behavior: "smooth" }); drawCircuitEdges(); });
  $("close-constructor").addEventListener("click", () => { $("constructor").hidden = true; clearRouteLines(); });
  $("candidate-button").addEventListener("click", () => $("candidates").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("candidates").addEventListener("click", (event) => { const card = event.target.closest("[data-candidate]"); if (card) selectCandidate(card.dataset.candidate); });
  $("candidate-select").addEventListener("change", (event) => selectCandidate(event.target.value));
  $("block").addEventListener("change", (event) => { selectedId = event.target.value; renderConstructor(); analyze(); });
  $("analyze").addEventListener("click", analyze); $("roads").addEventListener("click", drawRoads);
  $("reset").addEventListener("click", async () => { const data = await (await fetch("/api/route-blocks")).json(); baseBlocks = data.blocks; selectedId = baseBlocks[0].id; await refreshCandidateRoutes(); });
  $("node-form").addEventListener("submit", (event) => { event.preventDefault(); const name = $("node-name").value.trim(); if (!name) return; currentWork().nodes.push({ id: `N${Date.now()}`, name, lat: +$("node-lat").value || null, lng: +$("node-lng").value || null }); event.target.reset(); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("edge-form").addEventListener("submit", (event) => { event.preventDefault(); const from = $("from").value, to = $("to").value, weight = +$("weight").value; if (from !== to && weight > 0 && !currentWork().edges.some((edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))) currentWork().edges.push({ from, to, weight }); event.target.reset(); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("nodes").addEventListener("click", (event) => { const id = event.target.dataset.node; if (!id) return; currentWork().nodes = currentWork().nodes.filter((node) => node.id !== id); currentWork().edges = currentWork().edges.filter((edge) => edge.from !== id && edge.to !== id); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("edges").addEventListener("click", (event) => { if (event.target.dataset.edge === undefined) return; currentWork().edges.splice(+event.target.dataset.edge, 1); saveWorkingBlocks(); renderConstructor(); analyze(); });
}

(async () => {
  const [branchData, workData] = await Promise.all([fetch("/api/branches").then((response) => response.json()), fetch("/api/route-blocks").then((response) => response.json())]);
  branches = branchData.branches; blockInfo = branchData.block_info;
  baseBlocks = workData.blocks;
  workingBlocks = await buildCandidateRoutes();
  selectedId = workingBlocks[0].id;
  renderCounters(); renderBranchList(); renderSelectedBlock(); renderConstructor(); bindEvents(); analyze(); initialiseMap();
})();
