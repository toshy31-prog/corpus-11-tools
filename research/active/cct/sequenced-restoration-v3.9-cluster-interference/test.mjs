import test from "node:test";
import assert from "node:assert/strict";
import {
  assessClusterInterference,
  CctClusterInterferenceRuntime,
  validateClusterInterferenceSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("balanced cluster assignment with bounded cross-arm exposure can qualify", () => {
  assert.equal(validateClusterInterferenceSpec(), true);
  assert.deepEqual(assessClusterInterference(axes, audit, completeExercise()), {
    status: "bounded_cluster_interference_candidate",
    failures: []
  });
});

test("cross-arm exposure above the precommitted limit blocks the probe", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters[0].crossArmExposureCount = 1000;
  const result = assessClusterInterference(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "cluster_interference_or_reconciliation_invalid");
});

test("cluster membership must reconcile with every effect arm", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters[0].memberCount = 4000;
  assert.equal(assessClusterInterference(axes, audit, exercise).failures[0], "invalid_cluster_interference_protocol");
});

test("runtime blocks when interference remains unresolved", () => {
  const runtime = new CctClusterInterferenceRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 32 } }, allowedActions: ["bridge"] }), { message: "CCT_PERTURBATION_INTERFERENCE_UNRESOLVED" });
});
