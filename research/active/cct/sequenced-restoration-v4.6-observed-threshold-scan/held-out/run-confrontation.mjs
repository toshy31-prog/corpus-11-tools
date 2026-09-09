import assert from "node:assert/strict";
import { assessThresholdSensitivity } from "../../sequenced-restoration-v4.5-threshold-sensitivity/runtime.mjs";
import { assessObservedThresholdScan } from "../runtime.mjs";
import { audit, axes, completeExercise, hideDifferenceBelowGrid } from "../fixtures.mjs";

const exercise = completeExercise();
hideDifferenceBelowGrid(exercise);
assert.equal(assessThresholdSensitivity(axes, audit, exercise).status, "bounded_threshold_sensitivity_candidate");
const result = assessObservedThresholdScan(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "observed_threshold_placebo_difference");
console.log("held-out confrontation: an observed cutpoint exposes a placebo imbalance below the lowest fixed grid threshold");
