import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.1-debt-axis-nondegradation/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

export function validValidation() {
  const validation = sourceValidation();
  validation.intersectionRegistry = [[...axes].sort()];
  validation.observations.forEach((item, index) => { item.debtAxes = index < 10 ? [...axes] : [item.debtAxis]; });
  return validation;
}

export function marginalPassIntersectionFailure() {
  const validation = validValidation();
  validation.observations.forEach((item, index) => {
    if (index < 10) item.augmentedPrediction = item.outcome ? 0.4940357853 : 0.5059642147;
    else item.augmentedPrediction = item.outcome ? 0.5472307431 : 0.4527692569;
  });
  return validation;
}
