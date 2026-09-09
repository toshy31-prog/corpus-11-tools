import test from "node:test";
import assert from "node:assert/strict";
import { assessThresholdSensitivity } from "../sequenced-restoration-v4.5-threshold-sensitivity/runtime.mjs";
import { assessObservedThresholdScan, CctObservedThresholdScanRuntime, validateObservedThresholdScanSpec } from "./runtime.mjs";
import { audit, axes, completeExercise, hideDifferenceBelowGrid } from "./fixtures.mjs";

test("all powered observed cutpoints can qualify within the search budget", () => {
  assert.equal(validateObservedThresholdScanSpec(), true);
  assert.deepEqual(assessObservedThresholdScan(axes, audit, completeExercise()), {
    status: "bounded_observed_threshold_scan_candidate",
    comparisons: 5940,
    failures: []
  });
});

test("an imbalance below the lowest fixed grid threshold is exposed", () => {
  const exercise = completeExercise();
  hideDifferenceBelowGrid(exercise);
  assert.equal(assessThresholdSensitivity(axes, audit, exercise).status, "bounded_threshold_sensitivity_candidate");
  const result = assessObservedThresholdScan(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.deepEqual(result.failures[0], {
    signal: "pair_margin:control+identity",
    probeId: "pair_margin-control+identity-probe-a",
    covariate: "dependency_load",
    threshold: 0.0125,
    outcome: "lagged_event_rate",
    reason: "observed_threshold_placebo_difference"
  });
});

test("runtime blocks when the observed threshold scan is unavailable", () => {
  const runtime = new CctObservedThresholdScanRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), {
    message: "CCT_OBSERVED_THRESHOLD_SCAN_UNESTABLISHED"
  });
});
