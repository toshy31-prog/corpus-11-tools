import { completeExercise as perturbationExercise, audit, axes } from "../sequenced-restoration-v3.6-cross-signal-perturbation/fixtures.mjs";
import { computePerturbationMeasurementProtocolDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = perturbationExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      for (const effect of probe.effects) {
        const key = `${challenge.signalType}-${challenge.signal}-${probe.probeId}-${effect.signalType}-${effect.signal}`;
        const target = challenge.signalType === effect.signalType && challenge.signal === effect.signal;
        effect.baseline = {
          schema: "perturbation-effect-count/v1",
          sampleSize: 100000,
          eventCount: 10000,
          sourceRoot: `${key}-baseline-source`,
          controller: "effect-baseline-team",
          failureDomain: "effect-baseline-site",
          measuredAtTick: probe.observedAtTick
        };
        effect.perturbed = {
          schema: "perturbation-effect-count/v1",
          sampleSize: 100000,
          eventCount: target ? 40000 : 10000,
          sourceRoot: `${key}-perturbed-source`,
          controller: "effect-perturbed-team",
          failureDomain: "effect-perturbed-site",
          measuredAtTick: probe.observedAtTick
        };
      }
    }
  }
  exercise.perturbationMeasurementCommitment = { algorithm: "sha256", committedAtTick: 11, digest: "" };
  exercise.perturbationMeasurementCommitment.digest = computePerturbationMeasurementProtocolDigest(exercise);
  return exercise;
}
