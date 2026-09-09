import { audit, axes, completeExercise, validAmendment, validValidation as sourceValidation } from "../sequenced-restoration-v5.0-held-out-exposure-admission/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

export function validValidation() {
  const validation = sourceValidation();
  validation.observations.forEach((item, index) => { item.debtAxis = axes[index % axes.length]; });
  return validation;
}
