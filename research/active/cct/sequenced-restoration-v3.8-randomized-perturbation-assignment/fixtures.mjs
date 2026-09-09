import { completeExercise as observedExercise, audit, axes } from "../sequenced-restoration-v3.7-observed-perturbation-effects/fixtures.mjs";
import { computeAssignmentProtocolDigest, computeSeedCommitment } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = observedExercise();
  for (const challenge of exercise.crossSignalPerturbations) {
    for (const probe of challenge.probes) {
      for (const effect of probe.effects) {
        const comparison = `${challenge.signalType}-${challenge.signal}-${probe.probeId}-${effect.signalType}-${effect.signal}`;
        const seedReveal = `assignment-seed-${comparison}`;
        effect.assignment = {
          method: "blocked_randomized",
          samplingFrameRoot: `sampling-frame-${comparison}`,
          blockCount: 100,
          plannedPerArm: 100000,
          actualBaselineAssigned: 100000,
          actualPerturbedAssigned: 100000,
          seedCommitment: computeSeedCommitment(seedReveal),
          seedReveal,
          controller: "assignment-team",
          failureDomain: "assignment-site",
          assignedAtTick: 10,
          seedRevealedAtTick: 11
        };
      }
    }
  }
  exercise.assignmentProtocolCommitment = { algorithm: "sha256", committedAtTick: 9, digest: "" };
  exercise.assignmentProtocolCommitment.digest = computeAssignmentProtocolDigest(exercise);
  return exercise;
}
