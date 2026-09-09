import test from "node:test";
import assert from "node:assert/strict";
import { assessPretreatmentPlacebos } from "../sequenced-restoration-v4.2-pretreatment-placebos/runtime.mjs";
import {
  assessDistributionalPretreatmentPlacebos,
  CctDistributionalPretreatmentPlaceboRuntime,
  validateDistributionalPretreatmentPlaceboSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise, hideOpposingPlaceboDifferences, recommitDistributionalPlacebos } from "./fixtures.mjs";

test("cluster-level placebos can qualify every exposure group", () => {
  assert.equal(validateDistributionalPretreatmentPlaceboSpec(), true);
  assert.deepEqual(assessDistributionalPretreatmentPlacebos(axes, audit, completeExercise()), {
    status: "bounded_distributional_pretreatment_placebo_candidate",
    failures: []
  });
});

test("opposing subgroup placebo differences are rejected despite aggregate 4.2 balance", () => {
  const exercise = completeExercise();
  hideOpposingPlaceboDifferences(exercise);
  assert.equal(assessPretreatmentPlacebos(axes, audit, exercise).status, "bounded_pretreatment_placebo_candidate");
  const result = assessDistributionalPretreatmentPlacebos(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.deepEqual(result.failures[0], {
    signal: "pair_margin:control+identity",
    probeId: "pair_margin-control+identity-probe-a",
    group: "higher_dependency_load",
    outcome: "lagged_event_rate",
    reason: "distributional_placebo_difference_detected"
  });
});

test("a reused cluster-level source is rejected", () => {
  const exercise = completeExercise();
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  probe.clusterAssignment.clusters[1].distributionalPlaceboCounts[0].sourceRoot = probe.clusterAssignment.clusters[0].distributionalPlaceboCounts[0].sourceRoot;
  recommitDistributionalPlacebos(exercise);
  assert.equal(assessDistributionalPretreatmentPlacebos(axes, audit, exercise).failures.at(-1).reason, "cluster_placebo_source_reused");
});

test("runtime blocks when distributional placebos are unestablished", () => {
  const runtime = new CctDistributionalPretreatmentPlaceboRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), {
    message: "CCT_DISTRIBUTIONAL_PRETREATMENT_PLACEBOS_UNESTABLISHED"
  });
});
