import test from "node:test";
import assert from "node:assert/strict";
import {
  assessClusterAwareTransport,
  CctClusterAwareTransportRuntime,
  computeClusterProtocolDigest,
  validateClusterAwareTransportSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("precommitted independent clusters can qualify transported signals", () => {
  assert.equal(validateClusterAwareTransportSpec(), true);
  assert.deepEqual(assessClusterAwareTransport(axes, audit, completeExercise()), {
    status: "bounded_cluster_aware_transport_candidate",
    failures: []
  });
});

test("a huge aggregate from one cluster cannot establish precision", () => {
  const exercise = completeExercise();
  const trial = exercise.transportEvidence.classRisks[0].trials[0];
  trial.clusters = [{
    clusterId: `${trial.contextId}-single-cluster`,
    sampleSize: trial.sampleSize,
    failureCount: trial.failureCount
  }];
  exercise.clusterProtocolCommitment.digest = computeClusterProtocolDigest(exercise);
  const result = assessClusterAwareTransport(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "cluster_structure_invalid");
});

test("cluster counts must reconcile with the aggregate evidence", () => {
  const exercise = completeExercise();
  exercise.transportEvidence.pairMargins[0].trials[0].clusters[0].candidateAllAxesProtectedCount -= 1;
  const result = assessClusterAwareTransport(axes, audit, exercise);
  assert.equal(result.failures[0].reason, "cluster_structure_invalid");
});

test("runtime blocks when cluster independence is unestablished", () => {
  const runtime = new CctClusterAwareTransportRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 25 } }, allowedActions: ["bridge"] }), { message: "CCT_SIGNAL_TRANSPORT_CLUSTER_INDEPENDENCE_UNESTABLISHED" });
});
