import assert from "node:assert/strict";
import { assessRandomizedPerturbationAssignment, computeAssignmentProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const assignment = exercise.crossSignalPerturbations[0].probes[0].effects[0].assignment;
assignment.plannedPerArm = 200000;
assignment.actualBaselineAssigned = 200000;
assignment.actualPerturbedAssigned = 200000;
exercise.assignmentProtocolCommitment.digest = computeAssignmentProtocolDigest(exercise);

const result = assessRandomizedPerturbationAssignment(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "randomized_assignment_or_attrition_invalid");
console.log("held-out confrontation: a favorable effect with fifty-percent arm attrition cannot establish the perturbation");
