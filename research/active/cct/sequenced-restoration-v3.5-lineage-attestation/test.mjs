import test from "node:test";
import assert from "node:assert/strict";
import {
  assessAttestedPortfolioLineage,
  CctLineageAttestationRuntime,
  computeLineageAttestationProtocolDigest,
  validateLineageAttestationSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("two independent blind attestations per cluster can qualify lineage", () => {
  assert.equal(validateLineageAttestationSpec(), true);
  assert.deepEqual(assessAttestedPortfolioLineage(axes, audit, completeExercise()), {
    status: "bounded_attested_portfolio_lineage_candidate",
    failures: []
  });
});

test("duplicated evidence cannot masquerade as two attestations", () => {
  const exercise = completeExercise();
  const cluster = exercise.transportEvidence.pairMargins[0].trials[0].clusters[0];
  cluster.lineageAttestations[1].evidenceRoot = cluster.lineageAttestations[0].evidenceRoot;
  exercise.lineageAttestationCommitment.digest = computeLineageAttestationProtocolDigest(exercise);
  const result = assessAttestedPortfolioLineage(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "lineage_attestation_dependent");
});

test("an attestation that binds different roots is refused", () => {
  const exercise = completeExercise();
  const cluster = exercise.transportEvidence.classRisks[0].trials[0].clusters[0];
  cluster.lineageAttestations[0].boundRoots.eventRoot = "substituted-event-root";
  exercise.lineageAttestationCommitment.digest = computeLineageAttestationProtocolDigest(exercise);
  assert.equal(assessAttestedPortfolioLineage(axes, audit, exercise).failures[0].reason, "lineage_attestation_dependent");
});

test("runtime blocks when lineage attestation is unestablished", () => {
  const runtime = new CctLineageAttestationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 28 } }, allowedActions: ["bridge"] }), { message: "CCT_SIGNAL_LINEAGE_ATTESTATION_UNESTABLISHED" });
});
