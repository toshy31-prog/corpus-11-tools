import {
  createExperiment,
  diffuseStep,
  diffuseUntilStable,
  erase,
  exportSnapshot,
  injectRandomFault,
  measure,
  readBit,
  runBatch,
  writeBit,
} from "./simulator.mjs";

const byId = (id) => document.getElementById(id);
const elements = {
  topology: byId("topology"), size: byId("size"), sizeValue: byId("size-value"),
  propagation: byId("propagation"), erasure: byId("erasure"), fault: byId("fault"), seed: byId("seed"),
  writePort: byId("write-port"), readPort: byId("read-port"), erasePort: byId("erase-port"),
  network: byId("network"), status: byId("status"), eventLog: byId("event-log"),
  metricRead: byId("metric-read"), metricWork: byId("metric-work"), metricDepth: byId("metric-depth"),
  metricTraces: byId("metric-traces"), traceDetail: byId("trace-detail"), counterfactual: byId("counterfactual"),
  batchEmpty: byId("batch-empty"), batchResult: byId("batch-result"), batchExact: byId("batch-exact"),
  batchRead: byId("batch-read"), batchResidual: byId("batch-residual"), batchSummary: byId("batch-summary"),
  barExact: byId("bar-exact"), barRead: byId("bar-read"), barResidual: byId("bar-residual"),
};

let experiment;
let batch = null;

function optionsFromForm() {
  return {
    topology: elements.topology.value,
    size: Number(elements.size.value),
    propagation: elements.propagation.value,
    erasure: elements.erasure.value,
    fault: elements.fault.value,
    seed: Number(elements.seed.value),
    writePort: Number(elements.writePort.value || 0),
    readPort: Number(elements.readPort.value || Number(elements.size.value) - 1),
    erasePort: Number(elements.erasePort.value || 0),
  };
}

function updatePortOptions(preserve = false) {
  const size = Number(elements.size.value);
  const previous = preserve ? [elements.writePort.value, elements.readPort.value, elements.erasePort.value] : ["0", String(size - 1), "0"];
  for (const [index, select] of [elements.writePort, elements.readPort, elements.erasePort].entries()) {
    select.replaceChildren();
    for (let node = 0; node < size; node += 1) {
      const option = document.createElement("option");
      option.value = String(node);
      option.textContent = `M${node}`;
      select.append(option);
    }
    select.value = Number(previous[index]) < size ? previous[index] : "0";
  }
}

function resetExperiment(message = "Réseau prêt.") {
  experiment = createExperiment(optionsFromForm());
  batch = null;
  elements.batchEmpty.hidden = false;
  elements.batchResult.hidden = true;
  setStatus(message);
  render();
}

function setStatus(message) { elements.status.textContent = message; }

