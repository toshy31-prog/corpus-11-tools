import test from "node:test";
import assert from "node:assert/strict";
import { assessContentAddressedLineage } from "../sequenced-restoration-v5.7-content-addressed-lineage/runtime.mjs";
import { assessIndependentPreoutcomeCustody, CctIndependentPreoutcomeCustodyRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, postCustodyRewrite, validAmendment, validValidation } from "./fixtures.mjs";

test("requires two independent valid signatures over the pre-outcome lineage bundle", () => {
  const result = assessIndependentPreoutcomeCustody(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "independently_custodied_preoutcome_lineage_candidate");
  assert.equal(result.custodianCount, 2);
});

test("a post-custody rewrite can pass content checks but invalidates custody", () => {
  const validation = postCustodyRewrite();
  assert.equal(assessContentAddressedLineage(axes, audit, completeExercise(), validAmendment(), validation).status,
    "content_addressed_target_lineage_candidate");
  assert.equal(assessIndependentPreoutcomeCustody(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "independent_preoutcome_custody_invalid");
});

test("runtime blocks actions without independent custody", () => {
  const runtime = new CctIndependentPreoutcomeCustodyRuntime(); runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 18 } }, allowedActions: ["restore"] }), { message: /CCT_INDEPENDENT_PREOUTCOME_CUSTODY_UNESTABLISHED/ });
});
