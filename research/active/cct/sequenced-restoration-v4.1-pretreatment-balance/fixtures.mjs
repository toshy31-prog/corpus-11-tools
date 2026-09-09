import { completeExercise as randomizedExercise, audit, axes } from "../sequenced-restoration-v4.0-reproducible-cluster-randomization/fixtures.mjs";
import { computePretreatmentBalanceProtocolDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = randomizedExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      for (const cluster of probe.clusterAssignment.clusters) {
        const stratumIndex = Number(cluster.stratum.split("-")[1]);
        cluster.pretreatment = {
          schema: "cluster-pretreatment-covariates/v1",
          sourceRoot: `${cluster.clusterRoot}-pretreatment-source`,
          controller: "pretreatment-measurement-team",
          failureDomain: "pretreatment-measurement-site",
          measuredAtTick: 4,
          values: {
            baseline_event_rate: stratumIndex / 100,
            dependency_load: stratumIndex / 80,
            access_loss: stratumIndex / 60
          }
        };
      }
    }
  }
  exercise.pretreatmentBalanceCommitment = { algorithm: "sha256", committedAtTick: 5, digest: "" };
  exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);
  return exercise;
}
