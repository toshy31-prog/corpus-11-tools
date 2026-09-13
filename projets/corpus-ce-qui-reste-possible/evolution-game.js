import {
  TERRAIN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  advanceSimulation,
  buildStructure,
  createEvolutionState,
  getAvailableBuilds,
  getCapabilities,
  getConsequences,
  getObjective,
  getWorldForm,
  interact,
  movePlayer,
  returnToMarker,
} from "./evolution-engine.js";

const STORAGE_KEY = "corpus-evolution:world:v5";
const $ = (selector) => document.querySelector(selector);

function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.version === 5 ? stored : createEvolutionState();
  } catch {
    return createEvolutionState();
  }
}

let state = restore();
let drawerOpen = false;

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Le jeu reste jouable lorsque le navigateur refuse le stockage sur file://.
  }
}

const gridDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function getInteractionContext(capabilities) {
  const npcEntry = Object.entries(state.npcs).find(([, npc]) => gridDistance(state.player, npc) <= 1);
  if (npcEntry) {
    const [id, npc] = npcEntry;
    return { x: npc.x, y: npc.y, label: `E · Parler à ${state.met.includes(id) || capabilities.named ? npc.name : "quelqu'un"}` };
  }
  const resource = state.resources.find((item) => item.active && gridDistance(state.player, item) <= 1);
  if (resource) {
    const names = { wood: "du bois", stone: "de la pierre", fiber: "des fibres" };
    return { x: resource.x, y: resource.y, label: capabilities.named ? `E · Prendre ${names[resource.type]}` : "E · Prélever cette matière" };
  }
  const hearth = state.structures.find((item) => item.type === "hearth" && gridDistance(state.player, item) <= 1);
  if (hearth) return { x: hearth.x, y: hearth.y, label: "E · Ouvrir le dépôt" };
  const structure = state.structures.find((item) => gridDistance(state.player, item) <= 1);
  if (structure) return { x: structure.x, y: structure.y, label: "E · Examiner ce lieu" };
  return { x: null, y: null, label: "E · Observer" };
}

function entityAt(x, y, capabilities) {
  const entities = [];
  const resource = state.resources.find((item) => item.active && item.x === x && item.y === y);
  if (resource) entities.push({ kind: `resource ${resource.type}`, label: capabilities.named ? { wood: "bois", stone: "pierre", fiber: "fibres" }[resource.type] : "matière" });
  const depleted = state.resources.find((item) => !item.active && item.x === x && item.y === y);
  if (depleted) {
    const traces = { wood: "souche", stone: "éclats", fiber: "tiges coupées" };
    entities.push({ kind: `depletion ${depleted.type}`, label: capabilities.named ? traces[depleted.type] : "trace" });
  }
  for (const structure of state.structures.filter((item) => item.x === x && item.y === y)) {
    const labels = { marker: "balise", hearth: "foyer", workshop: "atelier", bridge: "pont" };
    entities.push({ kind: `structure ${structure.type}`, label: labels[structure.type] });
  }
  for (const [id, npc] of Object.entries(state.npcs)) {
    if (npc.x === x && npc.y === y) entities.push({ kind: "npc", label: state.met.includes(id) || capabilities.named ? npc.name : "personne", id, color: npc.color });
  }
  if (state.player.x === x && state.player.y === y) entities.push({ kind: "player", label: "toi" });
  return entities;
}

function renderWorld(capabilities, context) {
  const cells = [];
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const entities = entityAt(x, y, capabilities);
      const visited = state.visited.includes(`${x},${y}`) ? "visited" : "unvisited";
      const traffic = state.traffic[`${x},${y}`] || 0;
      const pathTrace = traffic >= 7 ? "road" : traffic >= 3 ? "trail" : "";
      const focusTarget = context.x === x && context.y === y ? "focus-target" : "";
      const horizontalTraffic = (state.traffic[`${x - 1},${y}`] || 0) + (state.traffic[`${x + 1},${y}`] || 0);
      const verticalTraffic = (state.traffic[`${x},${y - 1}`] || 0) + (state.traffic[`${x},${y + 1}`] || 0);
      const trailAngle = horizontalTraffic > verticalTraffic ? "90deg" : "0deg";
      const accessibleLabel = entities.map((entity) => entity.label).filter(Boolean).join(", ");
      cells.push(`<div class="tile ${TERRAIN[y][x]} ${visited} ${pathTrace} ${focusTarget}" style="--trail-angle:${trailAngle}" role="gridcell" aria-label="case ${x}, ${y}${accessibleLabel ? ` : ${accessibleLabel}` : ""}">${entities.map((entity) => `<span class="entity ${entity.kind}" ${entity.color ? `style="--npc-color:${entity.color}"` : ""}>${entity.label && (capabilities.named || entity.kind.includes("structure")) ? `<small class="entity-label">${entity.label}</small>` : ""}</span>`).join("")}</div>`);
    }
  }
  $("#world").innerHTML = cells.join("");
}

function renderInventory() {
  const labels = { wood: "bois", stone: "pierre", fiber: "fibres" };
  $("#inventory").innerHTML = Object.entries(state.inventory).map(([id, amount]) => `<div><strong>${amount}</strong><span>${labels[id]}</span></div>`).join("");
  const commonsTotal = Object.values(state.commons).reduce((sum, amount) => sum + amount, 0);
  $("#commons-note").textContent = state.structures.some((item) => item.type === "hearth")
    ? `Dépôt du foyer : ${commonsTotal} matière${commonsTotal > 1 ? "s" : ""}`
    : "";
}

