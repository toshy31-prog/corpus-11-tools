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
let lastIssues = [];
let validationTimer = null;
let historyTimer = null;
let currentSnapshot = JSON.stringify(campaign);
let pendingBefore = null;
const undoStack = [];
const redoStack = [];

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

function uniqueId(prefix, existing) {
  let index = 1;
  let candidate = `${prefix}-${index}`;
  while (existing.includes(candidate)) candidate = `${prefix}-${++index}`;
  return candidate;
}

function compactJson(value, fallback) {
  return escapeHtml(JSON.stringify(value ?? fallback));
}

function updateHistoryButtons() {
  $("#undo-button").disabled = undoStack.length === 0 && pendingBefore === null;
  $("#redo-button").disabled = redoStack.length === 0;
}

function flushHistory() {
  clearTimeout(historyTimer);
  if (pendingBefore !== null && pendingBefore !== currentSnapshot) undoStack.push(pendingBefore);
  pendingBefore = null;
  updateHistoryButtons();
}

function recordHistory() {
  const nextSnapshot = JSON.stringify(campaign);
  if (nextSnapshot === currentSnapshot) return;
  if (pendingBefore === null) pendingBefore = currentSnapshot;
  currentSnapshot = nextSnapshot;
  redoStack.length = 0;
  clearTimeout(historyTimer);
  historyTimer = setTimeout(flushHistory, 450);
  updateHistoryButtons();
}

function restoreSnapshot(snapshot) {
  campaign = JSON.parse(snapshot);
  currentSnapshot = snapshot;
  sourceError = null;
  persist(); renderIdentity(); renderDiagnostics(); renderStats(); renderWorkbench(); updateHistoryButtons();
}

function countActorReferences(value, actorId) {
  if (!value || typeof value !== "object") return 0;
  let count = 0;
  for (const [key, child] of Object.entries(value)) {
    if (["actor", "from", "to", "holder"].includes(key) && child === actorId) count += 1;
    else count += countActorReferences(child, actorId);
  }
  return count;
}

