import assert from "node:assert/strict";
import { assessIntersectionalNondegradation } from "../../sequenced-restoration-v5.2-intersectional-nondegradation/runtime.mjs";
import { assessAxisMembershipObservability } from "../runtime.mjs";
import { audit, axes, concealedIntersectionMembership, completeExercise, validAmendment } from "../fixtures.mjs";

const validation = concealedIntersectionMembership();
assert.equal(assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status,
  "intersectional_nondegradation_admission_candidate");
assert.equal(assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: an apparently safe intersection cannot rely on labels contradicted by independent membership channels");
