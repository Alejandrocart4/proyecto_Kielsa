let branches = [], blockInfo = {}, baseBlocks = [], workingBlocks = [];
let selectedZone = "A", activeFilter = "all", selectedId = null;
let selectedCandidateId = "A";
let map, Route, infoWindow, dashboardMarkers = [], candidateMarkers = [], routePolylines = [], graphPolylines = [], lastCycle = null;
let mapMode = "branches", technicalSelection = new Set();

const $ = (id) => document.getElementById(id);
const colors = { A: "#1677e8", B: "#11a65b", C: "#f5a900" };
const candidates = {
  A: { name: "Galería Guamilito", lat: 15.5125222, lng: -88.02658734, price: "L. 7,000/mes" },
  B: { name: "Plaza Los Caminantes", lat: 15.5122975, lng: -88.03203119, price: "L. 11,800/mes" },
  C: { name: "Plaza Trejo", lat: 15.4980516, lng: -88.0461595, price: "USD 2,868/mes" },
};
const candidateDetails = {
  A: { zone: "Centro", address: "8 calle, 7 avenida NO, Guamilito", services: "Agua, luz y baño privado.", image: "/imagenes/Guamilito.jpeg" },
  B: { zone: "Norte", address: "Plaza Los Caminantes, San Pedro Sula", services: "Agua y seguridad.", image: "/imagenes/caminantes.jpeg" },
  C: { zone: "Oeste", address: "10 calle, 23 avenida S, Plaza Trejo", services: "Parqueo y seguridad 24/7.", image: "/imagenes/Trejo.jpeg" },
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
  const graph = baseBlocks.find((block) => block.id === selectedZone);
  $("selected-name").textContent = `${data.name} seleccionado`;
  $("selected-count").textContent = total;
  $("selected-edges").textContent = graph?.edges.length ?? 0;
  $("circuit-summary").hidden = false;
  $("open-constructor").hidden = false;
  $("selected-connected").innerHTML = "Conectado<br>Grafo válido";
  $("map-label").textContent = `${data.name} · ${data.zone}`;
  const dot = $("selected-card").querySelector(".dot");
  dot.className = `dot ${selectedZone.toLowerCase()}`;
}

