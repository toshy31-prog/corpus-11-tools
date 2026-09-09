import test from "node:test";
import assert from "node:assert/strict";
import { assessHeldOutExposureAdmission } from "../sequenced-restoration-v5.0-held-out-exposure-admission/runtime.mjs";
import { assessDebtAxisNondegradation, CctDebtAxisNondegradationRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, validAmendment, validValidation } from "./fixtures.mjs";

test("requires precise nondegradation on every open debt axis", () => {
  const result = assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "debt_axis_nondegradation_admission_candidate");
  assert.deepEqual(result.axisResults.map((item) => item.axis), [...axes].sort());
});

test("rejects aggregate gain that conceals degradation on one debt axis", () => {
  const validation = validValidation();
  validation.observations.forEach((item) => {
    if (item.debtAxis === "droits") item.augmentedPrediction = item.outcome ? 0.5472307431 : 0.4527692569;
    else item.augmentedPrediction = item.outcome ? 0.4940357853 : 0.5059642147;
  });
  assert.equal(assessHeldOutExposureAdmission(axes, audit, completeExercise(), validAmendment(), validation).status,
    "held_out_exposure_admission_candidate");
  assert.equal(assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "debt_axis_nondegradation_unestablished");
});

test("missing an open debt axis invalidates coverage", () => {
  const validation = validValidation();
  validation.observations.forEach((item) => { item.debtAxis = axes[0]; });
  assert.equal(assessDebtAxisNondegradation(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "debt_axis_coverage_invalid");
});

test("runtime blocks actions without a complete axis packet", () => {
  const runtime = new CctDebtAxisNondegradationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 11 } }, allowedActions: ["restore"] }), {
    message: /CCT_DEBT_AXIS_NONDEGRADATION_UNESTABLISHED/
  });
});
