import { completeExercise as randomizedExercise, audit, axes } from "../sequenced-restoration-v3.8-randomized-perturbation-assignment/fixtures.mjs";
import { computeClusterInterferenceProtocolDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = randomizedExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      probe.clusterAssignment = {
        method: "cluster_blocked_randomized",
        controller: "cluster-assignment-team",
        failureDomain: "cluster-assignment-site",
        plannedExposureTick: 12,
        observedExposureTick: 12,
        clusters: Array.from({ length: 40 }, (_, index) => ({
          clusterRoot: `${probe.probeId}-assignment-cluster-${index + 1}`,
          networkBoundaryRoot: `${probe.probeId}-network-boundary-${index + 1}`,
          arm: index < 20 ? "baseline" : "perturbed",
          memberCount: 5000,
          crossArmExposureCount: 0
        }))
      };
    }
  }
  exercise.clusterInterferenceCommitment = { algorithm: "sha256", committedAtTick: 8, digest: "" };
  exercise.clusterInterferenceCommitment.digest = computeClusterInterferenceProtocolDigest(exercise);
  return exercise;
}
