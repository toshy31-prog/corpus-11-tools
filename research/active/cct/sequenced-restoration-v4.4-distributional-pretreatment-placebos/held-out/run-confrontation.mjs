import assert from "node:assert/strict";
import { assessPretreatmentPlacebos } from "../../sequenced-restoration-v4.2-pretreatment-placebos/runtime.mjs";
import { assessDistributionalPretreatmentPlacebos } from "../runtime.mjs";
import { audit, axes, completeExercise, hideOpposingPlaceboDifferences } from "../fixtures.mjs";

const exercise = completeExercise();
hideOpposingPlaceboDifferences(exercise);
assert.equal(assessPretreatmentPlacebos(axes, audit, exercise).status, "bounded_pretreatment_placebo_candidate");
const result = assessDistributionalPretreatmentPlacebos(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "distributional_placebo_difference_detected");
console.log("held-out confrontation: cluster-level placebos expose subgroup differences hidden by the aggregate placebo result");
