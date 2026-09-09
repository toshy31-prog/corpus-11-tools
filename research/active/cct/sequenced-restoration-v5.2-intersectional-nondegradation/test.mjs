import test from "node:test";
import assert from "node:assert/strict";
import { assessDebtAxisNondegradation } from "../sequenced-restoration-v5.1-debt-axis-nondegradation/runtime.mjs";
import { assessIntersectionalNondegradation, CctIntersectionalNondegradationRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, marginalPassIntersectionFailure, validAmendment, validValidation } from "./fixtures.mjs";

test("requires precise nondegradation on every registered pairwise intersection", () => {
  const result = assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "intersectional_nondegradation_admission_candidate");
  assert.equal(result.intersectionResults.length, 1);
});

test("rejects intersectional harm hidden by passing marginal axes", () => {
  const validation = marginalPassIntersectionFailure();
  assert.equal(assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validation).status,
    "debt_axis_nondegradation_admission_candidate");
  assert.equal(assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "intersectional_nondegradation_unestablished");
});

test("the pairwise registry must exhaust the open axes", () => {
  const validation = validValidation();
  validation.intersectionRegistry = [];
  assert.equal(assessIntersectionalNondegradation(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "intersection_registry_invalid");
});

test("runtime blocks actions without an intersectional packet", () => {
  const runtime = new CctIntersectionalNondegradationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 12 } }, allowedActions: ["restore"] }), {
    message: /CCT_INTERSECTIONAL_NONDEGRADATION_UNESTABLISHED/
  });
});
