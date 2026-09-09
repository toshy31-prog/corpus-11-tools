import test from "node:test";
import assert from "node:assert/strict";
import {
  assessClusterLineageTransport,
  CctClusterLineageRuntime,
  computeClusterLineageProtocolDigest,
  validateClusterLineageSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("precommitted distinct cluster lineages can qualify transport", () => {
  assert.equal(validateClusterLineageSpec(), true);
  assert.deepEqual(assessClusterLineageTransport(axes, audit, completeExercise()), {
    status: "bounded_cluster_lineage_transport_candidate",
    failures: []
  });
});

test("renamed clusters sharing one generator root remain dependent", () => {
  const exercise = completeExercise();
  const record = exercise.transportEvidence.pairMargins[0];
  for (const trial of record.trials) for (const cluster of trial.clusters) cluster.generatorRoot = "shared-generator";
  exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);
  const result = assessClusterLineageTransport(axes, audit, exercise);
  assert.deepEqual(result.failures, [{ signalType: "pair_margin", signal: record.pair.join("+"), reason: "cluster_lineage_dependent" }]);
});

test("one controller cannot dominate a target context", () => {
  const exercise = completeExercise();
  const record = exercise.transportEvidence.classRisks[0];
  for (const cluster of record.trials[0].clusters) cluster.controller = "single-controller";
  exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);
  assert.equal(assessClusterLineageTransport(axes, audit, exercise).failures[0].reason, "cluster_lineage_dependent");
});

test("runtime blocks when cluster lineage is unestablished", () => {
  const runtime = new CctClusterLineageRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 26 } }, allowedActions: ["bridge"] }), { message: "CCT_SIGNAL_TRANSPORT_CLUSTER_LINEAGE_UNESTABLISHED" });
});
