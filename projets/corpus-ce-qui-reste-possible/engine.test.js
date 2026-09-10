import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIONS,
  CAMPAIGN,
  applyDeclaredNode,
  advanceToDeadline,
  changePerspective,
  createInitialState,
  formatClock,
  getActorKnowledge,
  getAvailableActions,
  getOutcome,
  performAction,
  resolveDuration,
} from "./engine.js";

const ids = (state, actor = state.perspective) => getAvailableActions(state, actor).map((action) => action.id);

function act(state, actor, action) {
  state = changePerspective(state, actor);
  return performAction(state, action);
}

test("the runtime identity and action copy come from the compiled campaign", () => {
  assert.equal(CAMPAIGN.id, "sereine-01");
  assert.equal(ACTIONS.length, CAMPAIGN.actions.length);
  const declared = CAMPAIGN.actions.find((action) => action.id === "mara-freeze");
  const runtime = ACTIONS.find((action) => action.id === "mara-freeze");
  assert.equal(runtime.title, declared.title);
  assert.equal(runtime.duration, declared.duration);
});

test("declared durations, conditions and effects are executable without an action handler", () => {
  const state = createInitialState();
  const synthetic = {
    duration: 1,
    durationVariants: [{ duration: 9, whenWorld: ["roadClosed"] }],
    grants: { world: ["harvestSaved"], knowledge: [{ actor: "mara", fact: "bills" }] },
  };
  assert.equal(resolveDuration(synthetic, state), 1);
  const changed = applyDeclaredNode(state, synthetic, "ina");
  assert.equal(changed.world.harvestSaved, true);
  assert.ok(changed.actors.mara.knowledge.includes("bills"));
  assert.equal(state.world.harvestSaved, false);
});

test("duration variants in the campaign drive runtime duration", () => {
  const action = CAMPAIGN.actions.find((candidate) => candidate.id === "ina-harvest");
  const state = createInitialState();
  state.world.roadClosed = true;
  assert.equal(resolveDuration(action, state), 7);
  state.world.routeTransmitted = true;
  assert.equal(resolveDuration(action, state), 5);
});

test("the runtime has no compressed pressure score", () => {
  const state = createInitialState();
  assert.equal("pressure" in state, false);
  assert.equal("protectedPublication" in state.world, false);
  assert.equal(state.world.recordPublication, false);
  assert.equal(state.world.storyPublication, false);
});

test("the clock runs from Tuesday morning to Friday morning", () => {
  assert.equal(formatClock(0), "Mardi · 08 h 00");
  assert.equal(formatClock(71), "Vendredi · 07 h 00");
});

test("each position begins with different knowledge", () => {
  const state = createInitialState();
  assert.ok(getActorKnowledge(state, "ina").some((fact) => fact.id === "home-world"));
  assert.ok(!getActorKnowledge(state, "mara").some((fact) => fact.id === "home-world"));
  assert.ok(getActorKnowledge(state, "nilo").some((fact) => fact.id === "six-drivers"));
  assert.ok(getActorKnowledge(state, "sora").some((fact) => fact.id === "press-release"));
});

test("changing position does not magically transfer knowledge", () => {
  let state = performAction(createInitialState(), "ina-bills");
  state = changePerspective(state, "mara");
  assert.ok(!getActorKnowledge(state).some((fact) => fact.id === "bills"));
  assert.ok(!ids(state).includes("mara-freeze"));
});

test("a trace travels only after mandate and transmission", () => {
  let state = createInitialState();
  state = act(state, "ina", "ina-bills");
  assert.ok(!ids(changePerspective(state, "ina")).includes("ina-send-mara"));
  state = act(state, "ina", "ina-mandate");
  state = act(state, "ina", "ina-send-mara");
  assert.ok(getActorKnowledge(state, "mara").some((fact) => fact.id === "bills"));
  assert.equal(state.world.permitFrozen, false);
  assert.equal(state.relays.filter((relay) => relay.to === "mara").length, 2);
});

