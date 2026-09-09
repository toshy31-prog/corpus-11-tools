import test from "node:test";
import assert from "node:assert/strict";
import { assessJointObserverRegistryTransition, CctJointObserverRegistryTransitionRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, transitionFixture, validAmendment, validValidation } from "./fixtures.mjs";

function assess(intersecting) { const validation = validValidation(); const memory = initialCheckpointMemory(validation);
  const t = transitionFixture(memory, intersecting); return assessJointObserverRegistryTransition(axes, audit, completeExercise(),
    validAmendment(), validation, memory, t.oldStatements, t.oldRegistry, t.newStatements, t.newRegistry); }
test("accepts joint old and new quorums with two shared signers", () => {
  const result = assess(true); assert.equal(result.status, "joint_observer_registry_transition_candidate");
  assert.deepEqual(result.sharedSigners, ["observer-c", "observer-d"]);
});
test("refuses individually valid quorums without two shared signers", () => {
  assert.deepEqual(assess(false).failures, ["joint_registry_signer_intersection_insufficient"]);
});
test("runtime blocks a registry replacement without joint evidence", () => {
  const runtime = new CctJointObserverRegistryTransitionRuntime(); runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 26 } }, allowedActions: ["restore"] }),
    { message: /CCT_JOINT_OBSERVER_REGISTRY_TRANSITION_UNESTABLISHED/ });
});
