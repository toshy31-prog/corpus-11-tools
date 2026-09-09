import { completeExercise as attestedExercise, audit, axes } from "../sequenced-restoration-v3.5-lineage-attestation/fixtures.mjs";
import { computeCrossSignalPerturbationProtocolDigest } from "./runtime.mjs";

export { audit, axes };

function signals(exercise) {
  return [
    ...exercise.transportEvidence.pairMargins.map((record) => ({ signalType: "pair_margin", signal: record.pair.join("+"), trials: record.trials })),
    ...exercise.transportEvidence.classRisks.map((record) => ({ signalType: "class_risk", signal: record.dependencyClass, trials: record.trials }))
  ];
}

export function completeExercise() {
  const exercise = attestedExercise();
  const portfolio = signals(exercise);
  exercise.crossSignalPerturbations = portfolio.map((target) => ({
    signalType: target.signalType,
    signal: target.signal,
    probes: ["a", "b"].map((suffix, index) => ({
      schema: "generator-perturbation/v1",
      probeId: `${target.signalType}-${target.signal}-probe-${suffix}`,
      perturbedGeneratorRoots: target.trials.flatMap((trial) => trial.clusters.map((cluster) => cluster.generatorRoot)),
      controller: `perturbation-team-${suffix}`,
      failureDomain: `perturbation-site-${suffix}`,
      plannedObservationTick: 13 + index,
      observedAtTick: 13 + index,
      effects: portfolio.map((observed) => ({
        signalType: observed.signalType,
        signal: observed.signal,
        effectMagnitude: observed.signalType === target.signalType && observed.signal === target.signal ? 0.3 : 0
      }))
    }))
  }));
  exercise.crossSignalPerturbationCommitment = { algorithm: "sha256", committedAtTick: 12, digest: "" };
  exercise.crossSignalPerturbationCommitment.digest = computeCrossSignalPerturbationProtocolDigest(exercise);
  return exercise;
}
