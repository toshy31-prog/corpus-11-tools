import test from "node:test";
import assert from "node:assert/strict";
import { assessCheckpointRollbackResistance } from "../sequenced-restoration-v6.3-checkpoint-rollback-resistance/runtime.mjs";
import { assessCrossObserverCheckpointAgreement, CctCrossObserverCheckpointAgreementRuntime } from "./runtime.mjs";
import { agreeingStatements, audit, axes, commonControllerStatements, completeExercise, initialCheckpointMemory, partitionedStatements, validAmendment, validValidation } from "./fixtures.mjs";

function assess(validation, memory, statements) {
  return assessCrossObserverCheckpointAgreement(axes, audit, completeExercise(), validAmendment(), validation, memory, statements);
}

test("accepts two signed matching pins from independent control and failure domains", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation);
  assert.equal(assess(validation, memory, agreeingStatements(memory)).status, "cross_observer_checkpoint_agreement_candidate");
});

test("a partitioned view passes the local monotonic check but is refused", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation);
  assert.equal(assessCheckpointRollbackResistance(axes, audit, completeExercise(), validAmendment(), validation, memory).status,
    "checkpoint_rollback_resistance_candidate");
  assert.deepEqual(assess(validation, memory, partitionedStatements(memory)).failures, ["cross_observer_checkpoint_divergence"]);
});

test("refuses missing quorum, common control, and invalid signature", () => {
  const validation = validValidation(); const memory = initialCheckpointMemory(validation); const good = agreeingStatements(memory);
  const shared = commonControllerStatements(memory);
  const corrupt = good.map((item, index) => index ? { ...item, signature: "AA==" } : item);
  assert.deepEqual(assess(validation, memory, shared).failures, ["cross_observer_checkpoint_divergence"]);
  for (const statements of [[good[0]], corrupt]) assert.equal(assess(validation, memory, statements).status, "not_established");
});

test("runtime blocks actions when observer agreement is absent", () => {
  const runtime = new CctCrossObserverCheckpointAgreementRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 24 } }, allowedActions: ["restore"] }),
    { message: /CCT_CROSS_OBSERVER_CHECKPOINT_AGREEMENT_UNESTABLISHED/ });
});
