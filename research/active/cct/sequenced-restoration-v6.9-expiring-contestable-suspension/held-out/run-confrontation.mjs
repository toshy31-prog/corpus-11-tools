import assert from "node:assert/strict";
import { assessExpiringContestableSuspension } from "../runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation } from "../fixtures.mjs";
const validation = validValidation(); const memory = initialCheckpointMemory(validation); const transition = transitionFixture(memory, true); const selectors = selectorRegistry();
const suspension = suspensionFixture(transition, validation); const endorsements = suspensionEndorsements(suspension, selectors);
const result = assessExpiringContestableSuspension(axes, audit, completeExercise(), validAmendment(), validation, memory, transition, selectors, validEndorsements(transition), suspension, endorsements, [suspension.incidentDigest]);
assert.equal(result.status, "not_established");
console.log("held-out confrontation: the same allegation cannot renew a temporary suspension into de facto revocation");
