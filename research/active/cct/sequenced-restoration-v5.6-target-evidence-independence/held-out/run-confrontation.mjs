import assert from "node:assert/strict";
import { assessAxisCalibrationTransport } from "../../sequenced-restoration-v5.5-axis-calibration-transport/runtime.mjs";
import { assessTargetEvidenceIndependence } from "../runtime.mjs";
import { audit, axes, completeExercise, renamedButDependentTargets, validAmendment } from "../fixtures.mjs";

const validation = renamedButDependentTargets();
assert.equal(assessAxisCalibrationTransport(axes, audit, completeExercise(), validAmendment(), validation).status, "axis_calibration_transported_for_scope_candidate");
assert.equal(assessTargetEvidenceIndependence(axes, audit, completeExercise(), validAmendment(), validation).status, "not_established");
console.log("held-out confrontation: renamed contexts sharing data and generators count as dependent evidence");