function bindField(selector, path, transform = (value) => value, rerender = false) {
  const input = $(selector);
  if (!input) return;
  input.addEventListener("input", () => {
    setAtPath(campaign, path, transform(input.value)); sourceError = null; changed();
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
  const summary = summarizeCampaign(campaign, lastIssues);
  $("#campaign-stats").innerHTML = [
    [summary.actors, "positions"], [summary.actions, "actions"], [summary.knowledge, "savoirs"], [summary.events, "seuils"],
  ].map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderDiagnostics() {
  const issues = sourceError ? [{ level: "error", code: "JSON_PARSE", path: "campaign", message: sourceError }] : validateCampaign(campaign);
  lastIssues = issues;
  const errors = issues.filter((item) => item.level === "error").length;
  const warnings = issues.filter((item) => item.level === "warning").length;
  $("#validation-summary").innerHTML = `<div class="validation-count error"><strong>${errors}</strong><span>erreur${errors === 1 ? "" : "s"}</span></div><div class="validation-count warning"><strong>${warnings}</strong><span>alerte${warnings === 1 ? "" : "s"}</span></div>`;
  $("#diagnostics-list").innerHTML = issues.length ? issues.map((item) => `<article class="diagnostic" style="--level:${item.level === "error" ? "#b84e42" : "#d7a83d"}"><strong>${item.code}</strong><code>${escapeHtml(item.path)}</code><p>${escapeHtml(item.message)}</p></article>`).join("") : `<div class="all-clear"><strong>Structure et parcours cohérents.</strong><br>Références, relais et effets sont valides ; chaque action apparaît dans au moins une branche jouable avant l'échéance.</div>`;
}

function perspectiveView() {
  if (!campaign.actors[activeActor]) activeActor = Object.keys(campaign.actors)[0];
  const actor = campaign.actors[activeActor];
  return `<div class="actor-editor-grid">
    <div class="actor-picker">${Object.entries(campaign.actors).map(([id, item]) => `<button class="actor-pick ${id === activeActor ? "is-active" : ""}" style="--color:${escapeHtml(item.color)}" data-actor="${escapeHtml(id)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.role)}</span></button>`).join("")}<button class="add-card" data-add-actor type="button">+ Nouvelle position</button></div>
    <div class="actor-form">
      <label class="editor-field">Nom<input data-actor-field="name" value="${escapeHtml(actor.name)}"></label>
      <label class="editor-field">Couleur<input data-actor-field="color" type="color" value="${escapeHtml(actor.color)}"></label>
      <label class="editor-field">Rôle<input data-actor-field="role" value="${escapeHtml(actor.role)}"></label>
      <label class="editor-field">Lieu<input data-actor-field="place" value="${escapeHtml(actor.place)}"></label>
      <label class="editor-field wide">Nom de la scène<input data-actor-field="scene" value="${escapeHtml(actor.scene)}"></label>
      <div class="editor-field wide">Savoirs présents au départ<div class="knowledge-checks">${Object.entries(campaign.knowledge).map(([id, text]) => `<label class="knowledge-check"><input type="checkbox" data-knowledge="${id}" ${actor.initialKnowledge.includes(id) ? "checked" : ""}><span><strong>${escapeHtml(id)}</strong><br>${escapeHtml(text)}</span></label>`).join("")}</div></div>
      <button class="studio-text danger wide" data-delete-actor="${activeActor}" type="button">Supprimer cette position</button>
    </div>
  </div>`;
}

function timelineView() {
  const deadline = Math.max(1, campaign.deadline || 1);
  return `<div class="view-actions"><button class="studio-button" data-add-event type="button">+ Ajouter un seuil</button></div><div class="timeline-editor">${campaign.timeline.map((event, index) => `<div class="timeline-row">
    <label class="editor-field">Heure<input type="number" min="0" max="${deadline}" data-event="${index}" data-event-field="hour" value="${event.hour}"></label>
    <label class="editor-field">Nom<input data-event="${index}" data-event-field="label" value="${escapeHtml(event.label)}"></label>
    <label class="editor-field">Affichage<input data-event="${index}" data-event-field="when" value="${escapeHtml(event.when)}"></label>
    <div class="row-actions"><label class="knowledge-check"><input type="checkbox" data-event="${index}" data-event-field="irreversible" ${event.irreversible ? "checked" : ""}> Irréversible</label><button class="mini-button" data-duplicate-event="${index}" type="button">Dupliquer</button><button class="mini-button danger" data-delete-event="${index}" type="button">Supprimer</button></div>
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
  return `<div class="actions-toolbar"><button class="filter-button ${actionFilter === "all" ? "is-active" : ""}" data-filter="all">Toutes</button>${Object.entries(campaign.actors).map(([id, actor]) => `<button class="filter-button ${actionFilter === id ? "is-active" : ""}" data-filter="${escapeHtml(id)}">${escapeHtml(actor.name)}</button>`).join("")}<button class="studio-button add-action" data-add-action type="button">+ Nouvelle action</button></div>
  <div class="action-editor-list">${filtered.map((action) => {
    const index = campaign.actions.indexOf(action);
    return `<article class="action-row"><header><div><em>${escapeHtml(action.id)}</em><strong>${escapeHtml(action.title)}</strong></div><label class="editor-field">Durée<input type="number" min="1" data-action-index="${index}" data-action-field="duration" value="${action.duration}"></label></header>
      <div class="action-fields"><label class="editor-field">Position<select data-action-index="${index}" data-action-field="actor">${Object.entries(campaign.actors).map(([id, actor]) => `<option value="${id}" ${id === action.actor ? "selected" : ""}>${escapeHtml(actor.name)}</option>`).join("")}</select></label><label class="editor-field">Verbe<input data-action-index="${index}" data-action-field="verb" value="${escapeHtml(action.verb)}"></label></div>
      <label class="editor-field">Titre<input data-action-index="${index}" data-action-field="title" value="${escapeHtml(action.title)}"></label>
      <label class="editor-field">Description<textarea rows="2" data-action-index="${index}" data-action-field="description">${escapeHtml(action.description)}</textarea></label>
      <label class="editor-field">Tension<textarea rows="2" data-action-index="${index}" data-action-field="tension">${escapeHtml(action.tension || "")}</textarea></label>
      <div class="action-deps">${dependencyTags(action)}</div>
      <details class="causal-editor"><summary>Conditions et effets</summary>
        <label class="editor-field">Préconditions JSON<textarea rows="3" data-action-index="${index}" data-action-json="requires">${compactJson(action.requires, {})}</textarea></label>
        <label class="editor-field">Effets JSON<textarea rows="3" data-action-index="${index}" data-action-json="grants">${compactJson(action.grants, {})}</textarea></label>
        <label class="editor-field">Résultat narratif JSON<textarea rows="3" data-action-index="${index}" data-action-json="result">${compactJson(action.result, {})}</textarea></label>
        <label class="editor-field">Relais JSON<textarea rows="3" data-action-index="${index}" data-action-json="relays">${compactJson(action.relays, [])}</textarea></label>
        <label class="editor-field">Effets différés JSON<textarea rows="3" data-action-index="${index}" data-action-json="scheduled">${compactJson(action.scheduled, [])}</textarea></label>
      </details>
      <footer class="row-actions"><button class="mini-button" data-duplicate-action="${index}" type="button">Dupliquer</button><button class="mini-button danger" data-delete-action="${index}" type="button">Supprimer</button></footer>
    </article>`;
  }).join("")}</div>`;
}

function outcomeView() {
  const outcome = campaign.outcome || { variants: [], dimensions: [] };
  const opening = campaign.opening || { lastBeat: {}, log: {} };
  return `<section class="outcome-editor">
    <header class="outcome-section-heading"><div><p class="studio-overline">Entrée en jeu</p><h3>Depuis quelle situation commence-t-on ?</h3></div></header>
    <div class="opening-editor">${Object.entries({ lastBeat: "Scène d'ouverture", log: "Première trace chronologique" }).map(([key, label]) => `<article class="outcome-rule opening-rule">
      <strong>${label}</strong>
      <label class="editor-field">Position<select data-opening="${key}" data-opening-field="actor">${Object.entries(campaign.actors).map(([id, actor]) => `<option value="${id}" ${id === opening[key]?.actor ? "selected" : ""}>${escapeHtml(actor.name)}</option>`).join("")}</select></label>
      <label class="editor-field">Titre<input data-opening="${key}" data-opening-field="title" value="${escapeHtml(opening[key]?.title)}"></label>
      <label class="editor-field">Texte<textarea rows="2" data-opening="${key}" data-opening-field="body">${escapeHtml(opening[key]?.body)}</textarea></label>
      ${key === "lastBeat" ? `<label class="editor-field">Citation<textarea rows="2" data-opening="${key}" data-opening-field="quote">${escapeHtml(opening[key]?.quote)}</textarea></label>` : ""}
    </article>`).join("")}</div>
    <header class="outcome-section-heading"><div><p class="studio-overline">Ouverture du bilan</p><h3>Quel monde atteint l'échéance ?</h3></div><button class="studio-button" data-add-outcome-summary type="button">+ Variante</button></header>
    <div class="outcome-rule-list">${(outcome.variants || []).map((variant, index) => `<article class="outcome-rule">
      <label class="editor-field">Condition JSON<textarea rows="2" data-summary-variant="${index}" data-summary-json="when">${compactJson(variant.when, {})}</textarea></label>
      <label class="editor-field">Titre<input data-summary-variant="${index}" data-summary-field="heading" value="${escapeHtml(variant.heading)}"></label>
      <label class="editor-field">Résumé<textarea rows="2" data-summary-variant="${index}" data-summary-field="summary">${escapeHtml(variant.summary)}</textarea></label>
      <button class="mini-button danger" data-delete-outcome-summary="${index}" type="button">Supprimer</button>
    </article>`).join("")}</div>
    <header class="outcome-section-heading"><div><p class="studio-overline">Vecteur final</p><h3>Ce qui est préservé, perdu ou encore contestable</h3></div><button class="studio-button" data-add-dimension type="button">+ Dimension</button></header>
    <div class="dimension-list">${(outcome.dimensions || []).map((dimension, dimensionIndex) => `<article class="dimension-card">
      <header><label class="editor-field">Dimension<input data-dimension="${dimensionIndex}" data-dimension-field="label" value="${escapeHtml(dimension.label)}"></label><button class="mini-button" data-add-dimension-variant="${dimensionIndex}" type="button">+ Variante</button><button class="mini-button danger" data-delete-dimension="${dimensionIndex}" type="button">Supprimer</button></header>
      <div class="dimension-variants">${(dimension.variants || []).map((variant, variantIndex) => `<div class="dimension-variant">
        <label class="editor-field">Condition JSON<textarea rows="2" data-dimension="${dimensionIndex}" data-dimension-variant="${variantIndex}" data-dimension-json="when">${compactJson(variant.when, {})}</textarea></label>
        <label class="editor-field">Etat<input data-dimension="${dimensionIndex}" data-dimension-variant="${variantIndex}" data-dimension-variant-field="state" value="${escapeHtml(variant.state)}"></label>
        <label class="editor-field wide">Détail<textarea rows="2" data-dimension="${dimensionIndex}" data-dimension-variant="${variantIndex}" data-dimension-variant-field="detail">${escapeHtml(variant.detail)}</textarea></label>
        <button class="mini-button danger" data-delete-dimension-variant="${dimensionIndex}:${variantIndex}" type="button">Supprimer la variante</button>
      </div>`).join("")}</div>
    </article>`).join("")}</div>
  </section>`;
}

function sourceView() {
  return `<div class="source-actions"><button id="apply-source" class="studio-button primary" type="button">Appliquer le JSON</button><button id="format-source" class="studio-button" type="button">Reformater</button><span class="source-note">Les diagnostics ne changent qu'après application.</span></div><textarea id="source-editor" class="source-editor" spellcheck="false">${escapeHtml(JSON.stringify(campaign, null, 2))}</textarea>`;
}

const viewMeta = {
  perspectives: ["Positions situées", "Qui sait quoi, et depuis où ?", perspectiveView],
  timeline: ["Temps politique", "Quels seuils ferment quelles possibilités ?", timelineView],
  actions: ["Verbes et dépendances", "Que peut-on réellement faire ?", actionsView],
  outcome: ["Bilan sans total", "Quelles conséquences restent incompatibles ?", outcomeView],
  source: ["Représentation complète", "Source JSON de la campagne", sourceView],
};

function renderWorkbench() {
  const [kicker, title, renderView] = viewMeta[activeView];
  $("#view-kicker").textContent = kicker;
  $("#view-title").textContent = title;
  $("#workbench-content").innerHTML = renderView();
  bindWorkbench();
}

function changed() {
  sourceError = null;
  recordHistory();
  persist();
  clearTimeout(validationTimer);
  validationTimer = setTimeout(() => { renderDiagnostics(); renderStats(); }, 140);
}

function bindWorkbench() {
  document.querySelectorAll("[data-actor]").forEach((button) => button.addEventListener("click", () => { activeActor = button.dataset.actor; renderWorkbench(); }));
  $("[data-add-actor]")?.addEventListener("click", () => {
    const id = uniqueId("position", Object.keys(campaign.actors));
    campaign.actors[id] = { name: "Nouvelle position", role: "rôle à préciser", place: "lieu à préciser", color: "#668b72", scene: "Scène générique", initialKnowledge: [] };
    activeActor = id; changed(); renderWorkbench();
  });
  $("[data-delete-actor]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.deleteActor;
    const usedBy = countActorReferences({ actions: campaign.actions, timeline: campaign.timeline }, id);
    if (Object.keys(campaign.actors).length <= 2) return window.alert("Une campagne Corpus conserve au moins deux positions.");
    if (usedBy) return window.alert(`${usedBy} référence(s) utilisent encore cette position. Réattribuez-les avant de la supprimer.`);
    if (!window.confirm(`Supprimer la position « ${campaign.actors[id].name} » ?`)) return;
    delete campaign.actors[id];
    if (campaign.initialPerspective === id) campaign.initialPerspective = Object.keys(campaign.actors)[0];
    activeActor = Object.keys(campaign.actors)[0]; changed(); renderWorkbench();
  });
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
  $("[data-add-event]")?.addEventListener("click", () => {
    const id = uniqueId("seuil", campaign.timeline.map((event) => event.id));
    const hour = Math.min(campaign.deadline, Math.max(0, Math.round(campaign.deadline / 2)));
    campaign.timeline.push({ id, hour, label: "Nouveau seuil", when: `${hour} h après le début`, irreversible: false });
    campaign.timeline.sort((a, b) => a.hour - b.hour); changed(); renderWorkbench();
  });
  document.querySelectorAll("[data-duplicate-event]").forEach((button) => button.addEventListener("click", () => {
    const source = campaign.timeline[Number(button.dataset.duplicateEvent)];
    const copy = clone(source);
    copy.id = uniqueId(`${source.id}-copie`, campaign.timeline.map((event) => event.id));
    copy.label = `${source.label} · copie`;
    campaign.timeline.push(copy); campaign.timeline.sort((a, b) => a.hour - b.hour); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-delete-event]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.deleteEvent);
    const event = campaign.timeline[index];
    if (!window.confirm(`Supprimer le seuil « ${event.label} » ?`)) return;
    campaign.timeline.splice(index, 1); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { actionFilter = button.dataset.filter; renderWorkbench(); }));
  document.querySelectorAll("[data-action-field]").forEach((input) => input.addEventListener("change", () => {
    const value = input.dataset.actionField === "duration" ? Number(input.value) : input.value;
    campaign.actions[Number(input.dataset.actionIndex)][input.dataset.actionField] = value; changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-action-json]").forEach((input) => input.addEventListener("change", () => {
    try {
      const value = JSON.parse(input.value);
      campaign.actions[Number(input.dataset.actionIndex)][input.dataset.actionJson] = value;
      input.removeAttribute("aria-invalid"); changed(); renderWorkbench();
    } catch (error) {
      input.setAttribute("aria-invalid", "true");
      sourceError = `${input.dataset.actionJson} : ${error.message}`; renderDiagnostics(); renderStats();
    }
  }));
  $("[data-add-action]")?.addEventListener("click", () => {
    const actor = actionFilter !== "all" && campaign.actors[actionFilter] ? actionFilter : activeActor;
    const id = uniqueId(`${actor}-action`, campaign.actions.map((action) => action.id));
    campaign.actions.push({ id, actor, verb: "Agir", title: "Nouvelle action", duration: 1, description: "Décrire ce que cette position peut effectivement faire.", tension: "Décrire le coût, le délai ou la dépendance déplacée.", requires: {}, grants: {}, result: { title: "Ce qui vient de changer", body: "Décrire l'effet observable sans le confondre avec l'intention.", tone: "neutral" } });
    actionFilter = actor; changed(); renderWorkbench();
  });
  document.querySelectorAll("[data-duplicate-action]").forEach((button) => button.addEventListener("click", () => {
    const source = campaign.actions[Number(button.dataset.duplicateAction)];
    const copy = clone(source);
    copy.id = uniqueId(`${source.id}-copie`, campaign.actions.map((action) => action.id));
    copy.title = `${source.title} · copie`;
    campaign.actions.push(copy); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-delete-action]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.deleteAction);
    const action = campaign.actions[index];
    if (!window.confirm(`Supprimer l'action « ${action.title} » ?`)) return;
    campaign.actions.splice(index, 1); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-opening-field]").forEach((input) => input.addEventListener("change", () => {
    campaign.opening[input.dataset.opening][input.dataset.openingField] = input.value; changed();
  }));
  document.querySelectorAll("[data-summary-field]").forEach((input) => input.addEventListener("input", () => {
    campaign.outcome.variants[Number(input.dataset.summaryVariant)][input.dataset.summaryField] = input.value; changed();
  }));
  document.querySelectorAll("[data-summary-json]").forEach((input) => input.addEventListener("change", () => {
    try {
      const value = JSON.parse(input.value);
      campaign.outcome.variants[Number(input.dataset.summaryVariant)][input.dataset.summaryJson] = Object.keys(value).length ? value : undefined;
      input.removeAttribute("aria-invalid"); changed(); renderWorkbench();
    } catch (error) {
      input.setAttribute("aria-invalid", "true"); sourceError = `outcome.when : ${error.message}`; renderDiagnostics(); renderStats();
    }
  }));
  $("[data-add-outcome-summary]")?.addEventListener("click", () => {
    const variants = campaign.outcome.variants;
    variants.splice(Math.max(0, variants.length - 1), 0, { when: { world: [campaign.worldFlags[0]] }, heading: "Nouvelle issue", summary: "Décrire ce qui distingue cette issue." });
    changed(); renderWorkbench();
  });
  document.querySelectorAll("[data-delete-outcome-summary]").forEach((button) => button.addEventListener("click", () => {
    const variants = campaign.outcome.variants;
    if (variants.length <= 1) return window.alert("Le bilan exige au moins une issue sans condition.");
    variants.splice(Number(button.dataset.deleteOutcomeSummary), 1); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-dimension-field]").forEach((input) => input.addEventListener("input", () => {
    campaign.outcome.dimensions[Number(input.dataset.dimension)][input.dataset.dimensionField] = input.value; changed();
  }));
  document.querySelectorAll("[data-dimension-variant-field]").forEach((input) => input.addEventListener("input", () => {
    const dimension = campaign.outcome.dimensions[Number(input.dataset.dimension)];
    dimension.variants[Number(input.dataset.dimensionVariant)][input.dataset.dimensionVariantField] = input.value; changed();
  }));
  document.querySelectorAll("[data-dimension-json]").forEach((input) => input.addEventListener("change", () => {
    try {
      const value = JSON.parse(input.value);
      const dimension = campaign.outcome.dimensions[Number(input.dataset.dimension)];
      dimension.variants[Number(input.dataset.dimensionVariant)][input.dataset.dimensionJson] = Object.keys(value).length ? value : undefined;
      input.removeAttribute("aria-invalid"); changed(); renderWorkbench();
    } catch (error) {
      input.setAttribute("aria-invalid", "true"); sourceError = `outcome.dimension.when : ${error.message}`; renderDiagnostics(); renderStats();
    }
  }));
  $("[data-add-dimension]")?.addEventListener("click", () => {
    campaign.outcome.dimensions.push({ label: "Nouvelle dimension", variants: [{ state: "à qualifier", detail: "Décrire ce que cet état permet ou empêche encore." }] });
    changed(); renderWorkbench();
  });
  document.querySelectorAll("[data-add-dimension-variant]").forEach((button) => button.addEventListener("click", () => {
    const variants = campaign.outcome.dimensions[Number(button.dataset.addDimensionVariant)].variants;
    variants.splice(Math.max(0, variants.length - 1), 0, { when: { world: [campaign.worldFlags[0]] }, state: "à qualifier", detail: "Décrire cette variante." });
    changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-delete-dimension]").forEach((button) => button.addEventListener("click", () => {
    if (campaign.outcome.dimensions.length <= 2) return window.alert("Un bilan Corpus conserve au moins deux dimensions non agrégées.");
    campaign.outcome.dimensions.splice(Number(button.dataset.deleteDimension), 1); changed(); renderWorkbench();
  }));
  document.querySelectorAll("[data-delete-dimension-variant]").forEach((button) => button.addEventListener("click", () => {
    const [dimensionIndex, variantIndex] = button.dataset.deleteDimensionVariant.split(":").map(Number);
    const variants = campaign.outcome.dimensions[dimensionIndex].variants;
    if (variants.length <= 1) return window.alert("Cette dimension exige au moins une variante sans condition.");
    variants.splice(variantIndex, 1); changed(); renderWorkbench();
  }));
  $("#apply-source")?.addEventListener("click", () => {
    try { campaign = JSON.parse($("#source-editor").value); sourceError = null; changed(); renderIdentity(); renderDiagnostics(); renderStats(); renderWorkbench(); }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
  $("#format-source")?.addEventListener("click", () => {
    try { $("#source-editor").value = JSON.stringify(JSON.parse($("#source-editor").value), null, 2); sourceError = null; }
    catch (error) { sourceError = error.message; renderDiagnostics(); }
  });
}

function render() {
  renderIdentity(); renderDiagnostics(); renderStats(); renderWorkbench();
  if (localStorage.getItem(storageKey(campaign))) { $("#draft-status").textContent = "brouillon local"; $("#draft-status").classList.add("is-dirty"); }
  updateHistoryButtons();
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
  activeView = button.dataset.view;
  document.querySelectorAll("[data-view]").forEach((item) => {
    item.classList.toggle("is-active", item === button);
    item.setAttribute("aria-selected", String(item === button));
  });
  renderWorkbench();
}));

