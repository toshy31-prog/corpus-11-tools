import { completeExercise as scanExercise, audit, axes } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/fixtures.mjs";
import { recommitDistributionalPlacebos } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/fixtures.mjs";

export { audit, axes };

export function completeExercise() {
  return scanExercise();
}

export function hideDifferenceBelowGrid(exercise) {
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) {
    if (Number(cluster.stratum.split("-")[1]) !== 1) continue;
    const count = cluster.distributionalPlaceboCounts.find((item) => item.outcome === "lagged_event_rate");
    count.eventCount = cluster.arm === "baseline" ? 540 : 0;
  }
  recommitDistributionalPlacebos(exercise);
}
