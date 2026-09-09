import assert from "node:assert/strict";
import { computeClusterInterferenceProtocolDigest } from "../../sequenced-restoration-v3.9-cluster-interference/runtime.mjs";
import { assessReproducibleClusterRandomization } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const clusters = exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters;
const baseline = clusters.find((cluster) => cluster.arm === "baseline");
const perturbed = clusters.find((cluster) => cluster.arm === "perturbed" && cluster.stratum !== baseline.stratum);
[baseline.arm, perturbed.arm] = [perturbed.arm, baseline.arm];
exercise.clusterInterferenceCommitment.digest = computeClusterInterferenceProtocolDigest(exercise);

const result = assessReproducibleClusterRandomization(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cluster_assignment_not_reproducible");
console.log("held-out confrontation: a balanced manual arm swap cannot masquerade as the committed cluster randomization");
