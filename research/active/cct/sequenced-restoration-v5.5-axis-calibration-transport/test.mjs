import test from "node:test";
import assert from "node:assert/strict";
import { assessAxisConstructCalibration } from "../sequenced-restoration-v5.4-axis-construct-calibration/runtime.mjs";
import { assessAxisCalibrationTransport, CctAxisCalibrationTransportRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, localSuccessTargetFailure, validAmendment, validValidation } from "./fixtures.mjs";

test("transports calibration only across explicitly distinct re-observed target contexts", () => {
  const result = assessAxisCalibrationTransport(axes, audit, completeExercise(), validAmendment(), validValidation());
  assert.equal(result.status, "axis_calibration_transported_for_scope_candidate");
  assert.equal(result.results.length, axes.length * 2);
});

test("local construct calibration cannot override failure in a target context", () => {
  const validation = localSuccessTargetFailure();
  assert.equal(assessAxisConstructCalibration(axes, audit, completeExercise(), validAmendment(), validation).status,
    "axis_construct_supported_for_scope_candidate");
  assert.equal(assessAxisCalibrationTransport(axes, audit, completeExercise(), validAmendment(), validation).failures[0],
    "axis_calibration_not_transportable");
});

test("runtime blocks actions without target transport evidence", () => {
  const runtime = new CctAxisCalibrationTransportRuntime(); runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 15 } }, allowedActions: ["restore"] }), { message: /CCT_AXIS_CALIBRATION_TRANSPORT_UNESTABLISHED/ });
});
