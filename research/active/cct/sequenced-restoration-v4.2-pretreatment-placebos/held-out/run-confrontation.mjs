import assert from "node:assert/strict";
import { assessPretreatmentPlacebos } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
exercise.crossSignalPerturbations[0].probes[0].pretreatmentPlacebos[0].perturbed.eventCount = 20000;

const result = assessPretreatmentPlacebos(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "pretreatment_placebo_difference_detected");
console.log("held-out confrontation: a pre-intervention placebo difference exposes imbalance hidden from named covariates");