test("signing, receiving and applying a suspension are separate states", () => {
  let state = createInitialState();
  state = act(state, "ina", "ina-bills");
  state = act(state, "ina", "ina-mandate");
  state = act(state, "ina", "ina-send-mara");
  state = act(state, "mara", "mara-compare");
  state = act(state, "mara", "mara-freeze");
  assert.equal(state.world.freezeSent, true);
  assert.equal(state.world.freezeReceived, false);
  assert.equal(state.world.permitFrozen, false);

  state = act(state, "sora", "sora-trace-loop");
  state = act(state, "sora", "sora-call-ina");
  assert.equal(state.world.freezeReceived, true);
  assert.equal(state.world.permitFrozen, false);
  assert.ok(ids(changePerspective(state, "nilo")).includes("nilo-acknowledge"));

  state = act(state, "nilo", "nilo-acknowledge");
  assert.equal(state.world.permitFrozen, true);
});

test("an individual refusal is real even when the schedule replaces it", () => {
  let state = act(createInitialState(), "nilo", "nilo-alone");
  assert.equal(state.world.niloLostWork, true);
  assert.equal(state.world.depotHold, false);
  state = act(state, "sora", "sora-trace-loop");
  state = act(state, "sora", "sora-call-ina");
  assert.ok(state.log.some((entry) => entry.title === "Le planning absorbe le refus individuel"));
  assert.equal(state.world.permitFrozen, false);
});

test("a collective hold can be bypassed when no specific public channel exists", () => {
  let state = createInitialState();
  state.world.crewOrganized = true;
  state.actors.nilo.knowledge.push("discrepancy");
  state = act(state, "nilo", "nilo-hold");
  state = advanceToDeadline(state);
  assert.equal(state.world.replacementContractor, true);
  assert.equal(state.world.depotHold, false);
});

test("a named public channel can prevent contract displacement without a pressure score", () => {
  let state = createInitialState();
  state.world.crewOrganized = true;
  state.world.recordPublication = true;
  state.actors.nilo.knowledge.push("discrepancy");
  state = act(state, "nilo", "nilo-hold");
  state = advanceToDeadline(state);
  assert.equal(state.world.replacementContractor, false);
  assert.equal(state.world.depotHold, true);
});

test("a protected interview can be declined and then remains unavailable", () => {
  let state = act(createInitialState(), "ina", "ina-mandate");
  state = act(state, "sora", "sora-call-ina");
  state = act(state, "ina", "ina-decline");
  assert.equal(state.world.interviewDeclined, true);
  assert.ok(!ids(state).includes("ina-interview"));
  assert.equal(state.world.protectedStory, false);
});

test("an action completed exactly at a threshold acts before the world event", () => {
  let state = createInitialState();
  state.elapsed = 54;
  state.world.freezeReceived = true;
  state = act(state, "nilo", "nilo-acknowledge");
  assert.equal(state.elapsed, 55);
  assert.equal(state.world.permitFrozen, true);
  assert.equal(state.world.machinesArrived, false);
  assert.equal(state.world.wetlandDamaged, false);
});

test("an action completed after a threshold cannot retroactively prevent its loss", () => {
  let state = createInitialState();
  state.elapsed = 53;
  state.world.crewOrganized = true;
  state.actors.nilo.knowledge.push("discrepancy");
  state = act(state, "nilo", "nilo-hold");
  assert.equal(state.elapsed, 56);
  assert.equal(state.world.depotHold, true);
  assert.equal(state.world.machinesArrived, true);
  assert.equal(state.world.wetlandDamaged, true);
});

test("the ending is a vector without a global score", () => {
  const state = advanceToDeadline(createInitialState());
  const outcome = getOutcome(state);
  assert.equal("score" in outcome, false);
  assert.equal(outcome.dimensions.length, 9);
  assert.equal(state.world.forcedDisplacement, true);
});

test("actions that cannot finish before the deadline disappear", () => {
  const state = createInitialState();
  state.elapsed = 70;
  assert.deepEqual(ids(state), []);
});
