import assert from "node:assert/strict";
import { assessAxisConstructCalibration } from "../../sequenced-restoration-v5.4-axis-construct-calibration/runtime.mjs";
import { assessAxisCalibrationTransport } from "../runtime.mjs";
import { audit, axes, completeExercise, localSuccessTargetFailure, validAmendment } from "../fixtures.mjs";

const validation = localSuccessTargetFailure();
assert.equal(assessAxisConstructCalibration(axes, audit, completeExercise(), validAmendment(), validation).status, "axis_construct_supported_for_scope_candidate");
assert.equal(assessAxisCalibrationTransport(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: source calibration cannot override a failed target re-observation");
