import test from "node:test";
import assert from "node:assert/strict";
import { assessTransparencyLogInclusion } from "../sequenced-restoration-v5.9-transparency-log-inclusion/runtime.mjs";
import { assessCrossWitnessLogAgreement, CctCrossWitnessLogAgreementRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, splitViewValidation, validAmendment, validValidation } from "./fixtures.mjs";

test("requires two pinned independent witnesses to attest the same pre-outcome tree head", () => {
  const result = assessCrossWitnessLogAgreement(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "cross_witness_log_agreement_candidate");
  assert.equal(result.witnessCount, 2);
});

test("a separately signed split view passes 5.9 but fails witness agreement", () => {
  const validation = splitViewValidation();
  assert.equal(assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validation).status,
    "verified_preoutcome_log_inclusion_candidate");
  assert.deepEqual(assessCrossWitnessLogAgreement(axes, audit, completeExercise(), validAmendment(), validation).failures,
    ["cross_witness_log_disagreement"]);
});

test("runtime blocks actions without cross-witness agreement", () => {
  const runtime = new CctCrossWitnessLogAgreementRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 20 } }, allowedActions: ["restore"] }),
    { message: /CCT_CROSS_WITNESS_LOG_AGREEMENT_UNESTABLISHED/ });
});
