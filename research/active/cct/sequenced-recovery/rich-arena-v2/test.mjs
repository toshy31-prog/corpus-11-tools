import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateScenario } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/contracts.mjs";
import { computeScenarioHash } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";
import { runBlindArena } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/runner.mjs";
import { createRichScenario, RICH_INTERPRETER_FORCED_NO_ACTION, validateRichDocument } from "./interpreter.mjs";

const scenarioUrl = new URL("../scenario-intake/virelia-fractured-atoll-cascade-v1.0.0-r2.frozen.json", import.meta.url);
const document = JSON.parse(await readFile(scenarioUrl, "utf8"));

function freshScenario() {
  return createRichScenario(document);
}

function choose(actionPolicy, id) {
  return {
    manifest: { id, version: "1.0.0", title: id, family: "test-policy" },
    decide({ view, allowedActions }) {
      return { action: actionPolicy(allowedActions), predictions: Object.fromEntries(Object.entries(view).filter(([, value]) => Number.isFinite(value)).map(([key]) => [key, 0])) };
    },
  };
}

test("the frozen Virelia document is valid under rich interpreter v2", () => {
  const result = validateRichDocument(document);
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
});

test("the normalized scenario satisfies the Open Arena contract", () => {
  const scenario = freshScenario();
  assert.equal(validateScenario(scenario, { claimExternal: true }), true);
  assert.deepEqual(scenario.manifest.dimensions, document.outcomes.dimensions.map((dimension) => dimension.id));
  assert.deepEqual(scenario.manifest.reversalConditions, document.reversalConditions.map((condition) => condition.id));
});

test("the public projection hides four declared hidden variables", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  const view = scenario.project({ world: trial.world, round: 0, history: [] });
  for (const hidden of document.view.hidden) assert.equal(Object.hasOwn(view, hidden), false);
  for (const visible of document.view.public_visible) assert.equal(view[visible], document.initialState[visible]);
});

test("available bundles obey the shared cost and cardinality budget", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  const view = scenario.project({ world: trial.world, round: 0, history: [] });
  for (const bundleId of view.availableBundles) {
    const actions = bundleId.split("+");
    assert.ok(actions.length <= 2);
    assert.ok(actions.reduce((sum, action) => sum + document.actions[action].cost, 0) <= 4);
  }
  assert.ok(view.availableBundles.includes("divert_flow+mobilize_labor"));
  assert.ok(!view.availableBundles.includes("dredge_channel+seal_breach"));
});

test("divert_flow executes action, dependency, exogenous event and queue in declared order", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  scenario.act({ world: trial.world, action: "divert_flow", round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.state.groundwater_index, 71);
  assert.equal(trial.world.state.harbor_depth, 52.97);
  assert.equal(trial.world.state.salt_intrusion, 26);
  assert.equal(trial.world.state.seismic_stability, 62);
  assert.deepEqual(trial.world.delayed.map(({ dueRound, sourceAction }) => ({ dueRound, sourceAction })), [{ dueRound: 2, sourceAction: "divert_flow" }]);
});

test("delayed damage is applied only at its due round", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  scenario.act({ world: trial.world, action: "divert_flow", round: 0, exogenous: trial.exogenous });
  scenario.act({ world: trial.world, action: "redistribute_stock", round: 1, exogenous: trial.exogenous });
  const beforeDue = trial.world.state.seismic_stability;
  scenario.act({ world: trial.world, action: "mobilize_labor", round: 2, exogenous: trial.exogenous });
  assert.equal(trial.world.state.seismic_stability, beforeDue - 7 - 5);
  assert.equal(trial.world.delayed.some((item) => item.sourceAction === "divert_flow"), false);
});

test("isolate_sector creates a persistent labor ceiling", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  scenario.act({ world: trial.world, action: "isolate_sector", round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.state.labor_availability, 55);
  assert.equal(trial.world.caps.labor_availability, 55);
  scenario.act({ world: trial.world, action: "mobilize_labor", round: 1, exogenous: trial.exogenous });
  assert.equal(trial.world.state.labor_availability, 55);
});

test("irreversible pier loss creates a persistent harbor ceiling", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  trial.world.state.seismic_stability = 20;
  scenario.act({ world: trial.world, action: "dredge_channel", round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.caps.harbor_depth, 35);
  scenario.act({ world: trial.world, action: "dredge_channel", round: 1, exogenous: trial.exogenous });
  assert.ok(trial.world.state.harbor_depth <= 35);
  assert.equal(trial.world.caps.harbor_depth, 35);
  assert.equal(trial.world.reversalFlags.irreversible_pier_loss, true);
});

test("bundle action order is a canonical set convention", () => {
  const scenario = freshScenario();
  const left = scenario.createTrial();
  const right = scenario.createTrial();
  scenario.act({ world: left.world, action: "divert_flow+mobilize_labor", round: 0, exogenous: left.exogenous });
  scenario.act({ world: right.world, action: "mobilize_labor+divert_flow", round: 0, exogenous: right.exogenous });
  assert.deepEqual(left.world, right.world);
});

