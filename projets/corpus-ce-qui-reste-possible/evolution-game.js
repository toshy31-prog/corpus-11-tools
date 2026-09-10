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

const STORAGE_KEY = "corpus-evolution:world:v3";
const $ = (selector) => document.querySelector(selector);

function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.version === 3 ? stored : createEvolutionState();
  } catch {
    return createEvolutionState();
  }
}

let state = restore();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function entityAt(x, y, capabilities) {
  const entities = [];
  const resource = state.resources.find((item) => item.active && item.x === x && item.y === y);
  if (resource) entities.push({ kind: `resource ${resource.type}`, label: capabilities.named ? { wood: "bois", stone: "pierre", fiber: "fibres" }[resource.type] : "matière" });
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

function renderWorld(capabilities) {
  const cells = [];
  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let x = 0; x < WORLD_WIDTH; x += 1) {
      const entities = entityAt(x, y, capabilities);
      const visited = state.visited.includes(`${x},${y}`) ? "visited" : "unvisited";
      const accessibleLabel = entities.map((entity) => entity.label).filter(Boolean).join(", ");
      cells.push(`<div class="tile ${TERRAIN[y][x]} ${visited}" role="gridcell" aria-label="case ${x}, ${y}${accessibleLabel ? ` : ${accessibleLabel}` : ""}">${entities.map((entity) => `<span class="entity ${entity.kind}" ${entity.color ? `style="--npc-color:${entity.color}"` : ""}>${entity.label && (capabilities.named || entity.kind.includes("structure")) ? `<small class="entity-label">${entity.label}</small>` : ""}</span>`).join("")}</div>`);
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
    return `<button data-build="${recipe.id}" ${recipe.available ? "" : "disabled"}><strong>${index + 1} · ${recipe.label}</strong><small>${recipe.effect}</small><em>${cost}${recipe.blockedReason ? ` · ${recipe.blockedReason}` : ""}</em></button>`;
  }).join("");
  document.querySelectorAll("[data-build]").forEach((button) => button.addEventListener("click", () => commit(buildStructure(state, button.dataset.build))));
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
  document.body.className = `world-${form.id}`;
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
  renderWorld(capabilities);
  renderInventory();
  renderBuilds();
  renderPeople(capabilities);
  renderConsequences();
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

window.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  const moves = {
    ArrowLeft: [-1, 0], a: [-1, 0], q: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], z: [0, -1],
    ArrowDown: [0, 1], s: [0, 1],
  };
  const move = moves[event.key];
  if (move) {
    event.preventDefault();
    commit(movePlayer(state, ...move));
  } else if (["e", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    commit(interact(state));
  } else if (["1", "2", "3", "4"].includes(event.key)) {
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
