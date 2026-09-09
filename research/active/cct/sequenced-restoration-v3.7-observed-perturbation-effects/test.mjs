import test from "node:test";
import assert from "node:assert/strict";
import {
  assessObservedPerturbationEffects,
  CctObservedPerturbationEffectsRuntime,
  validateObservedPerturbationEffectsSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("direct counts with bounded intervals can qualify perturbation effects", () => {
  assert.equal(validateObservedPerturbationEffectsSpec(), true);
  assert.deepEqual(assessObservedPerturbationEffects(axes, audit, completeExercise()), {
    status: "bounded_observed_perturbation_effects_candidate",
    failures: []
  });
});

test("a declared effect that disagrees with its counts is refused", () => {
  const exercise = completeExercise();
  const effect = exercise.crossSignalPerturbations[0].probes[0].effects[0];
  effect.perturbed.eventCount = 35000;
  const result = assessObservedPerturbationEffects(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "declared_effect_does_not_match_counts");
});

test("a non-target point effect below the limit is refused when its interval crosses", () => {
  const exercise = completeExercise();
  const challenge = exercise.crossSignalPerturbations[0];
  const effect = challenge.probes[0].effects.find((item) => item.signalType !== challenge.signalType || item.signal !== challenge.signal);
  effect.baseline.eventCount = 50000;
  effect.perturbed.eventCount = 54000;
  effect.effectMagnitude = 0.04;
  const result = assessObservedPerturbationEffects(axes, audit, exercise);
  assert.equal(result.failures[0].reason, "non_target_effect_interval_crosses_limit");
});

test("runtime blocks when perturbation effects lack direct evidence", () => {
  const runtime = new CctObservedPerturbationEffectsRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 30 } }, allowedActions: ["bridge"] }), { message: "CCT_PERTURBATION_EFFECT_EVIDENCE_UNESTABLISHED" });
});
