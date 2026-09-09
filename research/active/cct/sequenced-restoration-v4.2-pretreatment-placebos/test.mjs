import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPretreatmentPlacebos,
  CctPretreatmentPlaceboRuntime,
  validatePretreatmentPlaceboSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("bounded blinded pre-treatment placebos can qualify comparability", () => {
  assert.equal(validatePretreatmentPlaceboSpec(), true);
  assert.deepEqual(assessPretreatmentPlacebos(axes, audit, completeExercise()), {
    status: "bounded_pretreatment_placebo_candidate",
    failures: []
  });
});

test("a pre-treatment placebo difference blocks an otherwise balanced probe", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].pretreatmentPlacebos[0].perturbed.eventCount = 20000;
  const result = assessPretreatmentPlacebos(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "pretreatment_placebo_difference_detected");
});

test("measurement after assignment is not a pre-treatment placebo", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].pretreatmentPlacebos[0].baseline.measuredAtTick = 8;
  assert.equal(assessPretreatmentPlacebos(axes, audit, exercise).failures[0], "invalid_pretreatment_placebo_protocol");
});

test("runtime blocks when placebo balance is unestablished", () => {
  const runtime = new CctPretreatmentPlaceboRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), { message: "CCT_PRETREATMENT_PLACEBO_BALANCE_UNESTABLISHED" });
});
