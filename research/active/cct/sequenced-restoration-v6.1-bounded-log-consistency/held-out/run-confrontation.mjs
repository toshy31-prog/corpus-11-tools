import assert from "node:assert/strict";
import { assessCrossWitnessLogAgreement } from "../../sequenced-restoration-v6.0-cross-witness-log-agreement/runtime.mjs";
import { assessBoundedLogConsistency } from "../runtime.mjs";
import { audit, axes, completeExercise, rewrittenHistoryValidation, validAmendment } from "../fixtures.mjs";

const validation = rewrittenHistoryValidation();
assert.equal(assessCrossWitnessLogAgreement(axes, audit, completeExercise(), validAmendment(), validation).status,
  "cross_witness_log_agreement_candidate");
assert.equal(assessBoundedLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: a newly signed checkpoint cannot extend a root different from the witnessed history");
