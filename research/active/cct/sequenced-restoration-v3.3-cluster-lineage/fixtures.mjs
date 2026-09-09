import { completeExercise as clusteredExercise, audit, axes } from "../sequenced-restoration-v3.2-cluster-aware-transport/fixtures.mjs";
import { computeClusterLineageProtocolDigest } from "./runtime.mjs";

export { audit, axes };

function attachLineage(trial) {
  for (const [index, cluster] of trial.clusters.entries()) {
    cluster.samplingUnitRoot = `${trial.contextId}-sampling-unit-${index + 1}`;
    cluster.eventRoot = `${trial.contextId}-event-${index + 1}`;
    cluster.generatorRoot = `${trial.contextId}-generator-${index + 1}`;
    cluster.controller = `${trial.contextId}-controller-${(index % 2) + 1}`;
    cluster.failureDomain = `${trial.contextId}-failure-domain-${(index % 2) + 1}`;
  }
}

export function completeExercise() {
  const exercise = clusteredExercise();
  for (const record of exercise.transportEvidence.pairMargins) {
    for (const trial of record.trials) attachLineage(trial);
  }
  for (const record of exercise.transportEvidence.classRisks) {
    for (const trial of record.trials) attachLineage(trial);
  }
  exercise.clusterLineageProtocolCommitment = { algorithm: "sha256", committedAtTick: 16, digest: "" };
  exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);
  return exercise;
}