function renderCompleteGraphSummary() {
  const nodes = branches.filter(valid).length;
  const edges = nodes * (nodes - 1) / 2;
  $("selected-name").textContent = "Grafo completo seleccionado";
  $("selected-count").textContent = nodes;
  $("selected-edges").textContent = edges.toLocaleString("es-HN");
  $("selected-connected").innerHTML = "Conectado<br>Grafo completo";
  $("map-label").textContent = "Grafo completo · 50 sucursales";
  $("circuit-summary").hidden = true;
  $("open-constructor").hidden = true;
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

function clearGraphLines() { graphPolylines.forEach((line) => line.setMap(null)); graphPolylines = []; }
function drawCompleteGraph() {
  clearGraphLines();
  if (!map || activeFilter !== "all") return;
  const nodes = branches.filter(valid);
  for (let first = 0; first < nodes.length; first += 1) {
    for (let second = first + 1; second < nodes.length; second += 1) {
      const from = nodes[first], to = nodes[second];
      graphPolylines.push(new google.maps.Polyline({ map, path: [{ lat:+from.lat, lng:+from.lng }, { lat:+to.lat, lng:+to.lng }], strokeColor: "#395a78", strokeOpacity: .11, strokeWeight: 1, clickable: false, zIndex: 1 }));
    }
  }
}
function setMapMode(mode) {
  mapMode = mode;
  document.querySelectorAll("#map-modes button").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  clearGraphLines(); clearRouteLines();
  if (mode === "graph") {
    if (activeFilter !== "all") { $("circuit-message").textContent = "El grafo completo se muestra al seleccionar Todas las sucursales."; return; }
    drawCompleteGraph(); $("circuit-message").textContent = "Grafo completo: cada sucursal está conectada visualmente con todas las demás.";
  }
  if (mode === "graph") renderCompleteGraphSummary();
  else renderSelectedBlock();
  if (mode === "hamilton") { $("open-constructor").click(); }
}

function estimateKm(first, second) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(+second.lat - +first.lat), dLng = toRad(+second.lng - +first.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(+first.lat)) * Math.cos(toRad(+second.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
function renderComparison() {
  const reps = $("representatives");
  reps.innerHTML = ["A", "B", "C"].map((zone) => `<label>Entrada del bloque ${zone}<select data-representative="${zone}">${blockBranches(zone).map((branch) => `<option value="${branch.id}">${escapeHtml(branch.name)}</option>`).join("")}</select></label>`).join("");
  renderComparisonRows();
}
function renderComparisonRows() {
  const representative = Object.fromEntries([...document.querySelectorAll("[data-representative]")].map((select) => [select.dataset.representative, branches.find((branch) => branch.id === select.value)]));
  const values = Object.entries(candidates).map(([id, candidate]) => {
    const legs = ["A", "B", "C"].map((zone) => estimateKm(candidate, representative[zone]));
    return { id, candidate, legs, total: legs.reduce((sum, item) => sum + item, 0) };
  });
  const best = values.reduce((first, current) => current.total < first.total ? current : first);
  $("comparison-rows").innerHTML = values.map((item) => `<tr class="${item.id === best.id ? "best-row" : ""}"><td><b>${escapeHtml(item.candidate.name)}</b></td>${item.legs.map((leg) => `<td>${leg.toFixed(2)} km</td>`).join("")}<td><b>${item.total.toFixed(2)} km</b></td><td>${item.candidate.price}</td><td>${item.id === best.id ? '<span class="result-best">Menor distancia estimada</span>' : '<span class="result-viable">Opción viable</span>'}</td></tr>`).join("");
}
function renderTechnicalPicker() {
  $("technical-branches").innerHTML = branches.filter((branch) => activeFilter === "all" || branch.block === activeFilter).map((branch) => `<label><input type="checkbox" value="${branch.id}" ${technicalSelection.has(branch.id) ? "checked" : ""}>${escapeHtml(branch.id)} · ${escapeHtml(branch.name)}</label>`).join("");
}
function technicalZone() { return $("technical-block-select").value || selectedZone; }
function technicalCandidates() { return blockBranches(technicalZone()); }
function renderTechnicalPage() {
  const zone = technicalZone();
  $("technical-block-select").innerHTML = baseBlocks.map((block) => `<option value="${block.id}" ${block.id === zone ? "selected" : ""}>${escapeHtml(block.name)}</option>`).join("");
  $("technical-candidate-select").value = selectedCandidateId;
  const items = technicalCandidates();
  $("technical-page-branches").innerHTML = items.map((branch) => `<label><input type="checkbox" value="${branch.id}" ${technicalSelection.has(branch.id) ? "checked" : ""}><span><b>${escapeHtml(branch.id)}</b> ${escapeHtml(branch.name)}</span></label>`).join("");
  const selected = [...technicalSelection].filter((id) => items.some((branch) => branch.id === id));
  $("technical-count").textContent = `${selected.length} de ${items.length} seleccionadas`;
  $("technical-restriction").textContent = `Restricción activa: solo sucursales del Bloque ${zone}`;
  $("technical-result-block").textContent = (blockInfo[zone] || {}).name || `Bloque ${zone}`;
  $("technical-result-candidate").textContent = candidates[selectedCandidateId].name;
  $("technical-result-count").textContent = `${selected.length} de ${items.length}`;
}
function renderTechnicalResults(data = null) {
  if (!data?.cycle) return;
  const names = new Map(currentWork().nodes.map((node) => [node.id, node.name]));
  const criteria = data.criteria;
  const degree = Math.min(...Object.values(criteria.degrees));
  const yesNo = (value) => value ? "Sí ✓" : "No";
  $("technical-result-total-nodes").textContent = criteria.n;
  $("technical-result-edges").textContent = currentWork().edges.length;
  $("technical-result-degree").textContent = degree;
  $("technical-result-connected").textContent = yesNo(criteria.connected);
  $("technical-result-dirac").textContent = yesNo(criteria.dirac);
  $("technical-result-ore").textContent = yesNo(criteria.ore);
  $("technical-result-cycle").textContent = "Encontrado ✓";
  $("technical-result-distance").textContent = `${data.cycle.total_weight.toFixed(2)} km`;
  $("technical-result-nodes").textContent = data.cycle.path.length - 1;
  $("technical-result-return").textContent = candidates[selectedCandidateId].name;
  const finalIndex = data.cycle.path.length - 1;
  $("technical-order").innerHTML = data.cycle.path.map((id, index) => {
    const label = escapeHtml(names.get(id));
    if (index === 0) return `<li><b>Salida:</b> ${label}</li>`;
    if (index === finalIndex) return `<li><b>Regreso:</b> ${label}</li>`;
    return `<li>${label}</li>`;
  }).join("");
  $("technical-map-message").textContent = "Circuito encontrado con las sucursales seleccionadas.";
}
function openTechnicalPage() {
  document.body.classList.add("technical-active");
  $("technical-page").hidden = false;
  document.querySelector(".dashboard").hidden = true;
  $("comparison").hidden = true; $("constructor").hidden = true;
  $("technical-map-host").appendChild($("map"));
  selectedZone = technicalZone(); activeFilter = selectedZone; clearGraphLines();
  renderTechnicalPage(); drawDashboardMarkers(); drawCandidateMarkers();
  if (map && window.google) { google.maps.event.trigger(map, "resize"); fitToBranches(technicalCandidates()); }
  window.scrollTo(0, 0);
}
function closeTechnicalPage() {
  $("map-home").appendChild($("map"));
  $("technical-page").hidden = true; document.querySelector(".dashboard").hidden = false;
  document.body.classList.remove("technical-active");
  activeFilter = "all"; clearRouteLines(); drawDashboardMarkers();
  if (map && window.google) { google.maps.event.trigger(map, "resize"); fitToBranches(branches); }
  window.scrollTo(0, 0);
}
async function runTechnicalCircuit() {
  const ids = [...technicalSelection].filter((id) => technicalCandidates().some((branch) => branch.id === id));
  if (ids.length < 3) { $("technical-map-message").textContent = "Selecciona al menos tres sucursales."; return; }
  const response = await fetch("/api/custom-block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch_ids: ids }) });
  const data = await response.json();
  if (!response.ok) { $("technical-map-message").textContent = data.error; return; }
  const preparedResponse = await fetch("/api/prepare-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: data.block, candidate: candidatePayload() }) });
  const prepared = await preparedResponse.json();
  if (!preparedResponse.ok) { $("technical-map-message").textContent = prepared.error; return; }
  workingBlocks = [prepared.block]; selectedId = prepared.block.id; renderConstructor(); await analyze();
}
async function createTechnicalBlock() {
  const ids = [...document.querySelectorAll("#technical-branches input:checked")].map((input) => input.value);
  const response = await fetch("/api/custom-block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branch_ids: ids }) });
  const data = await response.json();
  if (!response.ok) { $("status").textContent = data.error; return; }
  const prepared = await (await fetch("/api/prepare-route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: data.block, candidate: candidatePayload() }) })).json();
  workingBlocks = [prepared.block]; selectedId = prepared.block.id; renderConstructor(); await analyze(); $("status").textContent = `Subgrafo técnico creado con ${ids.length} sucursales.`;
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

async function selectCandidate(id, drawCircuitOnMainMap = false) {
  selectedCandidateId = id;
  const candidate = candidates[id];
  if (drawCircuitOnMainMap) {
    mapMode = "hamilton";
    document.querySelectorAll("#map-modes button").forEach((button) => button.classList.toggle("active", button.dataset.mode === "hamilton"));
    clearGraphLines();
  }
  document.querySelectorAll(".candidate").forEach((card) => card.classList.toggle("active", card.dataset.candidate === id));
  if ($("candidate-select")) $("candidate-select").value = id;
  drawCandidateMarkers();
  if (baseBlocks.length) await refreshCandidateRoutes();
  if (!map) return;
  if (drawCircuitOnMainMap) { fitToBranches(currentWork()?.nodes || blockBranches(selectedZone)); return; }
  map.panTo({ lat: candidate.lat, lng: candidate.lng });
  map.setZoom(15);
  infoWindow.setContent(`<b>${candidate.name}</b><br>${candidate.price}`);
  infoWindow.setPosition({ lat: candidate.lat, lng: candidate.lng });
  infoWindow.open({ map });
}
function openCandidateModal(id) {
  const candidate = candidates[id], detail = candidateDetails[id];
  $("candidate-modal").dataset.candidate = id;
  $("candidate-modal-image").src = detail.image;
  $("candidate-modal-image").alt = `Edificio de ${candidate.name}`;
  $("candidate-modal-zone").textContent = `Sede candidata · ${detail.zone}`;
  $("candidate-modal-name").textContent = candidate.name;
  $("candidate-modal-address").textContent = detail.address;
  $("candidate-modal-price").textContent = candidate.price;
  $("candidate-modal-services").textContent = detail.services;
  $("candidate-modal").hidden = false;
}
function closeCandidateModal() { $("candidate-modal").hidden = true; }
function showCandidateOnMap() {
  const id = $("candidate-modal").dataset.candidate;
  closeCandidateModal();
  if (!$("technical-page").hidden) closeTechnicalPage();
  activeFilter = "all"; setMapMode("branches"); selectCandidate(id);
  document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
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
    clearCircuitDisplay();
    const previousId = selectedId;
    workingBlocks = await buildCandidateRoutes();
    const preferredId = activeFilter !== "all" ? activeFilter : previousId;
    selectedId = workingBlocks.some((block) => block.id === preferredId) ? preferredId : workingBlocks[0].id;
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
  if (!response.ok) { $("result").textContent = data.error; $("circuit-message").textContent = "No se pudo calcular el circuito."; $("route-distance").textContent = "Distancia pendiente de rutas"; return; }
  lastCycle = data.cycle; const criteria = data.criteria, labels = workNames();
  const cycle = data.cycle ? data.cycle.path.map((id) => escapeHtml(labels.get(id))).join(" → ") : "No hay circuito con las aristas actuales.";
  const returnPoint = data.cycle ? escapeHtml(labels.get(data.cycle.path[0])) : "—";
  $("result").innerHTML = `<p><b>Pesos:</b> ${escapeHtml(currentWork().weight_source || "Configurados manualmente.")}</p><p><b>Conexo:</b> <span class="${criteria.connected ? "ok" : "bad"}">${criteria.connected ? "sí" : "no"}</span> · <b>Grado mínimo 2:</b> ${criteria.minimum_degree ? "sí" : "no"} · <b>Dirac:</b> ${criteria.dirac ? "cumple" : "no cumple"} · <b>Ore:</b> ${criteria.ore ? "cumple" : "no cumple"}</p><p><b>Inicio y retorno:</b> ${returnPoint}</p><p><b>Circuito:</b> ${cycle}</p>${data.cycle ? `<p><b>Distancia total:</b> ${data.cycle.total_weight.toFixed(2)} km</p>` : ""}`;
  if (data.cycle) { $("circuit-message").textContent = "Hay un circuito en el subgrafo de trabajo."; $("route-distance").textContent = `${data.cycle.total_weight.toFixed(2)} km en el subgrafo trabajado`; drawCircuitEdges(); if (!$("technical-page").hidden) renderTechnicalResults(data); }
  else { $("circuit-message").textContent = "No se encontró un circuito con las aristas actuales."; $("route-distance").textContent = "Distancia pendiente de rutas"; }
}

function updateEdgeWeight(from, to, km) {
  const edge = currentWork().edges.find((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from));
  if (edge) edge.weight = Math.round(km * 100) / 100;
}

function clearRouteLines() { routePolylines.forEach((line) => line.setMap(null)); routePolylines = []; }
function clearCircuitDisplay() {
  clearRouteLines(); lastCycle = null;
  if (infoWindow) infoWindow.close();
  $("circuit-message").textContent = "Selecciona el bloque y busca un nuevo circuito.";
  $("route-distance").textContent = "Distancia pendiente de rutas";
  $("result").innerHTML = "";
}
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
  if (!map || !lastCycle || ($("constructor").hidden && $("technical-page").hidden && mapMode !== "hamilton")) return;
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
      const route = routes?.[0]; if (!route || route.distanceMeters === undefined) throw new Error(`No hay ruta para ${from.name}.`);
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
  $("map-modes").addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) setMapMode(button.dataset.mode); });
  $("filters").addEventListener("click", (event) => {
    const button = event.target.closest("button"); if (!button) return;
    clearCircuitDisplay();
    activeFilter = button.dataset.filter;
    [...$("filters").querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item === button));
    if (activeFilter !== "all") { selectedZone = activeFilter; selectedId = activeFilter; renderSelectedBlock(); renderConstructor(); }
    renderBranchList(); drawDashboardMarkers(); clearGraphLines();
    fitToBranches(activeFilter === "all" ? branches : blockBranches(activeFilter));
  });
  $("branch-list").addEventListener("click", (event) => { const item = event.target.closest("[data-branch]"); const branch = branches.find((entry) => entry.id === item?.dataset.branch); if (branch && map && valid(branch)) { map.panTo({ lat: Number(branch.lat), lng: Number(branch.lng) }); map.setZoom(15); } });
  $("load-branches").addEventListener("click", async () => { const data = await (await fetch("/api/branches")).json(); branches = data.branches; blockInfo = data.block_info; renderCounters(); renderBranchList(); renderSelectedBlock(); drawDashboardMarkers(); drawCandidateMarkers(); });
  $("open-constructor").addEventListener("click", () => { activeFilter = selectedZone; technicalSelection = new Set(blockBranches(selectedZone).map((branch) => branch.id)); openTechnicalPage(); });
  $("close-constructor").addEventListener("click", () => { $("constructor").hidden = true; clearRouteLines(); });
  $("candidate-button").addEventListener("click", () => $("candidates").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("candidate-button").addEventListener("click", () => { $("comparison").hidden = false; renderComparison(); $("comparison").scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("close-comparison").addEventListener("click", () => $("comparison").hidden = true);
  $("representatives").addEventListener("change", renderComparisonRows);
  $("technical-button").addEventListener("click", () => { activeFilter = selectedZone; technicalSelection = new Set(blockBranches(selectedZone).map((branch) => branch.id)); openTechnicalPage(); });
  $("back-main").addEventListener("click", closeTechnicalPage);
  $("technical-block-select").addEventListener("change", (event) => { selectedZone = event.target.value; activeFilter = selectedZone; technicalSelection = new Set(technicalCandidates().map((branch) => branch.id)); renderTechnicalPage(); drawDashboardMarkers(); if (map) fitToBranches(technicalCandidates()); });
  $("technical-candidate-select").addEventListener("change", (event) => { selectedCandidateId = event.target.value; selectCandidate(selectedCandidateId); renderTechnicalPage(); });
  $("technical-page-branches").addEventListener("change", (event) => { if (event.target.matches("input")) { event.target.checked ? technicalSelection.add(event.target.value) : technicalSelection.delete(event.target.value); renderTechnicalPage(); } });
  $("technical-clear").addEventListener("click", () => { technicalSelection.clear(); renderTechnicalPage(); });
  $("technical-run").addEventListener("click", runTechnicalCircuit);
  $("technical-search").addEventListener("input", (event) => { const text = event.target.value.toLowerCase(); document.querySelectorAll("#technical-page-branches label").forEach((label) => label.hidden = !label.textContent.toLowerCase().includes(text)); });
  $("technical-fullscreen").addEventListener("click", () => $("technical-map-host").requestFullscreen());
  $("candidates").addEventListener("click", (event) => { const card = event.target.closest("[data-candidate]"); if (card) selectCandidate(card.dataset.candidate, true); });
  $("comparison").addEventListener("click", (event) => { const card = event.target.closest(".venue-card[data-candidate]"); if (card) openCandidateModal(card.dataset.candidate); });
  $("close-candidate-modal").addEventListener("click", closeCandidateModal);
  $("show-candidate-map").addEventListener("click", showCandidateOnMap);
  $("candidate-modal").addEventListener("click", (event) => { if (event.target === $("candidate-modal")) closeCandidateModal(); });
  $("candidate-select").addEventListener("change", (event) => selectCandidate(event.target.value));
  $("block").addEventListener("change", (event) => { selectedId = event.target.value; renderConstructor(); clearCircuitDisplay(); });
  $("analyze").addEventListener("click", analyze); $("roads").addEventListener("click", drawRoads);
  $("reset").addEventListener("click", async () => { const data = await (await fetch("/api/route-blocks")).json(); baseBlocks = data.blocks; selectedId = baseBlocks[0].id; await refreshCandidateRoutes(); });
  $("technical-branches").addEventListener("change", (event) => { if (event.target.matches("input")) { event.target.checked ? technicalSelection.add(event.target.value) : technicalSelection.delete(event.target.value); } });
  $("select-visible").addEventListener("click", () => { branches.filter((branch) => activeFilter === "all" || branch.block === activeFilter).forEach((branch) => technicalSelection.add(branch.id)); renderTechnicalPicker(); });
  $("clear-selected").addEventListener("click", () => { technicalSelection.clear(); renderTechnicalPicker(); });
  $("create-custom").addEventListener("click", createTechnicalBlock);
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
  renderCounters(); renderBranchList(); renderSelectedBlock(); renderConstructor(); bindEvents(); initialiseMap();
})();
