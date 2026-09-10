import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceSimulation,
  buildStructure,
  createEvolutionState,
  getAvailableBuilds,
  getCapabilities,
  getWorldForm,
  interact,
  movePlayer,
  returnToMarker,
} from "./evolution-engine.js";

function gather(state, resourceId) {
  const resource = state.resources.find((item) => item.id === resourceId);
  state.player.x = resource.x;
  state.player.y = resource.y;
  return interact(state);
}

function stock(state, inventory) {
  return { ...state, inventory: { ...state.inventory, ...inventory } };
}

test("the player starts in an open world without a prescribed phase", () => {
  let state = createEvolutionState();
  assert.equal("phase" in state, false);
  assert.equal(state.foundingChoice, null);
  state = movePlayer(state, 0, -1);
  assert.equal(state.player.y, 4);
  assert.equal(getWorldForm(state).id, "unmade");
});

test("the first construction is a real player-authored branch", () => {
  const base = createEvolutionState();
  const markerWorld = buildStructure(stock(base, { wood: 1, stone: 1 }), "marker");
  const hearthWorld = buildStructure(stock(base, { wood: 1, fiber: 1 }), "hearth");
  assert.equal(markerWorld.foundingChoice, "marker");
  assert.equal(hearthWorld.foundingChoice, "hearth");
  assert.equal(getWorldForm(markerWorld).id, "marker");
  assert.equal(getWorldForm(hearthWorld).id, "hearth");
  assert.notDeepEqual(getCapabilities(markerWorld), getCapabilities(hearthWorld));
});

test("a marker changes navigation and the route of Mara", () => {
  let state = createEvolutionState();
  state.player.x = 7;
  state.player.y = 7;
  state = buildStructure(stock(state, { wood: 1, stone: 1 }), "marker");
  state = movePlayer(state, -1, 0);
  state = returnToMarker(state);
  assert.deepEqual([state.player.x, state.player.y], [7, 7]);
  state = advanceSimulation(state, 9);
  assert.deepEqual([state.npcs.mara.x, state.npcs.mara.y], [7, 7]);
});

test("an atelier increases output and lengthens resource recovery", () => {
  let withoutWorkshop = createEvolutionState();
  withoutWorkshop = gather(withoutWorkshop, "wood-1");
  assert.equal(withoutWorkshop.inventory.wood, 1);
  assert.equal(advanceSimulation(withoutWorkshop, 18).resources.find((item) => item.id === "wood-1").active, true);

  let withWorkshop = buildStructure(stock(createEvolutionState(), { wood: 2, stone: 1 }), "workshop");
  withWorkshop = gather(withWorkshop, "wood-1");
  assert.equal(withWorkshop.inventory.wood, 2);
  assert.equal(advanceSimulation(withWorkshop, 18).resources.find((item) => item.id === "wood-1").active, false);
  assert.ok(withWorkshop.resources.find((item) => item.id === "wood-1").pressure > withoutWorkshop.resources.find((item) => item.id === "wood-1").pressure);
});

test("a foyer changes inhabitants and creates a reciprocal material circuit", () => {
  let state = createEvolutionState();
  state.player.x = 8;
  state.player.y = 8;
  state = buildStructure(stock(state, { wood: 1, fiber: 1 }), "hearth");
  state.npcs.ina.helped = true;
  state = advanceSimulation(state, 12);
  assert.equal(state.commons.fiber, 1);
  assert.deepEqual([state.npcs.ina.x, state.npcs.ina.y], [8, 8]);
});

test("an atelier can transform water into a traversable route", () => {
  let state = createEvolutionState();
  state = buildStructure(stock(state, { wood: 2, stone: 1 }), "workshop");
  state.player.x = 2;
  state.player.y = 4;
  state.player.facing = "up";
  const blocked = movePlayer(state, 0, -1);
  assert.deepEqual([blocked.player.x, blocked.player.y], [2, 4]);
  state = buildStructure(stock(state, { wood: 2, stone: 1 }), "bridge");
  state = movePlayer(state, 0, -1);
  assert.deepEqual([state.player.x, state.player.y], [2, 3]);
});

test("different branches remain composable without a global score", () => {
  let state = createEvolutionState();
  state = buildStructure(stock(state, { wood: 1, stone: 1 }), "marker");
  state = buildStructure(stock(state, { wood: 1, fiber: 1 }), "hearth");
  assert.equal(state.foundingChoice, "marker");
  assert.equal(getWorldForm(state).id, "composed");
  assert.equal("score" in state, false);
  assert.equal(getAvailableBuilds(state).find((item) => item.id === "marker").available, false);
});
