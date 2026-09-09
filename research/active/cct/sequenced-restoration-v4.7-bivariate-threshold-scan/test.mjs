import test from "node:test";
import assert from "node:assert/strict";
import { assessObservedThresholdScan } from "../sequenced-restoration-v4.6-observed-threshold-scan/runtime.mjs";
import { assessBivariateThresholdScan, CctBivariateThresholdScanRuntime, validateBivariateThresholdScanSpec } from "./runtime.mjs";
import { audit, axes, completeExercise, hideBivariateCheckerboard } from "./fixtures.mjs";

test("powered bivariate intersections can qualify", () => {
  assert.equal(validateBivariateThresholdScanSpec(), true);
  const result = assessBivariateThresholdScan(axes, audit, completeExercise());
  assert.equal(result.status, "bounded_bivariate_threshold_scan_candidate");
  assert.equal(result.failures.length, 0);
});

test("a checkerboard hidden from both marginal scans is rejected", () => {
  const exercise = completeExercise();
  hideBivariateCheckerboard(exercise);
  assert.equal(assessObservedThresholdScan(axes, audit, exercise).status, "bounded_observed_threshold_scan_candidate");
  const result = assessBivariateThresholdScan(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "bivariate_placebo_difference");
});

test("runtime blocks without a qualified bivariate scan", () => {
  const runtime = new CctBivariateThresholdScanRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), { message: "CCT_BIVARIATE_THRESHOLD_SCAN_UNESTABLISHED" });
});
