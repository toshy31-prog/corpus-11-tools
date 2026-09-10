import { summarizeCampaign, validateCampaign } from "./campaign-validator.js";
import { ACTIVE_CAMPAIGN } from "./campaign.generated.js";

const STORAGE_PREFIX = "corpus-builder-draft";
const $ = (selector) => document.querySelector(selector);
const clone = (value) => structuredClone(value);
const storageKey = (source = ACTIVE_CAMPAIGN) => `${STORAGE_PREFIX}:${source.id}:schema-${source.schemaVersion}`;

let campaign = restoreDraft();
let activeView = "perspectives";
let activeActor = Object.keys(campaign.actors)[0];
let actionFilter = "all";
let sourceError = null;

function restoreDraft() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey()));
    return stored?.schemaVersion === ACTIVE_CAMPAIGN.schemaVersion ? stored : clone(ACTIVE_CAMPAIGN);
  } catch {
    return clone(ACTIVE_CAMPAIGN);
  }
}

function persist() {
  localStorage.setItem(storageKey(campaign), JSON.stringify(campaign));
  $("#draft-status").textContent = "brouillon local";
  $("#draft-status").classList.add("is-dirty");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function setAtPath(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[key] = value;
}

function bindField(selector, path, transform = (value) => value, rerender = false) {
  const input = $(selector);
  if (!input) return;
  input.addEventListener("input", () => {
    setAtPath(campaign, path, transform(input.value)); sourceError = null; persist(); renderDiagnostics(); renderStats();
  });
  if (rerender) input.addEventListener("change", renderWorkbench);
}

function renderIdentity() {
  $("#campaign-title").value = campaign.title || "";
  $("#campaign-premise").value = campaign.premise || "";
  $("#campaign-deadline").value = campaign.deadline || "";
}

function bindIdentity() {
  bindField("#campaign-title", "title");
  bindField("#campaign-premise", "premise");
  bindField("#campaign-deadline", "deadline", (value) => Number(value), true);
}

function renderStats() {
  const summary = summarizeCampaign(campaign);
  $("#campaign-stats").innerHTML = [
    [summary.actors, "positions"], [summary.actions, "actions"], [summary.knowledge, "savoirs"], [summary.events, "seuils"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderDiagnostics() {
  const issues = sourceError ? [{ level: "error", code: "JSON_PARSE", path: "campaign", message: sourceError }] : validateCampaign(campaign);
  const errors = issues.filter((item) => item.level === "error").length;
  const warnings = issues.filter((item) => item.level === "warning").length;
  $("#validation-summary").innerHTML = `<div class="validation-count error"><strong>${errors}</strong><span>erreur${errors === 1 ? "" : "s"}</span></div><div class="validation-count warning"><strong>${warnings}</strong><span>alerte${warnings === 1 ? "" : "s"}</span></div>`;
  $("#diagnostics-list").innerHTML = issues.length ? issues.map((item) => `<article class="diagnostic" style="--level:${item.level === "error" ? "#b84e42" : "#d7a83d"}"><strong>${item.code}</strong><code>${escapeHtml(item.path)}</code><p>${escapeHtml(item.message)}</p></article>`).join("") : `<div class="all-clear"><strong>Structure exécutable.</strong><br>Références, relais et effets déclaratifs sont cohérents. L'accessibilité reste une surapproximation, pas une preuve de solvabilité.</div>`;
}

function perspectiveView() {
  if (!campaign.actors[activeActor]) activeActor = Object.keys(campaign.actors)[0];
  const actor = campaign.actors[activeActor];
  return `<div class="actor-editor-grid">
    <div class="actor-picker">${Object.entries(campaign.actors).map(([id, item]) => `<button class="actor-pick ${id === activeActor ? "is-active" : ""}" style="--color:${escapeHtml(item.color)}" data-actor="${id}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.role)}</span></button>`).join("")}</div>
    <div class="actor-form">
      <label class="editor-field">Nom<input data-actor-field="name" value="${escapeHtml(actor.name)}"></label>
      <label class="editor-field">Couleur<input data-actor-field="color" type="color" value="${escapeHtml(actor.color)}"></label>
      <label class="editor-field">Rôle<input data-actor-field="role" value="${escapeHtml(actor.role)}"></label>
      <label class="editor-field">Lieu<input data-actor-field="place" value="${escapeHtml(actor.place)}"></label>
      <label class="editor-field wide">Nom de la scène<input data-actor-field="scene" value="${escapeHtml(actor.scene)}"></label>
      <div class="editor-field wide">Savoirs présents au départ<div class="knowledge-checks">${Object.entries(campaign.knowledge).map(([id, text]) => `<label class="knowledge-check"><input type="checkbox" data-knowledge="${id}" ${actor.initialKnowledge.includes(id) ? "checked" : ""}><span><strong>${escapeHtml(id)}</strong><br>${escapeHtml(text)}</span></label>`).join("")}</div></div>
    </div>
  </div>`;
}

function timelineView() {
  const deadline = Math.max(1, campaign.deadline || 1);
  return `<div class="timeline-editor">${campaign.timeline.map((event, index) => `<div class="timeline-row">
    <label class="editor-field">Heure<input type="number" min="0" max="${deadline}" data-event="${index}" data-event-field="hour" value="${event.hour}"></label>
    <label class="editor-field">Nom<input data-event="${index}" data-event-field="label" value="${escapeHtml(event.label)}"></label>
    <label class="editor-field">Affichage<input data-event="${index}" data-event-field="when" value="${escapeHtml(event.when)}"></label>
    <label class="knowledge-check"><input type="checkbox" data-event="${index}" data-event-field="irreversible" ${event.irreversible ? "checked" : ""}> Irréversible</label>
  </div>`).join("")}</div>
  <div class="timeline-preview">${campaign.timeline.map((event) => `<div class="timeline-event" style="--at:${Math.min(100, Math.max(0, event.hour / deadline * 100))}%;--event-color:${event.irreversible ? "#b84e42" : "#487f72"}"><span>${escapeHtml(event.when)}</span><strong>${escapeHtml(event.label)}</strong></div>`).join("")}</div>`;
}

function dependencyTags(action) {
  const requires = action.requires || {};
  const tags = [
    ...(requires.knowledge || []).map((id) => `sait:${id}`),
    ...(requires.anyKnowledge || []).map((id) => `sait?:${id}`),
    ...(requires.world || []).map((id) => `monde:${id}`),
    ...(action.relays || []).map((relay) => `→ ${relay.to}:${relay.fact}`),
  ];
  return tags.length ? tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : "<span>sans prérequis</span>";
}

function actionsView() {
  const filtered = campaign.actions.filter((action) => actionFilter === "all" || action.actor === actionFilter);
  return `<div class="actions-toolbar"><button class="filter-button ${actionFilter === "all" ? "is-active" : ""}" data-filter="all">Toutes</button>${Object.entries(campaign.actors).map(([id, actor]) => `<button class="filter-button ${actionFilter === id ? "is-active" : ""}" data-filter="${id}">${escapeHtml(actor.name)}</button>`).join("")}</div>
  <div class="action-editor-list">${filtered.map((action) => {
    const index = campaign.actions.indexOf(action);
    return `<article class="action-row"><header><div><em>${escapeHtml(action.verb)} · ${escapeHtml(action.actor)}</em><strong>${escapeHtml(action.title)}</strong></div><label class="editor-field">Durée<input type="number" min="1" data-action-index="${index}" data-action-field="duration" value="${action.duration}"></label></header><label class="editor-field">Titre<input data-action-index="${index}" data-action-field="title" value="${escapeHtml(action.title)}"></label><p>${escapeHtml(action.description)}</p><div class="action-deps">${dependencyTags(action)}</div></article>`;
  }).join("")}</div>`;
}

function sourceView() {
  return `<div class="source-actions"><button id="apply-source" class="studio-button primary" type="button">Appliquer le JSON</button><button id="format-source" class="studio-button" type="button">Reformater</button><span class="source-note">Les diagnostics ne changent qu'après application.</span></div><textarea id="source-editor" class="source-editor" spellcheck="false">${escapeHtml(JSON.stringify(campaign, null, 2))}</textarea>`;
}

const viewMeta = {
  perspectives: ["Positions situées", "Qui sait quoi, et depuis où ?", perspectiveView],
  timeline: ["Temps politique", "Quels seuils ferment quelles possibilités ?", timelineView],
  actions: ["Verbes et dépendances", "Que peut-on réellement faire ?", actionsView],
  source: ["Représentation complète", "Source JSON de la campagne", sourceView],
};

function renderWorkbench() {
  const [kicker, title, renderView] = viewMeta[activeView];
  $("#view-kicker").textContent = kicker;
  $("#view-title").textContent = title;
  $("#workbench-content").innerHTML = renderView();
  bindWorkbench();
}

function changed() { sourceError = null; persist(); renderDiagnostics(); renderStats(); }

function bindWorkbench() {
  document.querySelectorAll("[data-actor]").forEach((button) => button.addEventListener("click", () => { activeActor = button.dataset.actor; renderWorkbench(); }));
  document.querySelectorAll("[data-actor-field]").forEach((input) => input.addEventListener("input", () => { campaign.actors[activeActor][input.dataset.actorField] = input.value; changed(); }));
  document.querySelectorAll("[data-knowledge]").forEach((input) => input.addEventListener("change", () => {
    const list = campaign.actors[activeActor].initialKnowledge;
    if (input.checked && !list.includes(input.dataset.knowledge)) list.push(input.dataset.knowledge);
    if (!input.checked) campaign.actors[activeActor].initialKnowledge = list.filter((id) => id !== input.dataset.knowledge);
    changed();
  }));
  document.querySelectorAll("[data-event-field]").forEach((input) => input.addEventListener("change", () => {
    const value = input.type === "checkbox" ? input.checked : input.dataset.eventField === "hour" ? Number(input.value) : input.value;
    campaign.timeline[Number(input.dataset.event)][input.dataset.eventField] = value; changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { actionFilter = button.dataset.filter; renderWorkbench(); }));
  document.querySelectorAll("[data-action-field]").forEach((input) => input.addEventListener("change", () => {
    const value = input.dataset.actionField === "duration" ? Number(input.value) : input.value;
    campaign.actions[Number(input.dataset.actionIndex)][input.dataset.actionField] = value; changed(); renderWorkbench();
  }));
  $("#apply-source")?.addEventListener("click", () => {
    try { campaign = JSON.parse($("#source-editor").value); sourceError = null; persist(); renderIdentity(); renderStats(); renderDiagnostics(); renderWorkbench(); }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
  $("#format-source")?.addEventListener("click", () => {
    try { $("#source-editor").value = JSON.stringify(JSON.parse($("#source-editor").value), null, 2); sourceError = null; }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
}

function render() {
  renderIdentity(); renderStats(); renderDiagnostics(); renderWorkbench();
  if (localStorage.getItem(storageKey(campaign))) { $("#draft-status").textContent = "brouillon local"; $("#draft-status").classList.add("is-dirty"); }
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
  activeView = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item === button));
  renderWorkbench();
}));

$("#validate-button").addEventListener("click", () => { renderDiagnostics(); $("#diagnostics-list").scrollTo({ top: 0, behavior: "smooth" }); });
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${campaign.id || "campaign"}.campaign.json`; link.click(); URL.revokeObjectURL(link.href);
});
$("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Effacer le brouillon local et revenir à la version compilée ?")) return;
  localStorage.removeItem(storageKey(campaign)); campaign = clone(ACTIVE_CAMPAIGN); localStorage.removeItem(storageKey()); sourceError = null;
  $("#draft-status").textContent = "version compilée"; $("#draft-status").classList.remove("is-dirty"); render();
});

bindIdentity();
render();
