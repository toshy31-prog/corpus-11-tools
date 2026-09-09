import test from "node:test";
import assert from "node:assert/strict";
import { assessGeneralLogConsistency } from "../sequenced-restoration-v6.2-general-log-consistency/runtime.mjs";
import { assessCheckpointRollbackResistance, CctCheckpointRollbackResistanceRuntime } from "./runtime.mjs";
import { advancedCheckpointMemory, audit, axes, completeExercise, initialCheckpointMemory, validAmendment, validValidation } from "./fixtures.mjs";

test("accepts a checkpoint extending the exactly pinned predecessor", () => {
  const validation = validValidation();
  const result = assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), validation, initialCheckpointMemory(validation));
  assert.equal(result.status, "checkpoint_rollback_resistance_candidate");
  assert.deepEqual([result.nextCheckpointMemory.treeSize, result.nextCheckpointMemory.rootHash],
    [validation.generalLogConsistencyProof.treeSize, validation.generalLogConsistencyProof.rootHash]);
});

test("rejects replay of an old but otherwise valid signed checkpoint", () => {
  const validation = validValidation();
  assert.equal(assessGeneralLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).status,
    "general_append_only_log_consistency_candidate");
  assert.deepEqual(assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), validation,
    advancedCheckpointMemory(validation)).failures, ["checkpoint_rollback_or_memory_gap"]);
});

test("rejects absent, reset, or divergent monotonic memory", () => {
  const validation = validValidation();
  const memory = initialCheckpointMemory(validation);
  for (const bad of [undefined, { ...memory, treeSize: 1 }, { ...memory, rootHash: "00".repeat(32) },
    { ...memory, recordedAtTick: validation.generalLogConsistencyProof.integratedAtTick }]) {
    assert.equal(assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), validation, bad).status,
      "not_established");
  }
});

test("runtime blocks an action when pinned memory is unavailable", () => {
  const runtime = new CctCheckpointRollbackResistanceRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 23 } }, allowedActions: ["restore"] }),
    { message: /CCT_CHECKPOINT_ROLLBACK_RESISTANCE_UNESTABLISHED/ });
});