test("all eight singleton actions execute at least one complete round", () => {
  const scenario = freshScenario();
  for (const action of Object.keys(document.actions)) {
    const trial = scenario.createTrial();
    const allowed = scenario.admissibleActions({ view: scenario.project({ world: trial.world, round: 0, history: [] }), round: 0 });
    assert.ok(allowed.includes(action), `${action} unavailable initially`);
    scenario.act({ world: trial.world, action, round: 0, exogenous: trial.exogenous });
    const observation = scenario.observe({ world: trial.world, round: 0 });
    const outcomes = scenario.close({ world: trial.world, history: [] });
    assert.ok(Object.values(observation).every(Number.isFinite));
    assert.ok(scenario.manifest.dimensions.every((dimension) => Number.isFinite(outcomes[dimension])));
  }
});

test("invalid bundles are skipped without changing material state", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  const before = structuredClone(trial.world.state);
  scenario.act({ world: trial.world, action: "dredge_channel+seal_breach", round: 0, exogenous: trial.exogenous });
  assert.deepEqual(trial.world.state, before);
  assert.equal(trial.world.trace.at(-1).event, "invalid_bundle_skipped");
});

test("forced inaction advances exogenous effects when every declared action is unavailable", () => {
  const mutated = structuredClone(document);
  for (const action of Object.values(mutated.actions)) {
    action.precondition = { op: "lt", var: "groundwater_index", value: 0 };
  }
  mutated.freeze.contentHash = computeScenarioHash(mutated);
  const scenario = createRichScenario(mutated);
  const trial = scenario.createTrial();
  const view = scenario.project({ world: trial.world, round: 0, history: [] });
  assert.deepEqual(view.availableBundles, [RICH_INTERPRETER_FORCED_NO_ACTION]);
  const before = trial.world.state.seismic_stability;
  scenario.act({ world: trial.world, action: RICH_INTERPRETER_FORCED_NO_ACTION, round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.state.seismic_stability, before - 4);
  assert.equal(trial.world.trace.at(-1).event, "forced_no_action");
});

test("state values are clamped to declared bounds", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  trial.world.state.groundwater_index = 99;
  scenario.act({ world: trial.world, action: "divert_flow", round: 0, exogenous: trial.exogenous });
  assert.equal(trial.world.state.groundwater_index, 100);
});

test("total collapse locks outcomes and leaves an explicit numeric reversal flag", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  Object.assign(trial.world.state, { seismic_stability: 14, harbor_depth: 19, groundwater_index: 17, material_stock: 10 });
  scenario.act({ world: trial.world, action: "redistribute_stock", round: 0, exogenous: trial.exogenous });
  const outcomes = scenario.close({ world: trial.world, history: [] });
  assert.equal(trial.world.reversalFlags.total_collapse, true);
  assert.equal(outcomes.__reversal_total_collapse, 1);
  for (const dimension of document.outcomes.dimensions) {
    assert.equal(outcomes[dimension.id], dimension.failure_threshold);
  }
});

test("projection and observation cannot mutate world truth", () => {
  const scenario = freshScenario();
  const trial = scenario.createTrial();
  const before = JSON.stringify(trial.world);
  scenario.project({ world: structuredClone(trial.world), round: 0, history: [] });
  scenario.observe({ world: structuredClone(trial.world), round: 0 });
  assert.equal(JSON.stringify(trial.world), before);
});

test("unknown condition operators are rejected before execution", () => {
  const mutated = structuredClone(document);
  mutated.actions.divert_flow.precondition.op = "guess";
  const result = validateRichDocument(mutated);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /unsupported condition/);
});

test("permanent effects without literal min|max bounds are rejected", () => {
  const mutated = structuredClone(document);
  mutated.transitions.rules.find((rule) => rule.action === "isolate_sector").immediate_gain_destroys_future.ops = [
    { var: "labor_availability", delta: -10 },
  ];
  const result = validateRichDocument(mutated);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /permanent effects require min\|max/);
});

test("manifest count drift is rejected", () => {
  const mutated = structuredClone(document);
  mutated.manifest.dimensions = 99;
  mutated.manifest.reversalConditions = 99;
  const result = validateRichDocument(mutated);
  assert.match(result.errors.join("\n"), /dimensions count mismatch/);
  assert.match(result.errors.join("\n"), /reversalConditions count mismatch/);
});

test("two identical policies remain materially identical despite different contender identities", () => {
  const scenario = freshScenario();
  const arena = runBlindArena({
    arenaId: "virelia-interpreter-identity-test",
    scenario,
    contenders: [choose((allowed) => allowed[0], "identity-A"), choose((allowed) => allowed[0], "identity-B")],
    seed: 3,
    blindKey: "virelia-test-secret",
    claimExternal: true,
  });
  assert.deepEqual(arena.report.runs[0].outcomes, arena.report.runs[1].outcomes);
  assert.equal(arena.report.conclusionBoundary, "vector_outcomes_only_no_unique_winner");
  assert.equal(JSON.stringify(arena.report).includes("aggregateScore"), false);
});

test("a complete blind arena run preserves hidden-state isolation in every history view", () => {
  const scenario = freshScenario();
  const arena = runBlindArena({
    arenaId: "virelia-interpreter-isolation-test",
    scenario,
    contenders: [choose((allowed) => allowed[0], "first-policy"), choose((allowed) => allowed.at(-1), "last-policy")],
    seed: 7,
    blindKey: "virelia-isolation-secret",
    claimExternal: true,
  });
  for (const run of arena.report.runs) {
    assert.equal(run.history.length, 8);
    for (const entry of run.history) for (const hidden of document.view.hidden) assert.equal(Object.hasOwn(entry.view, hidden), false);
  }
  assert.equal(arena.report.externalityStatus, "declared_external_with_verified_freeze_authorship_not_independently_verified");
});
