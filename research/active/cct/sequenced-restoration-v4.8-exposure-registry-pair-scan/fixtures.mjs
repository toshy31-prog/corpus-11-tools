import { completeExercise as sourceExercise, audit, axes } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/fixtures.mjs";

export { audit, axes };
export function completeExercise() {
  const exercise = sourceExercise();
  exercise.exposureRegistry = ["baseline_event_rate", "dependency_load", "access_loss"];
  return exercise;
}