function renderBuilds() {
  const focusedBuild = document.activeElement?.dataset?.build;
  const builds = getAvailableBuilds(state).filter((recipe) => recipe.visible && !(recipe.unique && state.structures.some((item) => item.type === recipe.id)));
  $("#build-list").innerHTML = builds.map((recipe, index) => {
    const cost = Object.entries(recipe.cost).map(([type, amount]) => `${amount} ${{ wood: "bois", stone: "pierre", fiber: "fibres" }[type]}`).join(" · ");
    return `<button data-build="${recipe.id}" data-key="${index + 1}" ${recipe.available ? "" : "disabled"}><strong>${recipe.label}</strong><small>${recipe.effect}</small><em>${cost}${recipe.blockedReason ? ` · ${recipe.blockedReason}` : ""}</em></button>`;
  }).join("");
  document.querySelectorAll("[data-build]").forEach((button) => button.addEventListener("click", () => {
    const before = state.structures.length;
    commit(buildStructure(state, button.dataset.build));
    if (state.structures.length > before) setDrawer(false);
  }));
  if (focusedBuild) document.querySelector(`[data-build="${focusedBuild}"]`)?.focus();
}

function renderPeople(capabilities) {
  $("#people-list").innerHTML = Object.entries(state.npcs).map(([id, npc]) => {
    const known = state.met.includes(id) || capabilities.named;
    const detail = capabilities.commons || state.met.includes(id)
      ? `${npc.intent} · énergie ${Math.round(npc.energy)}/10 · ${npc.helped ? "activité soutenue" : `cherche ${npc.need.label}`}`
      : "Sa trajectoire existe, mais tu ne l'as pas encore rencontrée.";
    return `<article class="person" style="--person-color:${npc.color}"><strong>${known ? npc.name : "Personne non rencontrée"}</strong><span>${npc.helped ? "relation active" : state.met.includes(id) ? "rencontrée" : "aucun relais"}</span><p>${detail}</p></article>`;
  }).join("");
}

function renderConsequences() {
  $("#consequence-list").innerHTML = getConsequences(state).map((item) => `<li>${item}</li>`).join("");
}

function render() {
  const capabilities = getCapabilities(state);
  const form = getWorldForm(state);
  const context = getInteractionContext(capabilities);
  document.body.className = `world-${form.id}${drawerOpen ? " drawer-open" : ""}`;
  $("#phase-index").textContent = form.symbol;
  $("#phase-name").textContent = form.name;
  $("#phase-description").textContent = form.short;
  $("#world-time").textContent = `cycle ${state.tick}`;
  $("#objective").textContent = getObjective(state);
  $("#message-title").textContent = state.lastMessage.title;
  $("#message-body").textContent = state.lastMessage.body;
  $("#founding-choice").textContent = state.foundingChoice
    ? `Premier centre conservé : ${{ marker: "balise", hearth: "foyer", workshop: "atelier" }[state.foundingChoice]}.`
    : "Aucun premier centre choisi.";
  $("#return-marker").hidden = !capabilities.named;
  $("#people-card").hidden = !capabilities.people;
  $("#interact-button").textContent = context.label;
  $("#game-drawer").setAttribute("aria-hidden", String(!drawerOpen));
  renderWorld(capabilities, context);
  renderInventory();
  renderBuilds();
  renderPeople(capabilities);
  renderConsequences();
}

function setDrawer(open) {
  drawerOpen = open;
  render();
  if (drawerOpen) $("#drawer-close").focus();
  else $("#build-toggle").focus();
}

function commit(nextState) {
  state = nextState;
  save();
  render();
}

document.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => {
  const [dx, dy] = button.dataset.move.split(",").map(Number);
  commit(movePlayer(state, dx, dy));
}));

$("#interact-button").addEventListener("click", () => commit(interact(state)));
$("#return-marker").addEventListener("click", () => commit(returnToMarker(state)));
$("#build-toggle").addEventListener("click", () => setDrawer(true));
$("#drawer-close").addEventListener("click", () => setDrawer(false));
$("#drawer-scrim").addEventListener("click", () => setDrawer(false));

window.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  const moves = {
    ArrowLeft: [-1, 0], a: [-1, 0], q: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], z: [0, -1],
    ArrowDown: [0, 1], s: [0, 1],
  };
  const move = moves[event.key];
  if (event.key === "Escape" && drawerOpen) {
    event.preventDefault();
    setDrawer(false);
    return;
  }
  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    setDrawer(!drawerOpen);
    return;
  }
  if (move) {
    event.preventDefault();
    commit(movePlayer(state, ...move));
  } else if (["e", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    commit(interact(state));
  } else if (drawerOpen && ["1", "2", "3", "4"].includes(event.key)) {
    const recipes = getAvailableBuilds(state).filter((recipe) => recipe.visible && !(recipe.unique && state.structures.some((item) => item.type === recipe.id)));
    const recipe = recipes[Number(event.key) - 1];
    if (recipe) {
      event.preventDefault();
      commit(buildStructure(state, recipe.id));
    }
  }
});

$("#restart-button").addEventListener("click", () => {
  if (!window.confirm("Recommencer ce monde et effacer son état local ?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = createEvolutionState();
  render();
});

setInterval(() => {
  state = advanceSimulation(state);
  save();
  render();
}, 1200);

render();
