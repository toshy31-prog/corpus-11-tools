import assert from "node:assert/strict";
import { assessBivariateThresholdScan } from "../../sequenced-restoration-v4.7-bivariate-threshold-scan/runtime.mjs";
import { assessExposureRegistryPairScan } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
exercise.exposureRegistry = ["dependency_load", "access_loss"];
assert.equal(assessBivariateThresholdScan(axes, audit, exercise).status, "bounded_bivariate_threshold_scan_candidate");
const result = assessExposureRegistryPairScan(axes, audit, exercise);
assert.deepEqual(result.failures, ["exposure_registry_incomplete"]);
console.log("held-out confrontation: a scan cannot omit the measured baseline event rate from its declared exposure registry");
