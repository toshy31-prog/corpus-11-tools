import { completeExercise as uncertainExercise, audit, axes } from "../sequenced-restoration-v3.1-uncertainty-bounded-transport/fixtures.mjs";
import { computeClusterProtocolDigest } from "./runtime.mjs";

export { audit, axes };

function pairClusters(trial) {
  const clusterCount = 40;
  const sampleSize = trial.sampleSize / clusterCount;
  const rivalCount = trial.rivalAllAxesProtectedCount / clusterCount;
  const candidateCount = trial.candidateAllAxesProtectedCount / clusterCount;
  return Array.from({ length: clusterCount }, (_, index) => ({
    clusterId: `${trial.contextId}-cluster-${index + 1}`,
    sampleSize,
    candidateAllAxesProtectedCount: candidateCount,
    rivalAllAxesProtectedCount: rivalCount
  }));
}

function riskClusters(trial) {
  const clusterCount = 40;
  const sampleSize = trial.sampleSize / clusterCount;
  const failureCount = trial.failureCount / clusterCount;
  return Array.from({ length: clusterCount }, (_, index) => ({
    clusterId: `${trial.contextId}-cluster-${index + 1}`,
    sampleSize,
    failureCount
  }));
}

export function completeExercise() {
  const exercise = uncertainExercise();
  for (const record of exercise.transportEvidence.pairMargins) {
    for (const trial of record.trials) trial.clusters = pairClusters(trial);
  }
  for (const record of exercise.transportEvidence.classRisks) {
    for (const trial of record.trials) trial.clusters = riskClusters(trial);
  }
  exercise.clusterProtocolCommitment = { algorithm: "sha256", committedAtTick: 17, digest: "" };
  exercise.clusterProtocolCommitment.digest = computeClusterProtocolDigest(exercise);
  return exercise;
}
