import assert from "node:assert/strict";
import { assessCrossObserverCheckpointAgreement } from "../../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/runtime.mjs";
import { assessIntersectingObserverQuorum } from "../runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, observerRegistry, quorum, validAmendment, validValidation } from "../fixtures.mjs";

const validation = validValidation(); const memory = initialCheckpointMemory(validation);
for (const pair of [quorum(memory, [0, 1]), quorum(memory, [2, 3])]) {
  const base = [axes, audit, completeExercise(), validAmendment(), validation, memory];
  assert.equal(assessCrossObserverCheckpointAgreement(...base, pair).status, "cross_observer_checkpoint_agreement_candidate");
  assert.equal(assessIntersectingObserverQuorum(...base, pair, observerRegistry()).status, "not_established");
}
console.log("held-out confrontation: two disjoint silent-partition pairs pass 6.4 separately but neither reaches the 3-of-4 quorum");
