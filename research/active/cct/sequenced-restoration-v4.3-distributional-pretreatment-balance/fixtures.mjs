import { completeExercise as placeboExercise, audit, axes } from "../sequenced-restoration-v4.2-pretreatment-placebos/fixtures.mjs";
import { computePretreatmentBalanceProtocolDigest } from "../sequenced-restoration-v4.1-pretreatment-balance/runtime.mjs";

export { audit, axes };

export function completeExercise() {
  return placeboExercise();
}

export function recommitPretreatmentBalance(exercise) {
  exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);
}
