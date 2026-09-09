import test from "node:test";
import assert from "node:assert/strict";
import { assessHeldOutExposureAdmission, CctHeldOutExposureAdmissionRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, validAmendment, validValidation } from "./fixtures.mjs";

test("admits only a future-campaign variable with precise held-out incremental value", () => {
  const result = assessHeldOutExposureAdmission(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "held_out_exposure_admission_candidate");
  assert.equal(result.admittedVariable, "housing_insecurity");
  assert.ok(result.lowerBound >= 0.01);
  assert.ok(result.detectableImprovement <= 0.02);
});

test("precommitment alone cannot admit a variable with no held-out gain", () => {
  const validation = validValidation();
  validation.observations.forEach((item) => { item.augmentedPrediction = item.baselinePrediction; });
  assert.equal(assessHeldOutExposureAdmission(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "held_out_incremental_value_unestablished");
});

test("validation evidence cannot reuse an attestation dependency", () => {
  const amendment = validAmendment();
  const validation = validValidation();
  validation.controller = amendment.attestations[0].controller;
  assert.deepEqual(assessHeldOutExposureAdmission(axes, audit, completeExercise(), amendment, validation), {
    status: "not_established", failures: ["held_out_admission_protocol_invalid"]
  });
});

test("runtime blocks actions without a valid held-out admission packet", () => {
  const runtime = new CctHeldOutExposureAdmissionRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 10 } }, allowedActions: ["restore"] }), {
    message: /CCT_HELD_OUT_EXPOSURE_ADMISSION_UNESTABLISHED/
  });
});
