import { completeExercise as transportedExercise, audit, axes } from "../sequenced-restoration-v3.0-held-out-signal-transport/fixtures.mjs";
import { computeTransportProtocolDigest } from "../sequenced-restoration-v3.0-held-out-signal-transport/runtime.mjs";
import { computeUncertaintyProtocolDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = transportedExercise();
  const sampleSize = 5_000_000;
  for (const record of exercise.transportEvidence.pairMargins) {
    const source = exercise.pairSignals.find((signal) => signal.pair.join("+") === record.pair.join("+"));
    for (const trial of record.trials) {
      trial.sampleSize = sampleSize;
      trial.rivalAllAxesProtectedCount = sampleSize / 2;
      trial.candidateAllAxesProtectedCount = trial.rivalAllAxesProtectedCount + Math.round(source.minimumMargin * sampleSize / 100);
    }
  }
  for (const record of exercise.transportEvidence.classRisks) {
    const source = exercise.classRiskScores.find((signal) => signal.dependencyClass === record.dependencyClass);
    for (const trial of record.trials) {
      trial.sampleSize = sampleSize;
      trial.failureCount = Math.round(source.riskScore * sampleSize);
    }
  }
  exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
  exercise.uncertaintyProtocolCommitment = { algorithm: "sha256", committedAtTick: 18, digest: "" };
  return sealExercise(exercise);
}

export function sealExercise(exercise) {
  exercise.uncertaintyProtocolCommitment.digest = computeUncertaintyProtocolDigest(exercise);
  return exercise;
}
