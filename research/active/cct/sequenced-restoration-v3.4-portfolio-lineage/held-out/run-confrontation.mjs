import assert from "node:assert/strict";
import { computeClusterLineageProtocolDigest } from "../../sequenced-restoration-v3.3-cluster-lineage/runtime.mjs";
import { assessPortfolioLineageTransport, computePortfolioLineageProtocolDigest } from "../runtime.mjs";
import { audit, axes, completeExercise } from "../fixtures.mjs";

const exercise = completeExercise();
const pairCluster = exercise.transportEvidence.pairMargins[0].trials[0].clusters[0];
const riskCluster = exercise.transportEvidence.classRisks[0].trials[0].clusters[0];
riskCluster.eventRoot = pairCluster.eventRoot;
exercise.clusterLineageProtocolCommitment.digest = computeClusterLineageProtocolDigest(exercise);
exercise.portfolioLineageProtocolCommitment.digest = computePortfolioLineageProtocolDigest(exercise);

const result = assessPortfolioLineageTransport(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.equal(result.failures[0].reason, "cross_signal_lineage_collision");
console.log("held-out confrontation: one event reused across two signals blocks the adaptive portfolio");
