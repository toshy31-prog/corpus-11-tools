import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CctSingleFailureBridgeRuntime, singleLaneFailureCoverage, validateSingleFailureSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const splitBridge = { continuityLanes: [
  { protectsAxes: ["droits"] }, { protectsAxes: ["attribution_du_pouvoir"] }
] };
const redundantBridge = { continuityLanes: [
  { protectsAxes: axes }, { protectsAxes: axes }
] };

test("nominal dual protection fails the single-lane perturbation", () => {
  assert.equal(validateSingleFailureSpec(spec), true);
  const result = singleLaneFailureCoverage(splitBridge, axes);
  assert.equal(result.tolerant, false);
  assert.deepEqual(result.failures, [
    { failedLane: 0, missingAxes: ["droits"] },
    { failedLane: 1, missingAxes: ["attribution_du_pouvoir"] }
  ]);
});

test("each remaining lane must retain the full open-debt cover", () => {
  assert.deepEqual(singleLaneFailureCoverage(redundantBridge, axes), { tolerant: true, failures: [] });
});

test("runtime blocks the nominal-only bridge before downstream selection", () => {
  const runtime = new CctSingleFailureBridgeRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 6, actionOntology: { split: splitBridge }, bridgeExercises: {} } }, allowedActions: ["split"] }),
    { message: "CCT_EVIDENCE_BRIDGE_SINGLE_FAILURE_UNSAFE" }
  );
});
