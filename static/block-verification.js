/* Indicadores académicos del subgrafo de cada bloque, sin incluir la sede candidata. */
let mainBlockAnalysis = {};
let mainAnalysisStarted = false;

function ensureMainVerification() {
  let verification = document.getElementById("block-verification");
  if (verification) return verification;
  document.getElementById("selected-card").querySelector(".block-metrics").insertAdjacentHTML("afterend", `
    <section class="block-verification" id="block-verification" aria-label="Verificación matemática del bloque">
      <h3>Verificación del bloque</h3>
      <p>Grado mínimo δ(G): <b id="selected-degree">—</b></p>
      <p>Grafo conexo: <b id="selected-connected-state">—</b></p>
      <p>Dirac: <b id="selected-dirac">—</b></p>
      <p>Ore: <b id="selected-ore">—</b></p>
      <p>Circuito Hamiltoniano: <b id="selected-hamilton">—</b></p>
    </section>`);
  const style = document.createElement("style");
  style.textContent = ".block-verification{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin:8px 0;padding:9px;border:1px solid #f1e6bc;border-radius:7px;background:#fffdf4}.block-verification h3{grid-column:1/-1;margin:0;padding-bottom:5px;border-bottom:1px solid #f1e6bc;color:#173c68;font-size:12px}.block-verification p{display:flex;justify-content:space-between;gap:6px;margin:0;color:#607b95;font-size:11px}.block-verification p:last-child{grid-column:1/-1}.block-verification b{color:#173c68;text-align:right}.block-verification .yes{color:#0b8250}.block-verification .no{color:#a24646}@media(max-width:450px){.block-verification{grid-template-columns:1fr}}";
  document.head.append(style);
  return document.getElementById("block-verification");
}

function setMainMetric(id, value, className = "") {
  const element = document.getElementById(id);
  element.textContent = value;
  element.className = className;
}

function renderMainVerification() {
  const verification = ensureMainVerification();
  verification.hidden = false;
  const analysis = mainBlockAnalysis[selectedZone];
  const criteria = analysis?.criteria;
  const state = (value) => value === undefined ? "Calculando…" : value ? "Sí ✓" : "No";
  const degree = criteria ? Math.min(...Object.values(criteria.degrees)) : "—";
  setMainMetric("selected-degree", degree);
  setMainMetric("selected-connected-state", state(criteria?.connected), criteria?.connected ? "yes" : criteria ? "no" : "");
  setMainMetric("selected-dirac", state(criteria?.dirac), criteria?.dirac ? "yes" : criteria ? "no" : "");
  setMainMetric("selected-ore", state(criteria?.ore), criteria?.ore ? "yes" : criteria ? "no" : "");
  setMainMetric("selected-hamilton", analysis ? analysis.cycle ? "Encontrado ✓" : "No encontrado" : "Calculando…", analysis?.cycle ? "yes" : analysis ? "no" : "");
}

async function loadMainBlockAnalysis() {
  const results = await Promise.all(baseBlocks.map(async (block) => {
    const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ block, start_id: block.nodes[0]?.id }) });
    return [block.id, response.ok ? await response.json() : null];
  }));
  mainBlockAnalysis = Object.fromEntries(results);
  renderMainVerification();
}

const originalRenderSelectedBlock = renderSelectedBlock;
renderSelectedBlock = function () {
  originalRenderSelectedBlock();
  renderMainVerification();
  if (baseBlocks.length && !mainAnalysisStarted) {
    mainAnalysisStarted = true;
    loadMainBlockAnalysis();
  }
};

const originalRenderCompleteGraphSummary = renderCompleteGraphSummary;
renderCompleteGraphSummary = function () {
  originalRenderCompleteGraphSummary();
  ensureMainVerification().hidden = true;
};
