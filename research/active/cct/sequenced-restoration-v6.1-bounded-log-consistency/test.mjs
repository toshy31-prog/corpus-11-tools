import test from "node:test";
import assert from "node:assert/strict";
import { assessCrossWitnessLogAgreement } from "../sequenced-restoration-v6.0-cross-witness-log-agreement/runtime.mjs";
import { assessBoundedLogConsistency, CctBoundedLogConsistencyRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, rewrittenHistoryValidation, validAmendment, validValidation } from "./fixtures.mjs";

test("verifies a signed append-only extension from the witnessed size-2 head to size 3", () => {
  const result = assessBoundedLogConsistency(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "bounded_append_only_log_extension_candidate");
  assert.equal(result.previousTreeSize, 2);
  assert.equal(result.treeSize, 3);
});

test("a newly signed extension of a rewritten past passes 6.0 but fails 6.1", () => {
  const validation = rewrittenHistoryValidation();
  assert.equal(assessCrossWitnessLogAgreement(axes, audit, completeExercise(), validAmendment(), validation).status,
    "cross_witness_log_agreement_candidate");
  assert.deepEqual(assessBoundedLogConsistency(axes, audit, completeExercise(), validAmendment(), validation).failures,
    ["append_only_log_extension_invalid"]);
});

test("runtime blocks actions without a bounded consistency proof", () => {
  const runtime = new CctBoundedLogConsistencyRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 21 } }, allowedActions: ["restore"] }),
    { message: /CCT_BOUNDED_LOG_CONSISTENCY_UNESTABLISHED/ });
});
