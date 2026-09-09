import test from "node:test";
import assert from "node:assert/strict";
import { assessIndependentPreoutcomeCustody } from "../sequenced-restoration-v5.8-independent-preoutcome-custody/runtime.mjs";
import { assessTransparencyLogInclusion, CctTransparencyLogInclusionRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, tamperedInclusionProof, validAmendment, validValidation } from "./fixtures.mjs";

test("verifies a pinned signed Merkle inclusion before outcome access", () => {
  const result = assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "verified_preoutcome_log_inclusion_candidate");
  assert.equal(result.treeSize, 2);
  assert.equal(result.integratedAtTick, 7);
});

test("a tampered proof still passes custody but loses logged-inclusion status", () => {
  const validation = tamperedInclusionProof();
  assert.equal(assessIndependentPreoutcomeCustody(axes, audit, completeExercise(), validAmendment(), validation).status,
    "independently_custodied_preoutcome_lineage_candidate");
  assert.deepEqual(assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validation).failures,
    ["transparency_log_receipt_invalid"]);
});

test("rejects a receipt integrated after outcome access", () => {
  const validation = validValidation();
  validation.transparencyLogReceipt.integratedAtTick = validation.outcomesAccessedAtTick;
  assert.deepEqual(assessTransparencyLogInclusion(axes, audit, completeExercise(), validAmendment(), validation).failures,
    ["transparency_log_receipt_invalid"]);
});

test("runtime blocks actions without a verified log receipt", () => {
  const runtime = new CctTransparencyLogInclusionRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 19 } }, allowedActions: ["restore"] }),
    { message: /CCT_TRANSPARENCY_LOG_INCLUSION_UNESTABLISHED/ });
});
