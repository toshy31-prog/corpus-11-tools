import assert from "node:assert/strict";
import { assessIndependentPreoutcomeCustody } from "../../sequenced-restoration-v5.8-independent-preoutcome-custody/runtime.mjs";
import { assessTransparencyLogInclusion } from "../runtime.mjs";
import { audit, axes, completeExercise, tamperedInclusionProof, validAmendment } from "../fixtures.mjs";

const validation = tamperedInclusionProof();
assert.equal(assessIndependentPreoutcomeCustody(axes, audit, completeExercise(), validAmendment(), validation).status,
  "independently_custodied_preoutcome_lineage_candidate");
assert.equal(assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: custody alone cannot preserve status after a Merkle inclusion proof is altered");
