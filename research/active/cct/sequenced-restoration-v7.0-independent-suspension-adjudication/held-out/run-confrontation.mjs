import assert from "node:assert/strict";
import { assessIndependentSuspensionAdjudication } from "../runtime.mjs";
import { adjudicationFixture, adjudicationVotes, adjudicatorRegistry, audit, axes, completeExercise, initialCheckpointMemory, selectorRegistry, suspensionEndorsements, suspensionFixture, transitionFixture, validAmendment, validEndorsements, validValidation } from "../fixtures.mjs";
const validation = validValidation(), memory = initialCheckpointMemory(validation), transition = transitionFixture(memory, true), selectors = selectorRegistry(), suspension = suspensionFixture(transition, validation);
const decision = adjudicationFixture(suspension, "suspension-abusive", { repairReceipt: "" });
const result = assessIndependentSuspensionAdjudication(axes, audit, completeExercise(), validAmendment(), validation, memory, transition, selectors, validEndorsements(transition), suspension, suspensionEndorsements(suspension, selectors), [], adjudicatorRegistry(), decision, adjudicationVotes(decision));
assert.equal(result.status, "not_established"); console.log("held-out confrontation: an abuse finding cannot close without a committed repair receipt");
