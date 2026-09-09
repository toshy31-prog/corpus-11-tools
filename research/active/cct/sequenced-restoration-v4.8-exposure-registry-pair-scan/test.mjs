import test from "node:test";
import assert from "node:assert/strict";
import { assessBivariateThresholdScan } from "../sequenced-restoration-v4.7-bivariate-threshold-scan/runtime.mjs";
import { assessExposureRegistryPairScan, CctExposureRegistryPairScanRuntime, validateExposureRegistrySpec } from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("the closed exposure registry scans all three covariate pairs", () => {
  assert.equal(validateExposureRegistrySpec(), true);
  const result = assessExposureRegistryPairScan(axes, audit, completeExercise());
  assert.equal(result.status, "bounded_exposure_registry_pair_scan_candidate");
  assert.equal(result.failures.length, 0);
});

test("omitting a measured exposure from the declared registry is rejected", () => {
  const exercise = completeExercise();
  exercise.exposureRegistry = ["dependency_load", "access_loss"];
  assert.equal(assessBivariateThresholdScan(axes, audit, exercise).status, "bounded_bivariate_threshold_scan_candidate");
  assert.deepEqual(assessExposureRegistryPairScan(axes, audit, exercise), { status: "not_established", comparisons: 0, failures: ["exposure_registry_incomplete"] });
});

test("runtime blocks without a complete exposure registry", () => {
  const runtime = new CctExposureRegistryPairScanRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), { message: "CCT_EXPOSURE_REGISTRY_PAIR_SCAN_UNESTABLISHED" });
});
