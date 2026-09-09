import { completeExercise as sourceExercise, audit, axes, recommitDistributionalPlacebos } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/fixtures.mjs";
import { computePretreatmentBalanceProtocolDigest } from "../sequenced-restoration-v4.1-pretreatment-balance/runtime.mjs";

export { audit, axes };
export function completeExercise() { return sourceExercise(); }

export function hideBivariateCheckerboard(exercise) {
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) {
    const dependencyRank = Number(cluster.stratum.split("-")[1]);
    const accessRank = (dependencyRank % 20) + 1;
    cluster.pretreatment.values.access_loss = accessRank / 60;
    const sign = (dependencyRank >= 6) === (accessRank >= 15) ? 1 : -1;
    const armDirection = cluster.arm === "baseline" ? 1 : -1;
    cluster.distributionalPlaceboCounts[0].eventCount = 100 + sign * armDirection * 20;
  }
  exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);
  recommitDistributionalPlacebos(exercise);
}
