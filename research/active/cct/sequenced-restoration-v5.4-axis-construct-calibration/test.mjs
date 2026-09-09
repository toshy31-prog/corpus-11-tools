import test from "node:test";
import assert from "node:assert/strict";
import { assessAxisMembershipObservability } from "../sequenced-restoration-v5.3-axis-membership-observability/runtime.mjs";
import { assessAxisConstructCalibration, CctAxisConstructCalibrationRuntime } from "./runtime.mjs";
import { agreeingChannelsWithInvalidProxy, audit, axes, completeExercise, validAmendment, validValidation } from "./fixtures.mjs";

test("supports axis labels only for the calibrated reference scope", () => {
  const result = assessAxisConstructCalibration(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "axis_construct_supported_for_scope_candidate");
  assert.ok(result.results.every((item) => item.sensitivityLowerBound >= 0.75 && item.specificityLowerBound >= 0.75));
});

test("channel agreement cannot rescue a proxy contradicted by blind references", () => {
  const validation = agreeingChannelsWithInvalidProxy();
  assert.equal(assessAxisMembershipObservability(axes, audit, completeExercise(), validAmendment(), validation).status,
    "observable_axis_membership_admission_candidate");
  assert.equal(assessAxisConstructCalibration(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "axis_construct_proxy_substitution");
});

test("runtime blocks actions without calibrated construct evidence", () => {
  const runtime = new CctAxisConstructCalibrationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 14 } }, allowedActions: ["restore"] }), {
    message: /CCT_AXIS_CONSTRUCT_CALIBRATION_UNESTABLISHED/
  });
});
