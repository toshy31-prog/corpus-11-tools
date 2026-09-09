import { completeExercise as distributionalExercise, audit, axes } from "../sequenced-restoration-v4.3-distributional-pretreatment-balance/fixtures.mjs";
import { computeDistributionalPretreatmentPlaceboDigest } from "./runtime.mjs";

export { audit, axes };

const OUTCOMES = ["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"];

export function recommitDistributionalPlacebos(exercise) {
  exercise.distributionalPretreatmentPlaceboCommitment.digest = computeDistributionalPretreatmentPlaceboDigest(exercise);
}

export function completeExercise() {
  const exercise = distributionalExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      for (const cluster of probe.clusterAssignment.clusters) {
        cluster.distributionalPlaceboCounts = OUTCOMES.map((outcome, index) => ({
          schema: "cluster-pretreatment-placebo-count/v1",
          outcome,
          sampleSize: 1000,
          eventCount: 100 * (index + 1),
          sourceRoot: `${cluster.clusterRoot}-${outcome}-distributional-placebo-source`,
          controller: "distributional-placebo-team",
          failureDomain: "distributional-placebo-site",
          measuredAtTick: 4,
          blindToFutureAssignment: true
        }));
      }
    }
  }
  exercise.distributionalPretreatmentPlaceboCommitment = { algorithm: "sha256", committedAtTick: 3, digest: "" };
  recommitDistributionalPlacebos(exercise);
  return exercise;
}

export function hideOpposingPlaceboDifferences(exercise) {
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) {
    const high = cluster.pretreatment.values.dependency_load >= 0.1375;
    const direction = cluster.arm === "baseline" ? 1 : -1;
    const count = cluster.distributionalPlaceboCounts.find((item) => item.outcome === "lagged_event_rate");
    count.eventCount += (high ? 80 : -80) * direction;
  }
  recommitDistributionalPlacebos(exercise);
}
