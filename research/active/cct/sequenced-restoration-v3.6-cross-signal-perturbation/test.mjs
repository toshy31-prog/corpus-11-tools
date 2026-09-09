import test from "node:test";
import assert from "node:assert/strict";
import {
  assessCrossSignalPerturbations,
  CctCrossSignalPerturbationRuntime,
  computeCrossSignalPerturbationProtocolDigest,
  validateCrossSignalPerturbationSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("two independent selective perturbations per signal can qualify the portfolio", () => {
  assert.equal(validateCrossSignalPerturbationSpec(), true);
  assert.deepEqual(assessCrossSignalPerturbations(axes, audit, completeExercise()), {
    status: "bounded_cross_signal_perturbation_candidate",
    failures: []
  });
});

test("an effect on another signal reveals an unrecorded dependency", () => {
  const exercise = completeExercise();
  const challenge = exercise.crossSignalPerturbations[0];
  const spillover = challenge.probes[0].effects.find((effect) => effect.signalType === "class_risk");
  spillover.effectMagnitude = 0.2;
  const result = assessCrossSignalPerturbations(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "cross_signal_perturbation_detected");
});

test("a perturbation that does not move its target cannot validate its generator roots", () => {
  const exercise = completeExercise();
  const challenge = exercise.crossSignalPerturbations[0];
  challenge.probes[0].effects.find((effect) => effect.signalType === challenge.signalType && effect.signal === challenge.signal).effectMagnitude = 0;
  assert.equal(assessCrossSignalPerturbations(axes, audit, exercise).failures[0].reason, "target_perturbation_not_detected");
});

test("changing the precommitted comparison family invalidates the protocol", () => {
  const exercise = completeExercise();
  exercise.crossSignalPerturbations[0].probes[0].effects.pop();
  assert.deepEqual(assessCrossSignalPerturbations(axes, audit, exercise), {
    status: "not_established",
    failures: ["invalid_cross_signal_perturbation_protocol"]
  });
});

test("runtime blocks when cross-signal common causes remain unresolved", () => {
  const runtime = new CctCrossSignalPerturbationRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 29 } }, allowedActions: ["bridge"] }), { message: "CCT_CROSS_SIGNAL_COMMON_CAUSE_UNRESOLVED" });
});
