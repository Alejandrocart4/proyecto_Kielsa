let branches = [], blockInfo = {}, workingBlocks = [];
let selectedZone = "A", activeFilter = "all", selectedId = null;
let map, Route, infoWindow, dashboardMarkers = [], routePolylines = [], lastCycle = null;

const $ = (id) => document.getElementById(id);
const colors = { A: "#1677e8", B: "#11a65b", C: "#f5a900" };
const currentWork = () => workingBlocks.find((item) => item.id === selectedId);
const valid = (node) => Number.isFinite(Number(node?.lat)) && Number.isFinite(Number(node?.lng)) && !(Number(node.lat) === 0 && Number(node.lng) === 0);
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function updateClock() {
  const now = new Date();
  $("today").textContent = now.toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric" });
  $("clock").textContent = now.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
}

function blockBranches(zone = selectedZone) { return branches.filter((branch) => branch.block === zone); }

function renderCounters() {
  const count = (zone) => branches.filter((branch) => branch.block === zone).length;
  $("branch-total").textContent = branches.length;
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
  $("zone-select").value = selectedZone;
  $("selected-name").textContent = `${data.name} seleccionado`;
  $("selected-count").textContent = total;
  $("map-label").textContent = `${data.name} · ${data.zone}`;
  $("route-summary").innerHTML = `<p><b>Zona:</b> ${escapeHtml(data.zone)}</p><p><b>Asignación:</b> ${total} sucursales por cercanía geográfica.</p><p><b>Siguiente paso:</b> registrar conexiones viales reales con sus vecinos.</p>`;
  const dot = $("selected-card").querySelector(".dot");
  dot.className = `dot ${selectedZone.toLowerCase()}`;
}

function markerIcon(zone, focused) {
  return { path: google.maps.SymbolPath.CIRCLE, fillColor: colors[zone], fillOpacity: focused ? 1 : .84, strokeColor: "#fff", strokeWeight: focused ? 3 : 1.5, scale: focused ? 9 : 6 };
}

function clearDashboardMarkers() { dashboardMarkers.forEach((marker) => marker.setMap(null)); dashboardMarkers = []; }

function drawDashboardMarkers() {
  if (!map) return;
  clearDashboardMarkers();
  branches.filter(valid).forEach((branch) => {
    const marker = new google.maps.Marker({ map, position: { lat: Number(branch.lat), lng: Number(branch.lng) }, title: `${branch.id} · ${branch.name}`, icon: markerIcon(branch.block, branch.block === selectedZone), zIndex: branch.block === selectedZone ? 3 : 1 });
    marker.addListener("click", () => {
      infoWindow.setContent(`<b>${escapeHtml(branch.id)} · ${escapeHtml(branch.name)}</b><br><span>${escapeHtml(branch.address)}</span><br><a target="_blank" rel="noreferrer" href="${branch.map_url}">Abrir en Google Maps</a>`);
      infoWindow.open({ map, anchor: marker });
    });
    dashboardMarkers.push(marker);
  });
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
    drawDashboardMarkers(); fitToBranches(branches);
  } catch (error) { $("map").textContent = `${error.message} Verifica Maps JavaScript API y Routes API.`; }
}

function saveWorkingBlocks() { localStorage.setItem("kielsa-python-blocks", JSON.stringify(workingBlocks)); }
function option(items, selected) { return items.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join(""); }
function workNames() { return new Map(currentWork().nodes.map((item) => [item.id, item.name])); }

function renderConstructor() {
  const block = currentWork(); if (!block) return;
  $("block").innerHTML = option(workingBlocks, selectedId);
  const start = block.nodes.some((node) => node.id === $("start").value) ? $("start").value : block.nodes[0]?.id;
  $("start").innerHTML = option(block.nodes, start);
  $("from").innerHTML = option(block.nodes, block.nodes[0]?.id);
  $("to").innerHTML = option(block.nodes, block.nodes[1]?.id);
  $("nodes").innerHTML = block.nodes.map((node) => `<li><span>${escapeHtml(node.name)}</span><button data-node="${node.id}">Eliminar</button></li>`).join("");
  const labels = workNames();
  $("edges").innerHTML = block.edges.map((edge, index) => `<div class="edge"><span>${escapeHtml(labels.get(edge.from))}</span><strong>${Number(edge.weight).toFixed(2)} km</strong><span>${escapeHtml(labels.get(edge.to))}</span><button data-edge="${index}">Eliminar</button></div>`).join("");
}

async function analyze() {
  const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block: currentWork(), start_id: $("start").value }) });
  const data = await response.json();
  if (!response.ok) { $("result").textContent = data.error; return; }
  lastCycle = data.cycle; const criteria = data.criteria, labels = workNames();
  const cycle = data.cycle ? data.cycle.path.map((id) => escapeHtml(labels.get(id))).join(" → ") : "No hay circuito con las aristas actuales.";
  $("result").innerHTML = `<p><b>Conexo:</b> <span class="${criteria.connected ? "ok" : "bad"}">${criteria.connected ? "sí" : "no"}</span> · <b>Grado mínimo 2:</b> ${criteria.minimum_degree ? "sí" : "no"} · <b>Dirac:</b> ${criteria.dirac ? "cumple" : "no cumple"} · <b>Ore:</b> ${criteria.ore ? "cumple" : "no cumple"}</p><p><b>Circuito:</b> ${cycle}</p>${data.cycle ? `<p><b>Distancia total:</b> ${data.cycle.total_weight.toFixed(2)} km</p>` : ""}`;
  if (data.cycle) { $("circuit-message").textContent = "Hay un circuito en el subgrafo de trabajo."; $("route-distance").textContent = `${data.cycle.total_weight.toFixed(2)} km en el subgrafo trabajado`; }
}

