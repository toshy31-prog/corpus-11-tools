import assert from "node:assert/strict";
import { assessHeldOutExposureAdmission } from "../../sequenced-restoration-v5.0-held-out-exposure-admission/runtime.mjs";
import { assessDebtAxisNondegradation } from "../runtime.mjs";
import { audit, axes, completeExercise, validAmendment, validValidation } from "../fixtures.mjs";

const validation = validValidation();
validation.observations.forEach((item) => {
  if (item.debtAxis === "droits") item.augmentedPrediction = item.outcome ? 0.5472307431 : 0.4527692569;
  else item.augmentedPrediction = item.outcome ? 0.4940357853 : 0.5059642147;
});
assert.equal(assessHeldOutExposureAdmission(axes, audit, completeExercise(), validAmendment(), validation).status,
  "held_out_exposure_admission_candidate");
assert.equal(assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: aggregate predictive gain cannot conceal degradation on an open debt axis");
