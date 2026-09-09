import test from "node:test";
import assert from "node:assert/strict";
import {
  assessHeldOutSignalTransport,
  CctHeldOutSignalTransportRuntime,
  computeTransportProtocolDigest,
  validateHeldOutSignalTransportSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("precommitted direct outcomes in held-out contexts can qualify transport", () => {
  assert.equal(validateHeldOutSignalTransportSpec(), true);
  assert.deepEqual(assessHeldOutSignalTransport(axes, audit, completeExercise()), {
    status: "bounded_held_out_signal_transport_candidate",
    failures: []
  });
});

test("a semantic label cannot replace the direct outcome construct", () => {
  const exercise = completeExercise();
  exercise.transportEvidence.constructs.pairMargin.construct = "reported_resilience_score";
  exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
  assert.deepEqual(assessHeldOutSignalTransport(axes, audit, exercise), { status: "not_established", failures: ["invalid_transport_protocol"] });
});

test("a source controller cannot validate its own transport", () => {
  const exercise = completeExercise();
  const target = exercise.transportEvidence.pairMargins[0].trials[0];
  target.controller = exercise.signalEvidence.pairMargins[0].attestations[0].controller;
  exercise.transportProtocolCommitment.digest = computeTransportProtocolDigest(exercise.transportEvidence);
  assert.equal(assessHeldOutSignalTransport(axes, audit, exercise).failures[0].reason, "held_out_contexts_missing");
});

test("a nontransportable risk score cannot steer the adaptive plan", () => {
  const exercise = completeExercise();
  const target = exercise.transportEvidence.classRisks.find((item) => item.dependencyClass === "identity");
  for (const trial of target.trials) trial.failureCount = 20;
  assert.deepEqual(assessHeldOutSignalTransport(axes, audit, exercise).failures, [{ signalType: "class_risk", signal: "identity", reason: "transfer_error_exceeded" }]);
});

test("runtime blocks when held-out transport is absent", () => {
  const runtime = new CctHeldOutSignalTransportRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 23 } }, allowedActions: ["bridge"] }), { message: "CCT_ADAPTIVE_SIGNAL_TRANSPORT_UNESTABLISHED" });
});
