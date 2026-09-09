import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPretreatmentBalance,
  CctPretreatmentBalanceRuntime,
  computePretreatmentBalanceProtocolDigest,
  validatePretreatmentBalanceSpec
} from "./runtime.mjs";
import { audit, axes, completeExercise } from "./fixtures.mjs";

test("pre-treatment balance within strata and between arms can qualify", () => {
  assert.equal(validatePretreatmentBalanceSpec(), true);
  assert.deepEqual(assessPretreatmentBalance(axes, audit, completeExercise()), {
    status: "bounded_pretreatment_balance_candidate",
    failures: []
  });
});

test("a nominal stratum with material baseline imbalance is refused", () => {
  const exercise = completeExercise();
  const cluster = exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters.find((item) => item.arm === "baseline");
  cluster.pretreatment.values.baseline_event_rate = 1;
  exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);
  const result = assessPretreatmentBalance(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures[0].reason, "pretreatment_imbalance");
});

test("reusing a pre-treatment source across clusters is refused", () => {
  const exercise = completeExercise();
  const clusters = exercise.crossSignalPerturbations[0].probes[0].clusterAssignment.clusters;
  clusters[1].pretreatment.sourceRoot = clusters[0].pretreatment.sourceRoot;
  exercise.pretreatmentBalanceCommitment.digest = computePretreatmentBalanceProtocolDigest(exercise);
  assert.equal(assessPretreatmentBalance(axes, audit, exercise).failures[0].details[0], "pretreatment_source_reused");
});

test("runtime blocks when pre-treatment balance is unestablished", () => {
  const runtime = new CctPretreatmentBalanceRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(() => runtime.decide({ view: { cct: { tick: 34 } }, allowedActions: ["bridge"] }), { message: "CCT_PRETREATMENT_BALANCE_UNESTABLISHED" });
});
