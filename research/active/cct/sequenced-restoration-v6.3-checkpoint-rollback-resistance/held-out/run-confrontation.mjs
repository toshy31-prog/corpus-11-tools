import assert from "node:assert/strict";
import { assessGeneralLogConsistency } from "../../sequenced-restoration-v6.2-general-log-consistency/runtime.mjs";
import { assessCheckpointRollbackResistance } from "../runtime.mjs";
import { advancedCheckpointMemory, audit, axes, completeExercise, validAmendment, validValidation } from "../fixtures.mjs";

const replayed = validValidation();
assert.equal(assessGeneralLogConsistency(axes, audit, completeExercise(), validAmendment(), replayed).status,
  "general_append_only_log_consistency_candidate");
assert.equal(assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), replayed,
  advancedCheckpointMemory(replayed)).status, "not_established");
console.log("held-out confrontation: previously valid signed checkpoint rejected after the monotonic pin advanced");
