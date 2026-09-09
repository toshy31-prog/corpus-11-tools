import test from "node:test";
import assert from "node:assert/strict";
import {
  assessSignalProvenance,
  CctSignalProvenanceRuntime,
  compileSignalEvidence,
  validateSignalProvenanceSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("independent conservative signal compilation can qualify", () => {
  assert.equal(validateSignalProvenanceSpec(), true);
  const exercise = completeExercise();
  assert.equal(exercise.pairSignals.find((item) => item.pair.join("+") === "network+power").minimumMargin, 0.5);
  assert.equal(exercise.classRiskScores.find((item) => item.dependencyClass === "identity").riskScore, 0.92);
  assert.deepEqual(assessSignalProvenance(axes, audit, exercise), {
    status: "bounded_provenanced_risk_signals_candidate",
    failures: []
  });
});

test("two formats under one controller are not independent evidence", () => {
  const exercise = completeExercise();
  const target = exercise.signalEvidence.pairMargins.find((item) => item.pair.join("+") === "network+power");
  target.attestations[1].controller = target.attestations[0].controller;
  const compiled = compileSignalEvidence(exercise.signalEvidence, 19);
  assert.deepEqual(compiled.failures, [{
    signalType: "pair_margin",
    signal: "network+power",
    reason: "independent_attestations_missing"
  }]);
});

test("uncalibrated class risk cannot steer the adaptive plan", () => {
  const exercise = completeExercise();
  const target = exercise.signalEvidence.classRisks.find((item) => item.dependencyClass === "identity");
  target.attestations[1].calibrationError = 0.25;
  assert.deepEqual(assessSignalProvenance(axes, audit, exercise).failures, [{
    signalType: "class_risk",
    signal: "identity",
    reason: "calibrated_attestations_missing"
  }]);
});

test("unsupported compiled values cannot replace the evidence result", () => {
  const exercise = completeExercise();
  exercise.pairSignals[0].minimumMargin = 0;
  assert.deepEqual(assessSignalProvenance(axes, audit, exercise), {
    status: "not_established",
    failures: ["compiled_signals_not_applied"]
  });
});

test("runtime blocks when adaptive signal provenance is absent", () => {
  const runtime = new CctSignalProvenanceRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 21 } }, allowedActions: ["bridge"] }),
    { message: "CCT_ADAPTIVE_SIGNAL_PROVENANCE_UNESTABLISHED" }
  );
});
