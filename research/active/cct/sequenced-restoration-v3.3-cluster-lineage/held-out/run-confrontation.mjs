import assert from "node:assert/strict";
import { assessClusterLineageTransport, computeClusterLineageProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const record = exercise.transportEvidence.pairMargins[0];
for (const trial of record.trials) {
  for (const cluster of trial.clusters) cluster.generatorRoot = "shared-hidden-generator";
}
exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);

const result = assessClusterLineageTransport(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cluster_lineage_dependent");
console.log("held-out confrontation: distinct cluster labels sharing one generator do not establish independence");
