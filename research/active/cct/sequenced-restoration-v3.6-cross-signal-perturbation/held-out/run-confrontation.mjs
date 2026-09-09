import assert from "node:assert/strict";
import { assessCrossSignalPerturbations } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const challenge = exercise.crossSignalPerturbations[0];
const spillover = challenge.probes[0].effects.find((effect) => effect.signalType === "class_risk");
spillover.effectMagnitude = 0.2;

const result = assessCrossSignalPerturbations(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cross_signal_perturbation_detected");
console.log("held-out confrontation: a generator perturbation spilling into another signal reveals a hidden common cause");
