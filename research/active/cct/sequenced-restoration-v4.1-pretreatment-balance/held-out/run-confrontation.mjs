import assert from "node:assert/strict";
import { assessPretreatmentBalance, computePretreatmentBalanceProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const cluster = exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters.find((item) => item.arm === "baseline");
cluster.pretreatment.values.baseline_event_rate = 1;
exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);

const result = assessPretreatmentBalance(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "pretreatment_imbalance");
console.log("held-out confrontation: a reproducibly randomized but materially imbalanced stratum cannot establish comparability");
