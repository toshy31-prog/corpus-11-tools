import { completeExercise as thresholdExercise, audit, axes, recommitDistributionalPlacebos } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/fixtures.mjs";

export { audit, axes };

export function completeExercise() {
  return thresholdExercise();
}

export function hideDifferenceBelowChosenThreshold(exercise) {
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) {
    const stratum = Number(cluster.stratum.split("-")[1]);
    if (stratum < 8 || stratum > 10) continue;
    const count = cluster.distributionalPlaceboCounts.find((item) => item.outcome === "lagged_event_rate");
    count.eventCount = cluster.arm === "baseline" ? 400 : 0;
  }
  recommitDistributionalPlacebos(exercise);
}