$("#validate-button").addEventListener("click", () => {
  clearTimeout(validationTimer); renderDiagnostics(); renderStats();
  $("#diagnostics-list").scrollTo({ top: 0, behavior: "smooth" });
});
$("#undo-button").addEventListener("click", () => {
  flushHistory();
  const snapshot = undoStack.pop();
  if (!snapshot) return updateHistoryButtons();
  redoStack.push(currentSnapshot); restoreSnapshot(snapshot);
});
$("#redo-button").addEventListener("click", () => {
  flushHistory();
  const snapshot = redoStack.pop();
  if (!snapshot) return updateHistoryButtons();
  undoStack.push(currentSnapshot); restoreSnapshot(snapshot);
});
$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(campaign, null, 2)], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${campaign.id || "campaign"}.campaign.json`; link.click(); URL.revokeObjectURL(link.href);
});
$("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Effacer le brouillon local et revenir à la version compilée ?")) return;
  localStorage.removeItem(storageKey(campaign)); campaign = clone(ACTIVE_CAMPAIGN); localStorage.removeItem(storageKey()); sourceError = null;
  currentSnapshot = JSON.stringify(campaign); pendingBefore = null; undoStack.length = 0; redoStack.length = 0;
  $("#draft-status").textContent = "version compilée"; $("#draft-status").classList.remove("is-dirty"); render();
});

bindIdentity();
render();
