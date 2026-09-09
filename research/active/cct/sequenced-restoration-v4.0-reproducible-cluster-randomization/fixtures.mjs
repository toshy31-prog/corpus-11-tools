import { completeExercise as interferenceExercise, audit, axes } from "../sequenced-restoration-v3.9-cluster-interference/fixtures.mjs";
import {
  computeClusterRandomizationProtocolDigest,
  computeClusterSeedCommitment,
  deriveClusterArms
} from "./runtime.mjs";
import { computeClusterInterferenceProtocolDigest } from "../sequenced-restoration-v3.9-cluster-interference/runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = interferenceExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      probe.clusterAssignment.clusters.forEach((cluster, index) => { cluster.stratum = `stratum-${Math.floor(index / 2) + 1}`; });
      const seedReveal = `cluster-randomization-seed-${probe.probeId}`;
      probe.clusterRandomization = {
        algorithm: "sha256_rank_within_pairs",
        seedCommitment: computeClusterSeedCommitment(seedReveal),
        seedReveal,
        controller: "cluster-randomization-team",
        failureDomain: "cluster-randomization-site",
        assignedAtTick: 7,
        seedRevealedAtTick: 8
      };
      const arms = deriveClusterArms(probe.clusterAssignment.clusters, seedReveal);
      for (const cluster of probe.clusterAssignment.clusters) cluster.arm = arms.get(cluster.clusterRoot);
    }
  }
  exercise.clusterInterferenceCommitment.digest = computeClusterInterferenceProtocolDigest(exercise);
  exercise.clusterRandomizationCommitment = { algorithm: "sha256", committedAtTick: 6, digest: "" };
  exercise.clusterRandomizationCommitment.digest = computeClusterRandomizationProtocolDigest(exercise);
  return exercise;
}
