import test from "node:test";
import assert from "node:assert/strict";
import { assessDistributionalPretreatmentPlacebos } from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/runtime.mjs";
import { assessThresholdSensitivity, CctThresholdSensitivityRuntime, validateThresholdSensitivitySpec } from "./runtime.mjs";
import { audit, axes, completeExercise, hideDifferenceBelowChosenThreshold } from "./fixtures.mjs";

test("a precommitted threshold grid can qualify every placebo slice", () => {
  assert.equal(validateThresholdSensitivitySpec(), true);
  assert.deepEqual(assessThresholdSensitivity(axes, audit, completeExercise()), {
    status: "bounded_threshold_sensitivity_candidate",
    failures: []
  });
});

test("a difference just below the former threshold is exposed", () => {
  const exercise = completeExercise();
  hideDifferenceBelowChosenThreshold(exercise);
  assert.equal(assessDistributionalPretreatmentPlacebos(axes, audit, exercise).status, "bounded_distributional_pretreatment_placebo_candidate");
  const result = assessThresholdSensitivity(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "threshold_sensitive_placebo_difference");
  assert.match(result.failures[0].group, /dependency_at_least_0\.1/);
});

test("runtime blocks when threshold sensitivity is unestablished", () => {
  const runtime = new CctThresholdSensitivityRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), {
    message: "CCT_THRESHOLD_SENSITIVITY_UNESTABLISHED"
  });
});
