export const WORLD_WIDTH = 18;
export const WORLD_HEIGHT = 12;

export const TERRAIN = Object.freeze(Array.from({ length: WORLD_HEIGHT }, (_, y) =>
  Array.from({ length: WORLD_WIDTH }, (_, x) => {
    if (x === 0 || y === 0 || x === WORLD_WIDTH - 1 || y === WORLD_HEIGHT - 1) return "cliff";
    if (x >= 2 && x <= 4 && y >= 2 && y <= 3) return "water";
    if (x >= 15 && y >= 7 && y <= 9) return "water";
    if (y === 5 || (x === 9 && y >= 2 && y <= 9)) return "path";
    return "grass";
  })
));

const RESOURCE_SEED = [
  ["wood-1", "wood", 5, 5], ["wood-2", "wood", 6, 7], ["wood-3", "wood", 11, 8], ["wood-4", "wood", 14, 2],
  ["stone-1", "stone", 8, 5], ["stone-2", "stone", 12, 6], ["stone-3", "stone", 3, 9],
  ["fiber-1", "fiber", 6, 2], ["fiber-2", "fiber", 4, 8], ["fiber-3", "fiber", 13, 8],
];

const NPC_SEED = {
  ina: {
    name: "Ina", color: "#e17b5f", route: [[13, 5], [14, 5], [14, 6], [13, 6]],
    intent: "porte de l'eau vers les maisons", need: { type: "fiber", amount: 1, label: "une fibre pour réparer ses seaux" },
  },
  mara: {
    name: "Mara", color: "#79a989", route: [[9, 2], [10, 2], [10, 3], [9, 3]],
    intent: "compare les marques du terrain", need: { type: "stone", amount: 1, label: "une pierre pour stabiliser un repère" },
  },
  nilo: {
    name: "Nilo", color: "#e0b23f", route: [[12, 8], [13, 8], [14, 8], [14, 9]],
    intent: "répare une charrette", need: { type: "wood", amount: 1, label: "un bois pour remplacer un essieu" },
  },
};

const RECIPES = Object.freeze({
  marker: {
    label: "Planter une balise", cost: { wood: 1, stone: 1 },
    effect: "Nomme le monde, attire Mara et permet de revenir ici.", unique: true,
  },
  hearth: {
    label: "Établir un foyer", cost: { wood: 1, fiber: 1 },
    effect: "Attire les habitants, restaure leur énergie et ouvre un dépôt commun.", unique: true,
  },
  workshop: {
    label: "Monter un atelier", cost: { wood: 2, stone: 1 },
    effect: "Double les récoltes, ralentit leur retour et rend les ponts constructibles.", unique: true,
  },
  bridge: {
    label: "Poser un pont", cost: { wood: 2, stone: 1 },
    effect: "Transforme une case d'eau voisine en passage.", requires: "workshop", water: true,
  },
});

const clone = (value) => structuredClone(value);
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const terrainAt = (x, y) => TERRAIN[y]?.[x] || "cliff";
const hasStructure = (state, type) => state.structures.some((item) => item.type === type);

function log(state, title, body, tone = "neutral") {
  state.journal.unshift({ id: `${state.tick}-${state.journal.length}`, tick: state.tick, title, body, tone });
  state.lastMessage = { title, body, tone };
}

function hasCost(inventory, cost) {
  return Object.entries(cost).every(([key, amount]) => inventory[key] >= amount);
}

function payCost(inventory, cost) {
  for (const [key, amount] of Object.entries(cost)) inventory[key] -= amount;
}

function occupied(state, x, y) {
  return state.structures.some((item) => item.x === x && item.y === y && item.type !== "bridge");
}

