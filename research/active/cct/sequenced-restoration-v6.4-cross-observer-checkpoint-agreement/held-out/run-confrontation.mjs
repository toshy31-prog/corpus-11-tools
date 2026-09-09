import assert from "node:assert/strict";
import { assessCheckpointRollbackResistance } from "../../sequenced-restoration-v6.3-checkpoint-rollback-resistance/runtime.mjs";
import { assessCrossObserverCheckpointAgreement } from "../runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, partitionedStatements, validAmendment, validValidation } from "../fixtures.mjs";

const validation = validValidation(); const memory = initialCheckpointMemory(validation);
assert.equal(assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), validation, memory).status,
  "checkpoint_rollback_resistance_candidate");
assert.equal(assessCrossObserverCheckpointAgreement(axes, audit, completeExercise(), validAmendment(), validation, memory,
  partitionedStatements(memory)).status, "not_established");
console.log("held-out confrontation: incompatible signed observer pins block action despite a valid local monotonic extension");
