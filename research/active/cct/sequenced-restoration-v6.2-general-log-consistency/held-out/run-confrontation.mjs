import assert from "node:assert/strict";
import { assessBoundedLogConsistency } from "../../sequenced-restoration-v6.1-bounded-log-consistency/runtime.mjs";
import { assessGeneralLogConsistency } from "../runtime.mjs";
import { audit, axes, completeExercise, inconsistentPrefixValidation, validAmendment } from "../fixtures.mjs";

const validation = inconsistentPrefixValidation();
assert.equal(assessBoundedLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).status,
  "bounded_append_only_log_extension_candidate");
assert.equal(assessGeneralLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: signed checkpoint rejected because its arbitrary-size consistency path does not preserve the prefix");
