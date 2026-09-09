import test from "node:test";
import assert from "node:assert/strict";
import { computeClusterLineageProtocolDigest } from "../sequenced-restoration-v3.3-cluster-lineage/runtime.mjs";
import {
  assessPortfolioLineageTransport,
  CctPortfolioLineageRuntime,
  computePortfolioLineageProtocolDigest,
  validatePortfolioLineageSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("a collision-free precommitted portfolio can qualify transport", () => {
  assert.equal(validatePortfolioLineageSpec(), true);
  assert.deepEqual(assessPortfolioLineageTransport(axes, audit, completeExercise()), {
    status: "bounded_portfolio_lineage_transport_candidate",
    failures: []
  });
});

test("one generator reused by a margin and a risk blocks the portfolio", () => {
  const exercise = completeExercise();
  const pairCluster = exercise.transportEvidence.pairMargins[0].trials[0].clusters[0];
  const riskCluster = exercise.transportEvidence.classRisks[0].trials[0].clusters[0];
  riskCluster.generatorRoot = pairCluster.generatorRoot;
  exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);
  exercise.portfolioLineageProtocolCommitment.digest = computePortfolioLineageProtocolDigest(exercise);
  const result = assessPortfolioLineageTransport(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "cross_signal_lineage_collision");
  assert.equal(result.failures[0].collisions[0].rootType, "generatorRoot");
});

test("runtime blocks when portfolio lineage is unestablished", () => {
  const runtime = new CctPortfolioLineageRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 27 } }, allowedActions: ["bridge"] }), { message: "CCT_SIGNAL_PORTFOLIO_LINEAGE_UNESTABLISHED" });
});