function updateEdgeWeight(from, to, km) {
  const edge = currentWork().edges.find((item) => (item.from === from && item.to === to) || (item.from === to && item.to === from));
  if (edge) edge.weight = Math.round(km * 100) / 100;
}

async function drawRoads() {
  if (!map || !Route || !lastCycle) { $("status").textContent = "Primero busca un circuito y espera a que cargue el mapa."; return; }
  const nodes = new Map(currentWork().nodes.map((node) => [node.id, node]));
  const legs = lastCycle.path.slice(0, -1).map((from, index) => [from, lastCycle.path[index + 1]]);
  if (legs.some(([from, to]) => !valid(nodes.get(from)) || !valid(nodes.get(to)))) { $("status").textContent = "Faltan coordenadas en un nodo del circuito."; return; }
  routePolylines.forEach((line) => line.setMap(null)); routePolylines = []; $("status").textContent = "Consultando caminos por carretera…";
  try {
    for (const [fromId, toId] of legs) {
      const from = nodes.get(fromId), to = nodes.get(toId);
      const { routes } = await Route.computeRoutes({ origin: { lat: +from.lat, lng: +from.lng }, destination: { lat: +to.lat, lng: +to.lng }, travelMode: "DRIVING", fields: ["path", "distanceMeters"] });
      const route = routes?.[0]; if (!route?.path?.length) throw new Error(`No hay ruta para ${from.name}.`);
      routePolylines.push(new google.maps.Polyline({ map, path: route.path, strokeColor: "#7d3ee6", strokeWeight: 5 }));
      updateEdgeWeight(fromId, toId, route.distanceMeters / 1000);
    }
    saveWorkingBlocks(); renderConstructor(); await analyze(); $("status").textContent = "Caminos dibujados y pesos actualizados con kilómetros reales.";
  } catch (error) { $("status").textContent = error.message; }
}

function bindEvents() {
  $("search").addEventListener("input", renderBranchList);
  $("filters").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; activeFilter = button.dataset.filter; [...$("filters").querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item === button)); renderBranchList(); });
  $("branch-list").addEventListener("click", (event) => { const item = event.target.closest("[data-branch]"); const branch = branches.find((entry) => entry.id === item?.dataset.branch); if (branch && map && valid(branch)) { map.panTo({ lat: Number(branch.lat), lng: Number(branch.lng) }); map.setZoom(15); } });
  $("zone-select").addEventListener("change", (event) => setZone(event.target.value));
  $("focus-block").addEventListener("click", () => setZone(selectedZone, true));
  $("show-all").addEventListener("click", () => { activeFilter = "all"; [...$("filters").querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item.dataset.filter === "all")); renderBranchList(); drawDashboardMarkers(); fitToBranches(branches); });
  $("load-branches").addEventListener("click", async () => { const data = await (await fetch("/api/branches")).json(); branches = data.branches; blockInfo = data.block_info; renderCounters(); renderBranchList(); renderSelectedBlock(); drawDashboardMarkers(); });
  $("open-constructor").addEventListener("click", () => { $("constructor").hidden = false; $("constructor").scrollIntoView({ behavior: "smooth" }); });
  $("close-constructor").addEventListener("click", () => { $("constructor").hidden = true; });
  $("toggle-settings").addEventListener("click", () => { $("constructor").hidden = !$("constructor").hidden; if (!$("constructor").hidden) $("constructor").scrollIntoView({ behavior: "smooth" }); });
  $("candidate-button").addEventListener("click", () => $("candidates").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("block").addEventListener("change", (event) => { selectedId = event.target.value; renderConstructor(); analyze(); });
  $("analyze").addEventListener("click", analyze); $("roads").addEventListener("click", drawRoads);
  $("reset").addEventListener("click", async () => { const data = await (await fetch("/api/blocks")).json(); workingBlocks = data.blocks; selectedId = workingBlocks[0].id; saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("node-form").addEventListener("submit", (event) => { event.preventDefault(); const name = $("node-name").value.trim(); if (!name) return; currentWork().nodes.push({ id: `N${Date.now()}`, name, lat: +$("node-lat").value || null, lng: +$("node-lng").value || null }); event.target.reset(); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("edge-form").addEventListener("submit", (event) => { event.preventDefault(); const from = $("from").value, to = $("to").value, weight = +$("weight").value; if (from !== to && weight > 0 && !currentWork().edges.some((edge) => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from))) currentWork().edges.push({ from, to, weight }); event.target.reset(); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("nodes").addEventListener("click", (event) => { const id = event.target.dataset.node; if (!id) return; currentWork().nodes = currentWork().nodes.filter((node) => node.id !== id); currentWork().edges = currentWork().edges.filter((edge) => edge.from !== id && edge.to !== id); saveWorkingBlocks(); renderConstructor(); analyze(); });
  $("edges").addEventListener("click", (event) => { if (event.target.dataset.edge === undefined) return; currentWork().edges.splice(+event.target.dataset.edge, 1); saveWorkingBlocks(); renderConstructor(); analyze(); });
}

(async () => {
  const [branchData, workData] = await Promise.all([fetch("/api/branches").then((response) => response.json()), fetch("/api/blocks").then((response) => response.json())]);
  branches = branchData.branches; blockInfo = branchData.block_info;
  const stored = localStorage.getItem("kielsa-python-blocks"); workingBlocks = stored ? JSON.parse(stored) : workData.blocks; selectedId = workingBlocks[0].id;
  updateClock(); setInterval(updateClock, 30000); renderCounters(); renderBranchList(); renderSelectedBlock(); renderConstructor(); bindEvents(); analyze(); initialiseMap();
})();
