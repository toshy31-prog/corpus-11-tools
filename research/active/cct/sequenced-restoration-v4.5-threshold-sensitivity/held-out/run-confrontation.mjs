import assert from "node:assert/strict";
import { assessDistributionalPretreatmentPlacebos } from "../../sequenced-restoration-v4.4-distributional-pretreatment-placebos/runtime.mjs";
import { assessThresholdSensitivity } from "../runtime.mjs";
import { audit, axes, completeExercise, hideDifferenceBelowChosenThreshold } from "../fixtures.mjs";

const exercise = completeExercise();
hideDifferenceBelowChosenThreshold(exercise);
assert.equal(assessDistributionalPretreatmentPlacebos(axes, audit, exercise).status, "bounded_distributional_pretreatment_placebo_candidate");
const result = assessThresholdSensitivity(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "threshold_sensitive_placebo_difference");
console.log("held-out confrontation: the sensitivity grid exposes a placebo difference placed just below the former exposure threshold");