function getAdjacentWater(state) {
  const byFacing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const preferred = byFacing[state.player.facing] || [1, 0];
  const directions = [preferred, [0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const [dx, dy] of directions) {
    const x = state.player.x + dx;
    const y = state.player.y + dy;
    if (terrainAt(x, y) === "water" && !state.structures.some((item) => item.x === x && item.y === y)) return { x, y };
  }
  return null;
}

function getLandBuildLocation(state) {
  if (!occupied(state, state.player.x, state.player.y)) return { x: state.player.x, y: state.player.y };
  const byFacing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const preferred = byFacing[state.player.facing] || [1, 0];
  const directions = [preferred, [0, -1], [1, 0], [0, 1], [-1, 0]];
  for (const [dx, dy] of directions) {
    const x = state.player.x + dx;
    const y = state.player.y + dy;
    if (!["cliff", "water"].includes(terrainAt(x, y)) && !occupied(state, x, y)) return { x, y };
  }
  return null;
}

function getNpcRoute(state, id) {
  const route = [...NPC_SEED[id].route];
  const linkedType = { ina: "hearth", mara: "marker", nilo: "workshop" }[id];
  const linked = state.structures.find((item) => item.type === linkedType);
  if (linked) route.push([linked.x, linked.y]);
  return route;
}

function getRegrowDelay(state, resource) {
  return 18 + (hasStructure(state, "workshop") ? 8 : 0) + Math.floor(resource.pressure * 2);
}

export function createEvolutionState() {
  return {
    version: 5,
    tick: 0,
    player: { x: 4, y: 5, facing: "right" },
    inventory: { wood: 0, stone: 0, fiber: 0 },
    commons: { wood: 0, stone: 0, fiber: 0 },
    resources: RESOURCE_SEED.map(([id, type, x, y]) => ({ id, type, x, y, active: true, depletedAt: null, pressure: 0 })),
    npcs: Object.fromEntries(Object.entries(NPC_SEED).map(([id, npc]) => [id, {
      ...clone(npc), energy: 8, relation: 0, helped: false, routeIndex: 0, x: npc.route[0][0], y: npc.route[0][1],
    }])),
    met: [],
    structures: [],
    foundingChoice: null,
    practices: { steps: 0, gathered: 0, conversations: 0, built: 0 },
    visited: ["4,5"],
    traffic: { "4,5": 1 },
    journal: [],
    lastMessage: {
      title: "Le monde n'a pas encore de centre",
      body: "Pars, prélève, rencontre ou construis. La première institution que tu poses changera réellement la suite.",
      tone: "neutral",
    },
  };
}

export function getCapabilities(state) {
  return {
    named: hasStructure(state, "marker"),
    commons: hasStructure(state, "hearth"),
    tools: hasStructure(state, "workshop"),
    time: state.structures.length > 0,
    people: state.met.length > 0 || hasStructure(state, "hearth"),
  };
}

export function getWorldForm(state) {
  const types = ["marker", "hearth", "workshop"].filter((type) => hasStructure(state, type));
  if (!types.length) return { id: "unmade", symbol: "◇", name: "Monde sans centre", short: "Tout est déjà là, mais aucun usage n'organise encore l'ensemble." };
  if (types.length > 1) return { id: "composed", symbol: String(types.length), name: "Monde composé", short: "Plusieurs logiques coexistent. Leurs effets s'additionnent sans se confondre." };
  return {
    marker: { id: "marker", symbol: "M", name: "Monde balisé", short: "Les noms, le retour et la mémoire spatiale organisent désormais le lieu." },
    hearth: { id: "hearth", symbol: "F", name: "Monde habité", short: "Les rencontres, les besoins et la mise en commun organisent désormais le lieu." },
    workshop: { id: "workshop", symbol: "A", name: "Monde-outil", short: "La production, la pression sur les matières et les ouvrages organisent désormais le lieu." },
  }[types[0]];
}

export function advanceSimulation(inputState, steps = 1) {
  const state = clone(inputState);
  for (let step = 0; step < steps; step += 1) {
    state.tick += 1;
    const hearth = state.structures.find((item) => item.type === "hearth");
    for (const [id, npc] of Object.entries(state.npcs)) {
      npc.energy = Math.max(0, npc.energy - 0.04);
      const route = getNpcRoute(state, id);
      if (state.tick % 3 === 0) {
        npc.routeIndex = (npc.routeIndex + 1) % route.length;
        [npc.x, npc.y] = route[npc.routeIndex];
      }
      if (hearth && distance(npc, hearth) <= 1) npc.energy = Math.min(10, npc.energy + 0.75);
    }
    if (hearth && state.tick % 12 === 0) {
      for (const npc of Object.values(state.npcs)) {
        if (!npc.helped || npc.energy <= 1) continue;
        state.commons[npc.need.type] = Math.min(6, state.commons[npc.need.type] + 1);
        npc.energy = Math.max(0, npc.energy - 0.2);
      }
    }
    for (const resource of state.resources) {
      resource.pressure = Math.max(0, resource.pressure - 0.01);
      if (!resource.active && state.tick - resource.depletedAt >= getRegrowDelay(state, resource)) {
        resource.active = true;
        resource.depletedAt = null;
      }
    }
  }
  return state;
}

export function movePlayer(inputState, dx, dy) {
  const state = advanceSimulation(inputState);
  const x = state.player.x + dx;
  const y = state.player.y + dy;
  const bridged = state.structures.some((item) => item.type === "bridge" && item.x === x && item.y === y);
  if (terrainAt(x, y) === "cliff" || (terrainAt(x, y) === "water" && !bridged) || occupied(state, x, y)) {
    log(state, "Le passage résiste", "Ce terrain ou cette construction ne peut pas être traversé depuis ici.", "limit");
    return state;
  }
  state.player.x = x;
  state.player.y = y;
  state.practices.steps += 1;
  const visit = `${x},${y}`;
  if (!state.visited.includes(visit)) state.visited.push(visit);
  state.traffic[visit] = (state.traffic[visit] || 0) + 1;
  if (dx < 0) state.player.facing = "left";
  if (dx > 0) state.player.facing = "right";
  if (dy < 0) state.player.facing = "up";
  if (dy > 0) state.player.facing = "down";
  return state;
}

function interactWithNpc(state, id, npc) {
  if (!state.met.includes(id)) state.met.push(id);
  state.practices.conversations += 1;
  if (!npc.helped && state.inventory[npc.need.type] >= npc.need.amount) {
    state.inventory[npc.need.type] -= npc.need.amount;
    npc.helped = true;
    npc.relation += 1;
    log(state, `${npc.name} peut reprendre son activité`, `Tu lui confies ${npc.need.label}. Son travail alimentera un foyer commun s'il en existe un.`, "dialogue");
    return state;
  }
  log(state, npc.name, npc.helped ? `${npc.intent}. Votre relation a déjà modifié ce qu'elle peut faire.` : `${npc.name} cherche ${npc.need.label}.`, "dialogue");
  return state;
}

export function interact(inputState) {
  const state = advanceSimulation(inputState);
  const nearbyNpc = Object.entries(state.npcs).find(([, npc]) => distance(state.player, npc) <= 1);
  if (nearbyNpc) return interactWithNpc(state, nearbyNpc[0], nearbyNpc[1]);

  const resource = state.resources.find((item) => item.active && distance(state.player, item) <= 1);
  if (resource) {
    resource.active = false;
    resource.depletedAt = state.tick;
    const yieldAmount = hasStructure(state, "workshop") ? 2 : 1;
    state.inventory[resource.type] += yieldAmount;
    state.practices.gathered += yieldAmount;
    resource.pressure += hasStructure(state, "workshop") ? 1 : 0.3;
    const gatheredTitle = { wood: "bois recueilli", stone: "pierre recueillie", fiber: "fibres recueillies" }[resource.type];
    log(
      state,
      `${gatheredTitle}${yieldAmount > 1 ? " ×2" : ""}`,
      yieldAmount > 1
        ? "L'atelier augmente le rendement, mais cette ressource mettra davantage de temps à revenir."
        : "Ce prélèvement laisse un vide temporaire dans le lieu.",
      "gather",
    );
    return state;
  }

  const hearth = state.structures.find((item) => item.type === "hearth" && distance(state.player, item) <= 1);
  if (hearth) {
    const total = Object.values(state.commons).reduce((sum, amount) => sum + amount, 0);
    if (!total) {
      log(state, "Le foyer est vide", "Les personnes aidées pourront y déposer des matières au fil des cycles.", "limit");
      return state;
    }
    for (const type of Object.keys(state.commons)) {
      state.inventory[type] += state.commons[type];
      state.commons[type] = 0;
    }
    log(state, "Le dépôt commun circule", `${total} matière${total > 1 ? "s" : ""} rejoint ton inventaire. Elle venait du travail des personnes aidées.`, "gather");
    return state;
  }

  const structure = state.structures.find((item) => distance(state.player, item) <= 1);
  if (structure) {
    const messages = {
      marker: ["La balise tient", "Elle conserve un point de retour et détourne maintenant le trajet de Mara."],
      workshop: ["L'atelier tourne", "Il rend chaque prélèvement plus productif et chaque repousse plus lente."],
      bridge: ["Le pont porte", "Une ancienne limite d'eau est devenue traversable."],
    };
    const [title, body] = messages[structure.type] || ["La construction demeure", "Son effet continue hors de ton regard."];
    log(state, title, body, "neutral");
    return state;
  }

  log(state, "Rien ne répond ici", "Essaie près d'une matière, d'une personne ou d'une construction.", "limit");
  return state;
}

export function getAvailableBuilds(state) {
  return Object.entries(RECIPES).map(([id, recipe]) => {
    const alreadyBuilt = recipe.unique && hasStructure(state, id);
    const missingRequirement = recipe.requires && !hasStructure(state, recipe.requires);
    const placement = recipe.water ? getAdjacentWater(state) : getLandBuildLocation(state);
    return {
      id,
      ...recipe,
      visible: id !== "bridge" || hasStructure(state, "workshop"),
      available: !alreadyBuilt && !missingRequirement && Boolean(placement) && hasCost(state.inventory, recipe.cost),
      blockedReason: alreadyBuilt ? "déjà construit" : missingRequirement ? "atelier requis" : !placement ? "place-toi près de l'eau" : !hasCost(state.inventory, recipe.cost) ? "matières manquantes" : "",
    };
  });
}

export function buildStructure(inputState, type) {
  const state = advanceSimulation(inputState);
  const recipe = getAvailableBuilds(state).find((item) => item.id === type && item.available);
  if (!recipe) {
    log(state, "Construction impossible", "Il manque une matière, une capacité ou un emplacement approprié.", "limit");
    return state;
  }
  const location = recipe.water ? getAdjacentWater(state) : getLandBuildLocation(state);
  payCost(state.inventory, recipe.cost);
  state.structures.push({ id: `${type}-${state.tick}`, type, x: location.x, y: location.y });
  state.practices.built += 1;
  if (!state.foundingChoice && ["marker", "hearth", "workshop"].includes(type)) state.foundingChoice = type;
  const messages = {
    marker: ["Tu as centré le monde sur une balise", "Les noms apparaissent, Mara modifie sa route et tu peux désormais revenir ici. Tu aurais pu commencer autrement."],
    hearth: ["Tu as centré le monde sur un foyer", "Les habitants modifient leurs trajets, récupèrent ici et les personnes aidées peuvent alimenter un dépôt commun."],
    workshop: ["Tu as centré le monde sur un atelier", "Tes récoltes doublent, leur retour ralentit et la construction de ponts devient possible."],
    bridge: ["L'eau n'est plus la même frontière", "Cette case est désormais franchissable. Le réseau praticable du monde vient réellement de changer."],
  };
  log(state, messages[type][0], messages[type][1], "evolution");
  return state;
}

export function returnToMarker(inputState) {
  const state = advanceSimulation(inputState);
  const marker = state.structures.find((item) => item.type === "marker");
  if (!marker) {
    log(state, "Aucun point de retour", "Il faudrait d'abord planter une balise.", "limit");
    return state;
  }
  state.player.x = marker.x;
  state.player.y = marker.y;
  log(state, "Retour à la balise", "Le trajet est abrégé parce que tu as construit et maintenu ce repère.", "evolution");
  return state;
}

export function getConsequences(state) {
  const consequences = [];
  if (hasStructure(state, "marker")) consequences.push("Balise : retour immédiat, noms visibles, trajet de Mara modifié.");
  if (hasStructure(state, "hearth")) consequences.push("Foyer : trajets et énergie des habitants modifiés, dépôt commun actif.");
  if (hasStructure(state, "workshop")) {
    const markedSites = state.resources.filter((resource) => resource.pressure > 0).length;
    consequences.push(`Atelier : récoltes ×2, repousse ralentie sur ${markedSites} site${markedSites > 1 ? "s" : ""} prélevé${markedSites > 1 ? "s" : ""}.`);
  }
  const bridges = state.structures.filter((item) => item.type === "bridge").length;
  if (bridges) consequences.push(`${bridges} pont${bridges > 1 ? "s" : ""} : autant de frontières d'eau rendues traversables.`);
  if (!consequences.length) consequences.push("Aucun centre n'est encore installé : plusieurs évolutions restent également possibles.");
  return consequences;
}

export function getObjective(state) {
  if (!state.practices.gathered && !state.met.length) return "Approche une matière ou une personne, puis presse E.";
  if (!state.foundingChoice) {
    const buildable = getAvailableBuilds(state).find((recipe) => recipe.visible && recipe.available);
    return buildable
      ? "Tu peux maintenant poser un premier centre. Ouvre Construire avec B."
      : "Rassemble encore des matières. Les possibilités sont visibles avec B.";
  }
  if (state.foundingChoice === "marker" && !hasStructure(state, "hearth")) return "Cartographier ne suffit pas : rencontres-tu les habitants ou intensifies-tu les prélèvements ?";
  if (state.foundingChoice === "hearth" && Object.values(state.npcs).some((npc) => !npc.helped)) return "Écoute les besoins des habitants et décide lesquels soutenir.";
  if (state.foundingChoice === "workshop" && !state.structures.some((item) => item.type === "bridge")) return "L'atelier permet un pont : faut-il transformer une frontière d'eau ?";
  return "Le monde reste ouvert : compose, aide, prélève, traverse et observe ce que tes choix déplacent.";
}
