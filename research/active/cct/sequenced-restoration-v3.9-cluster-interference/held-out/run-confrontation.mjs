import assert from "node:assert/strict";
import { assessClusterInterference } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters[0].crossArmExposureCount = 1000;

const result = assessClusterInterference(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cluster_interference_or_reconciliation_invalid");
console.log("held-out confrontation: twenty-percent cross-arm exposure blocks an otherwise favorable randomized effect");
