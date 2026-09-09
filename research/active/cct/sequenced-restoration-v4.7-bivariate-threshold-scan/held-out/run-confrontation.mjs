import assert from "node:assert/strict";
import { assessObservedThresholdScan } from "../../sequenced-restoration-v4.6-observed-threshold-scan/runtime.mjs";
import { assessBivariateThresholdScan } from "../runtime.mjs";
import { audit, axes, completeExercise, hideBivariateCheckerboard } from "../fixtures.mjs";

const exercise = completeExercise();
hideBivariateCheckerboard(exercise);
assert.equal(assessObservedThresholdScan(axes, audit, exercise).status, "bounded_observed_threshold_scan_candidate");
const result = assessBivariateThresholdScan(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "bivariate_placebo_difference");
console.log("held-out confrontation: a bivariate intersection exposes a checkerboard imbalance invisible to both marginal scans");
