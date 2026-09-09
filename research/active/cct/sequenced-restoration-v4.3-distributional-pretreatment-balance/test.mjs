import test from "node:test";
import assert from "node:assert/strict";
import {
  assessDistributionalPretreatmentBalance,
  CctDistributionalPretreatmentBalanceRuntime,
  validateDistributionalPretreatmentBalanceSpec
} from "./runtime.mjs";
import { assessPretreatmentPlacebos } from "../sequenced-restoration-v4.2-pretreatment-placebos/runtime.mjs";
import { audit, axes, completeExercise, recommitPretreatmentBalance } from "./fixtures.mjs";

test("precommitted exposure groups can qualify distributional balance", () => {
  assert.equal(validateDistributionalPretreatmentBalanceSpec(), true);
  assert.deepEqual(assessDistributionalPretreatmentBalance(axes, audit, completeExercise()), {
    status: "bounded_distributional_pretreatment_balance_candidate",
    failures: []
  });
});

test("an imbalance inside the higher-exposure half is rejected", () => {
  const exercise = completeExercise();
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) cluster.pretreatment.values.baseline_event_rate += 0.1;
  for (const cluster of probe.clusterAssignment.clusters) {
    const high = cluster.pretreatment.values.dependency_load >= 0.1375;
    const direction = cluster.arm === "baseline" ? 1 : -1;
    cluster.pretreatment.values.baseline_event_rate += (high ? 0.04 : -0.04) * direction;
  }
  recommitPretreatmentBalance(exercise);
  assert.equal(assessPretreatmentPlacebos(axes, audit, exercise).status, "bounded_pretreatment_placebo_candidate");
  const result = assessDistributionalPretreatmentBalance(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "distributional_pretreatment_imbalance");
  assert.match(result.failures[0].details.join("\n"), /higher_dependency_load:baseline_event_rate/);
});

test("an underpowered exposure group cannot be treated as balanced", () => {
  const exercise = completeExercise();
  const probe = exercise.crossSignalPerturbations[0].probes[0];
  for (const cluster of probe.clusterAssignment.clusters) cluster.pretreatment.values.dependency_load = 0;
  recommitPretreatmentBalance(exercise);
  const result = assessDistributionalPretreatmentBalance(axes, audit, exercise);
  assert.match(result.failures[0].details.join("\n"), /exposure_group_underpowered:higher_dependency_load/);
});

test("runtime blocks when distributional balance is unestablished", () => {
  const runtime = new CctDistributionalPretreatmentBalanceRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 35 } }, allowedActions: ["bridge"] }), {
    message: "CCT_DISTRIBUTIONAL_PRETREATMENT_BALANCE_UNESTABLISHED"
  });
});
