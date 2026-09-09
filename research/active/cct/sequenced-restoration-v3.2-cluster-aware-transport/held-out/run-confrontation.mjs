import assert from "node:assert/strict";
import { assessClusterAwareTransport, computeClusterProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const trial = exercise.transportEvidence.classRisks[0].trials[0];
trial.clusters = [{ clusterId: "single-origin", sampleSize: trial.sampleSize, failureCount: trial.failureCount }];
exercise.clusterProtocolCommitment.digest = computeClusterProtocolDigest(exercise);

const result = assessClusterAwareTransport(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cluster_structure_invalid");
console.log("held-out confrontation: five million observations from one cluster cannot establish transport precision");
