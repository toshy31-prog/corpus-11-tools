import assert from "node:assert/strict";
import { assessContentAddressedLineage } from "../../sequenced-restoration-v5.7-content-addressed-lineage/runtime.mjs";
import { assessIndependentPreoutcomeCustody } from "../runtime.mjs";
import { audit, axes, completeExercise, postCustodyRewrite, validAmendment } from "../fixtures.mjs";

const validation = postCustodyRewrite();
assert.equal(assessContentAddressedLineage(axes, audit, completeExercise(), validAmendment(), validation).status, "content_addressed_target_lineage_candidate");
assert.equal(assessIndependentPreoutcomeCustody(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: a lineage bundle rewritten after independent signatures cannot retain custody status");
