import { completeExercise as balancedExercise, audit, axes } from "../sequenced-restoration-v4.1-pretreatment-balance/fixtures.mjs";
import { computePretreatmentPlaceboProtocolDigest } from "./runtime.mjs";

export { audit, axes };

const OUTCOMES = ["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"];

export function completeExercise() {
  const exercise = balancedExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      probe.pretreatmentPlacebos = OUTCOMES.map((outcome, index) => ({
        outcome,
        baseline: {
          schema: "pretreatment-placebo-count/v1", sampleSize: 100000, eventCount: 10000 * (index + 1),
          sourceRoot: `${probe.probeId}-${outcome}-baseline-source`, controller: "placebo-baseline-team",
          failureDomain: "placebo-baseline-site", measuredAtTick: 4, blindToFutureAssignment: true
        },
        perturbed: {
          schema: "pretreatment-placebo-count/v1", sampleSize: 100000, eventCount: 10000 * (index + 1),
          sourceRoot: `${probe.probeId}-${outcome}-perturbed-source`, controller: "placebo-perturbed-team",
          failureDomain: "placebo-perturbed-site", measuredAtTick: 4, blindToFutureAssignment: true
        }
      }));
    }
  }
  exercise.pretreatmentPlaceboCommitment = { algorithm: "sha256", committedAtTick: 3, digest: "" };
  exercise.pretreatmentPlaceboCommitment.digest = computePretreatmentPlaceboProtocolDigest(exercise);
  return exercise;
}
