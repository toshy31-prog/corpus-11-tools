import test from "node:test";
import assert from "node:assert/strict";
import { computeClusterInterferenceProtocolDigest } from "../sequenced-restoration-v3.9-cluster-interference/runtime.mjs";
import {
  assessReproducibleClusterRandomization,
  CctReproducibleClusterRandomizationRuntime,
  validateReproducibleClusterRandomizationSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("cluster arms reproduced from committed seeds can qualify", () => {
  assert.equal(validateReproducibleClusterRandomizationSpec(), true);
  assert.deepEqual(assessReproducibleClusterRandomization(axes, audit, completeExercise()), {
    status: "bounded_reproducible_cluster_randomization_candidate",
    failures: []
  });
});

test("a balanced manual arm swap is detected", () => {
  const exercise = completeExercise();
  const clusters = exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters;
  const baseline = clusters.find((cluster) => cluster.arm === "baseline");
  const perturbed = clusters.find((cluster) => cluster.arm === "perturbed" && cluster.stratum !== baseline.stratum);
  [baseline.arm, perturbed.arm] = [perturbed.arm, baseline.arm];
  exercise.clusterInterferenceCommitment.digest = computeClusterInterferenceProtocolDigest(exercise);
  const result = assessReproducibleClusterRandomization(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "cluster_assignment_not_reproducible");
});

test("a substituted seed reveal is refused", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].clusterRandomization.seedReveal = "substituted-seed";
  assert.equal(assessReproducibleClusterRandomization(axes, audit, exercise).failures[0].reason, "cluster_assignment_not_reproducible");
});

test("runtime blocks when cluster randomization is unreproducible", () => {
  const runtime = new CctReproducibleClusterRandomizationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 33 } }, allowedActions: ["bridge"] }), { message: "CCT_CLUSTER_RANDOMIZATION_UNREPRODUCIBLE" });
});
