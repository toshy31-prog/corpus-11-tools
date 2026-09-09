import assert from "node:assert/strict";
import { assessObservedPerturbationEffects } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const effect = exercise.crossSignalPerturbations[0].probes[0].effects[0];
effect.perturbed.eventCount = 35000;

const result = assessObservedPerturbationEffects(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "declared_effect_does_not_match_counts");
console.log("held-out confrontation: a favorable declared perturbation effect cannot override its direct counts");
