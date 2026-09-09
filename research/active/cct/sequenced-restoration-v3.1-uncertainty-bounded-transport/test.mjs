import test from "node:test";
import assert from "node:assert/strict";
import { computeTransportProtocolDigest } from "../sequenced-restoration-v3.0-held-out-signal-transport/runtime.mjs";
import {
  assessUncertaintyBoundedTransport,
  CctUncertaintyBoundedTransportRuntime,
  computeUncertaintyProtocolDigest,
  validateUncertaintyBoundedTransportSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

function qualifiedExercise() {
  return completeExercise();
}

test("precommitted simultaneous intervals can qualify precise transported signals", () => {
  assert.equal(validateUncertaintyBoundedTransportSpec(), true);
  assert.deepEqual(assessUncertaintyBoundedTransport(axes, audit, qualifiedExercise()), {
    status: "bounded_uncertainty_qualified_transport_candidate",
    failures: []
  });
});

test("a point estimate inside tolerance is refused when its interval crosses the limit", () => {
  const exercise = qualifiedExercise();
  const trial = exercise.transportEvidence.pairMargins.find((record) => record.pair.join("+") === "network+power").trials[0];
  trial.sampleSize = 1_000;
  trial.rivalAllAxesProtectedCount = 500;
  trial.candidateAllAxesProtectedCount = 505;
  exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
  exercise.uncertaintyProtocolCommitment.digest = computeUncertaintyProtocolDigest(exercise);
  const result = assessUncertaintyBoundedTransport(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "uncertainty_interval_crosses_transfer_limit");
});

test("extra target contexts invalidate the precommitted comparison family", () => {
  const exercise = qualifiedExercise();
  exercise.transportEvidence.classRisks[0].trials.push({ ...exercise.transportEvidence.classRisks[0].trials[0], contextId: "uncommitted-third-context" });
  exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
  exercise.uncertaintyProtocolCommitment.digest = computeUncertaintyProtocolDigest(exercise);
  assert.deepEqual(assessUncertaintyBoundedTransport(axes, audit, exercise), {
    status: "not_established",
    failures: ["uncertainty_family_not_exact"]
  });
});

test("runtime blocks when transport uncertainty is unresolved", () => {
  const runtime = new CctUncertaintyBoundedTransportRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 24 } }, allowedActions: ["bridge"] }), { message: "CCT_SIGNAL_TRANSPORT_UNCERTAINTY_UNRESOLVED" });
});