function positionsFor(type, size) {
  const points = [];
  if (type === "line") {
    for (let index = 0; index < size; index += 1) points.push({ x: 70 + index * (620 / (size - 1)), y: 210 });
    return points;
  }
  if (type === "tree") {
    const maxLevel = Math.floor(Math.log2(size));
    for (let index = 0; index < size; index += 1) {
      const level = Math.floor(Math.log2(index + 1));
      const first = 2 ** level - 1;
      const position = index - first;
      const count = Math.min(2 ** level, size - first);
      points.push({ x: 90 + ((position + 1) * 580) / (count + 1), y: 62 + level * (300 / Math.max(1, maxLevel)) });
    }
    return points;
  }
  if (type === "star") {
    points.push({ x: 380, y: 215 });
    for (let index = 1; index < size; index += 1) {
      const angle = -Math.PI / 2 + ((index - 1) * Math.PI * 2) / (size - 1);
      points.push({ x: 380 + Math.cos(angle) * 260, y: 215 + Math.sin(angle) * 155 });
    }
    return points;
  }
  for (let index = 0; index < size; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / size;
    points.push({ x: 380 + Math.cos(angle) * 270, y: 215 + Math.sin(angle) * 155 });
  }
  return points;
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function renderNetwork() {
  elements.network.replaceChildren();
  const positions = positionsFor(experiment.type, experiment.size);
  for (const edge of experiment.edges) {
    const line = svgElement("line", {
      x1: positions[edge.a].x, y1: positions[edge.a].y,
      x2: positions[edge.b].x, y2: positions[edge.b].y,
      class: `edge${edge.online ? "" : " offline"}`,
    });
    const title = svgElement("title");
    title.textContent = `Liaison ${edge.id} — ${edge.online ? "active" : "coupée"}`;
    line.append(title);
    elements.network.append(line);
  }
  for (const node of experiment.nodes) {
    const classes = ["node", node.bit === 1 ? "one" : "", node.online ? "" : "offline", node.id === experiment.writePort ? "port-write" : ""].filter(Boolean).join(" ");
    const group = svgElement("g", { class: classes, transform: `translate(${positions[node.id].x} ${positions[node.id].y})` });
    const title = svgElement("title");
    const roles = [node.id === experiment.writePort ? "écriture" : "", node.id === experiment.readPort ? "lecture" : "", node.id === experiment.erasePort ? "effacement" : ""].filter(Boolean).join(", ");
    title.textContent = `M${node.id}, bit ${node.bit}, ${node.online ? "en ligne" : "hors ligne"}${roles ? `, port ${roles}` : ""}`;
    group.append(title, svgElement("circle", { r: 29 }));
    const label = svgElement("text", { y: -2 }); label.textContent = `M${node.id}`;
    const bit = svgElement("text", { y: 14, class: "bit-label" }); bit.textContent = node.online ? `bit ${node.bit}` : `bit ${node.bit} · off`;
    group.append(label, bit);
    const markers = [];
    if (node.id === experiment.writePort) markers.push("E");
    if (node.id === experiment.readPort) markers.push("L");
    if (node.id === experiment.erasePort) markers.push("X");
    if (markers.length) {
      const marker = svgElement("text", { y: -38, class: "port-marker" }); marker.textContent = markers.join("·"); group.append(marker);
    }
    elements.network.append(group);
  }
}

function renderMetrics() {
  const metrics = measure(experiment);
  elements.metricRead.textContent = experiment.lastRead ? experiment.lastRead.cost : "—";
  elements.metricWork.textContent = experiment.lastErase ? experiment.lastErase.work : "—";
  elements.metricDepth.textContent = experiment.lastErase ? experiment.lastErase.depth : "—";
  elements.metricTraces.textContent = metrics.totalTraces;
  elements.traceDetail.textContent = `${metrics.accessibleTraces} accessible · ${metrics.latentTraces} latente${metrics.latentTraces > 1 ? "s" : ""}`;
  elements.counterfactual.classList.toggle("failed", !metrics.counterfactualExact);
  elements.counterfactual.querySelector("strong").textContent = metrics.counterfactualExact ? "Contrefactuel atteint" : "Contrefactuel non atteint";
  elements.counterfactual.querySelector("span").textContent = metrics.counterfactualExact
    ? "L’état est identique au monde sans écriture."
    : `Distance restante : ${metrics.counterfactualDistance} mémoire(s).`;
}

function renderLog() {
  elements.eventLog.replaceChildren();
  if (!experiment.events.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td"); cell.colSpan = 3; cell.textContent = "Aucune opération."; row.append(cell); elements.eventLog.append(row); return;
  }
  for (const event of experiment.events) {
    const row = document.createElement("tr");
    for (const value of [event.step, event.type, event.detail]) {
      const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
    }
    elements.eventLog.append(row);
  }
}

function render() { renderNetwork(); renderMetrics(); renderLog(); }

function applyLiveConfiguration() {
  experiment.propagation = elements.propagation.value;
  experiment.erasure = elements.erasure.value;
  experiment.fault = elements.fault.value;
  experiment.writePort = Number(elements.writePort.value);
  experiment.readPort = Number(elements.readPort.value);
  experiment.erasePort = Number(elements.erasePort.value);
  render();
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function batchCsv(result) {
  const headers = Object.keys(result.rows[0]);
  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
  return [headers.join(","), ...result.rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
}

function renderBatch(result) {
  const percent = (value) => `${Math.round(value * 100)} %`;
  elements.batchEmpty.hidden = true;
  elements.batchResult.hidden = false;
  elements.batchExact.textContent = percent(result.summary.exactEraseRate);
  elements.batchRead.textContent = percent(result.summary.readSuccessRate);
  elements.batchResidual.textContent = result.summary.meanResidualTraces.toFixed(2);
  elements.barExact.style.width = percent(result.summary.exactEraseRate);
  elements.barRead.style.width = percent(result.summary.readSuccessRate);
  elements.barResidual.style.width = `${Math.min(100, result.summary.meanResidualTraces / result.options.size * 100)}%`;
  elements.batchSummary.textContent = `Travail moyen ${result.summary.meanEraseWork.toFixed(2)} · profondeur moyenne ${result.summary.meanEraseDepth.toFixed(2)} · coût de lecture moyen ${result.summary.meanReadCost.toFixed(2)}.`;
}

byId("reset").addEventListener("click", () => resetExperiment("Réseau recréé avec les paramètres courants."));
byId("write").addEventListener("click", () => { const result = writeBit(experiment); setStatus(result.changed ? "Bit écrit." : "Le bit était déjà présent."); render(); });
byId("diffuse-step").addEventListener("click", () => { const result = diffuseStep(experiment); setStatus(`${result.copies} nouvelle(s) copie(s).`); render(); });
byId("diffuse-all").addEventListener("click", () => { const result = diffuseUntilStable(experiment); setStatus(`Diffusion stabilisée : ${result.copies} copie(s) en ${result.steps} étape(s).`); render(); });
byId("inject-fault").addEventListener("click", () => { const result = injectRandomFault(experiment); setStatus(result ? `Panne injectée : ${result.kind} ${result.id}.` : "Aucune panne injectée."); render(); });
byId("read").addEventListener("click", () => { const result = readBit(experiment); setStatus(result.found ? `Bit retrouvé sur M${result.node}.` : "Bit non accessible depuis le port de lecture."); render(); });
byId("erase").addEventListener("click", () => { const result = erase(experiment); setStatus(result.exact ? "Effacement exact : aucune trace restante." : `${result.residual} trace(s) résiduelle(s).`); render(); });
byId("guided-run").addEventListener("click", () => {
  resetExperiment("Expérience complète en cours…");
  writeBit(experiment); diffuseUntilStable(experiment); injectRandomFault(experiment); readBit(experiment); const result = erase(experiment);
  setStatus(result.exact ? "Expérience terminée : effacement exact." : `Expérience terminée : ${result.residual} trace(s) résiduelle(s).`); render();
});
byId("run-batch").addEventListener("click", () => { batch = runBatch(optionsFromForm(), 100); renderBatch(batch); setStatus("Campagne de 100 essais terminée."); });
byId("export-json").addEventListener("click", () => download("memory-erasure-experiment.json", JSON.stringify({ snapshot: exportSnapshot(experiment), batch }, null, 2), "application/json"));
byId("export-csv").addEventListener("click", () => {
  const result = batch ?? runBatch(optionsFromForm(), 100);
  download("memory-erasure-trials.csv", batchCsv(result), "text/csv;charset=utf-8");
});

elements.size.addEventListener("input", () => { elements.sizeValue.value = elements.size.value; updatePortOptions(false); });
for (const control of [elements.propagation, elements.erasure, elements.fault, elements.writePort, elements.readPort, elements.erasePort]) {
  control.addEventListener("change", applyLiveConfiguration);
}
for (const control of [elements.topology, elements.size, elements.seed]) control.addEventListener("change", () => resetExperiment("Réseau recréé après changement structurel."));

updatePortOptions(false);
resetExperiment();
