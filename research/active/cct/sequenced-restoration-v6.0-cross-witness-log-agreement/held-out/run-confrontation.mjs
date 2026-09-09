import assert from "node:assert/strict";
import { assessTransparencyLogInclusion } from "../../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";
import { assessCrossWitnessLogAgreement } from "../runtime.mjs";
import { audit, axes, completeExercise, splitViewValidation, validAmendment } from "../fixtures.mjs";

const validation = splitViewValidation();
assert.equal(assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validation).status,
  "verified_preoutcome_log_inclusion_candidate");
assert.equal(assessCrossWitnessLogAgreement(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: a valid local inclusion receipt cannot survive disagreement between pinned witnesses");
