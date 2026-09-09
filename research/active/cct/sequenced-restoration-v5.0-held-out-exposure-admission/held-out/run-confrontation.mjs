import assert from "node:assert/strict";
import { assessRegistryAmendment } from "../../sequenced-restoration-v4.9-exposure-registry-amendment/runtime.mjs";
import { assessHeldOutExposureAdmission } from "../runtime.mjs";
import { audit, axes, completeExercise, validAmendment, validValidation } from "../fixtures.mjs";

const amendment = validAmendment();
assert.equal(assessRegistryAmendment(axes, audit, completeExercise(), amendment).status,
  "precommitted_future_registry_amendment_candidate");
const validation = validValidation();
validation.observations.forEach((item) => { item.augmentedPrediction = item.baselinePrediction; });
assert.equal(assessHeldOutExposureAdmission(axes, audit, completeExercise(), amendment, validation).status, "not_established");
console.log("held-out confrontation: a valid precommitment without incremental held-out value cannot admit an exposure");
