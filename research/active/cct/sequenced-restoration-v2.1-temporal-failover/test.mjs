import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessTemporalFailover, CctTemporalFailoverRuntime, validateTemporalFailoverSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const redundantBridge = { continuityLanes: [
  { protectsAxes: axes }, { protectsAxes: axes }
] };

function continuousExercise() {
  return {
    windowTicks: 2,
    trials: [0, 1].map((failedLane) => ({
      failedLane,
      observations: [0, 1, 2].map((tick) => ({
        tick,
        activeLanes: [1 - failedLane],
        protectedAxes: axes
      }))
    }))
  };
}

test("a bounded exercise must preserve every debt axis at every tick", () => {
  assert.equal(validateTemporalFailoverSpec(spec), true);
  assert.deepEqual(assessTemporalFailover(redundantBridge, axes, continuousExercise()), {
    status: "observed_continuity_candidate",
    failures: []
  });
});

test("a recovered average does not erase an intermediate protection gap", () => {
  const exercise = continuousExercise();
  exercise.trials[0].observations[1].protectedAxes = ["droits"];
  assert.deepEqual(assessTemporalFailover(redundantBridge, axes, exercise), {
    status: "unestablished",
    failures: [{
      failedLane: 0,
      tick: 1,
      reason: "temporal_gap",
      missingAxes: ["attribution_du_pouvoir"]
    }]
  });
});

test("an absent tick keeps the exercise unestablished", () => {
  const exercise = continuousExercise();
  exercise.trials[1].observations.splice(1, 1);
  assert.deepEqual(assessTemporalFailover(redundantBridge, axes, exercise).failures, [
    { failedLane: 1, tick: 1, reason: "window_incomplete" }
  ]);
});

test("a protection report cannot substitute for a supporting active lane", () => {
  const exercise = continuousExercise();
  exercise.trials[0].observations[1].activeLanes = [];
  assert.deepEqual(assessTemporalFailover(redundantBridge, axes, exercise).failures, [
    { failedLane: 0, tick: 1, reason: "no_active_lane" },
    { failedLane: 0, tick: 1, reason: "unsupported_protection", missingAxes: axes }
  ]);
});

test("runtime blocks a structurally redundant but temporally unexercised bridge", () => {
  const runtime = new CctTemporalFailoverRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(
    () => runtime.decide({
      view: { cct: { tick: 7, actionOntology: { bridge: redundantBridge }, bridgeExercises: {}, failoverExercises: {} } },
      allowedActions: ["bridge"]
    }),
    { message: "CCT_EVIDENCE_BRIDGE_TEMPORAL_FAILOVER_UNESTABLISHED" }
  );
});
