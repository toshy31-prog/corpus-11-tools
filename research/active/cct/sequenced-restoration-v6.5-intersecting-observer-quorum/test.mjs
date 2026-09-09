import test from "node:test";
import assert from "node:assert/strict";
import { assessCrossObserverCheckpointAgreement } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/runtime.mjs";
import { assessIntersectingObserverQuorum, CctIntersectingObserverQuorumRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, observerRegistry, quorum, validAmendment, validValidation } from "./fixtures.mjs";

const args = (validation, memory) => [axes, audit, completeExercise(), validAmendment(), validation, memory];
test("accepts three registered independent observers and states the minimum intersection", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation);
  const result = assessIntersectingObserverQuorum(...args(validation, memory), quorum(memory, [0, 1, 2]), observerRegistry());
  assert.equal(result.status, "intersecting_observer_quorum_candidate"); assert.equal(result.intersectionGuarantee, 2);
});
test("refuses a two-observer branch that 6.4 accepts", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation); const pair = quorum(memory, [0, 1]);
  assert.equal(assessCrossObserverCheckpointAgreement(...args(validation, memory), pair).status,
    "cross_observer_checkpoint_agreement_candidate");
  assert.deepEqual(assessIntersectingObserverQuorum(...args(validation, memory), pair, observerRegistry()).failures,
    ["intersecting_observer_quorum_missing"]);
});
test("refuses an unregistered replacement even with a valid signature", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation); const statements = quorum(memory, [0, 1, 2]);
  const registry = observerRegistry(); registry[2] = { ...registry[2], controller: "substituted-controller" };
  assert.deepEqual(assessIntersectingObserverQuorum(...args(validation, memory), statements, registry).failures,
    ["intersecting_observer_registry_invalid"]);
});
test("runtime blocks an action without an intersecting quorum", () => {
  const runtime = new CctIntersectingObserverQuorumRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 25 } }, allowedActions: ["restore"] }),
    { message: /CCT_INTERSECTING_OBSERVER_QUORUM_UNESTABLISHED/ });
});
