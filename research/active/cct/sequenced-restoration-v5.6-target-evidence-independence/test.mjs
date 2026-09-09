import test from "node:test";
import assert from "node:assert/strict";
import { assessAxisCalibrationTransport } from "../sequenced-restoration-v5.5-axis-calibration-transport/runtime.mjs";
import { assessTargetEvidenceIndependence, CctTargetEvidenceIndependenceRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, renamedButDependentTargets, validAmendment, validValidation } from "./fixtures.mjs";

test("counts target support only when material lineage and samples are disjoint", () => {
  assert.deepEqual(assessTargetEvidenceIndependence(axes, audit, completeExercise(), validAmendment(), validValidation()), {
    status: "materially_independent_target_evidence_candidate", independentTargetCount: 2, dependenceEdges: [], failures: []
  });
});

test("renamed target contexts cannot multiply shared evidence", () => {
  const validation = renamedButDependentTargets();
  assert.equal(assessAxisCalibrationTransport(axes, audit, completeExercise(), validAmendment(), validation).status,
    "axis_calibration_transported_for_scope_candidate");
  const result = assessTargetEvidenceIndependence(axes, audit, completeExercise(), validAmendment(), validation);
  assert.equal(result.failures[0], "target_evidence_substantially_dependent");
  assert.ok(result.dependenceEdges[0].sharedSampleCount > 0);
});

test("runtime blocks actions without independent target evidence", () => {
  const runtime = new CctTargetEvidenceIndependenceRuntime(); runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 16 } }, allowedActions: ["restore"] }), { message: /CCT_TARGET_EVIDENCE_INDEPENDENCE_UNESTABLISHED/ });
});
