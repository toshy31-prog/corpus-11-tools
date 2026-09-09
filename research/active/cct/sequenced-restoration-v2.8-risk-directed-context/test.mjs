import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  assessRiskDirectedContext,
  buildAdaptiveTrials,
  computePlanDigest,
  CctRiskDirectedContextRuntime,
  deriveRiskDirectedSchedule,
  validateRiskDirectedContextSpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };

function completeExercise() {
  const pairSignals = requiredClassPairs().map((pair, index) => ({
    pair,
    minimumMargin: pair.join("+") === "network+power" ? 1 : 10 + index,
    sourceRoot: index % 2 === 0 ? "margin-a" : "margin-b"
  }));
  const classRiskScores = REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass, index) => ({
    dependencyClass,
    riskScore: dependencyClass === "identity" ? 100 : 20 - index,
    sourceRoot: index % 2 === 0 ? "risk-a" : "risk-b"
  }));
  const schedule = deriveRiskDirectedSchedule(pairSignals, classRiskScores);
  return {
    windowTicks: 2,
    firstExerciseTick: 20,
    pairBudget: 6,
    pairSignals,
    classRiskScores,
    planCommitment: {
      algorithm: "sha256",
      digest: computePlanDigest(pairSignals, classRiskScores, schedule),
      committedAtTick: 19,
      sourceRoot: "commitment-register-a"
    },
    adaptiveTrials: buildAdaptiveTrials(schedule, axes)
  };
}

test("weak margins deterministically select six unused third contexts", () => {
  assert.equal(validateRiskDirectedContextSpec(spec), true);
  const exercise = completeExercise();
  assert.equal(exercise.adaptiveTrials.length, 6);
  assert.equal(exercise.adaptiveTrials.reduce((count, trial) => count + trial.sequences.length, 0), 36);
  assert.deepEqual(exercise.adaptiveTrials[0].pair, ["network", "power"]);
  assert.equal(exercise.adaptiveTrials[0].thirdClass, "identity");
});

test("a committed risk-directed expansion can qualify", () => {
  assert.deepEqual(assessRiskDirectedContext(axes, audit, completeExercise()), {
    status: "bounded_risk_directed_context_candidate",
    failures: []
  });
});

test("post-hoc signal changes invalidate the plan commitment", () => {
  const exercise = completeExercise();
  exercise.pairSignals[0].minimumMargin = 0;
  assert.deepEqual(assessRiskDirectedContext(axes, audit, exercise), {
    status: "not_established",
    failures: ["plan_commitment_mismatch"]
  });
});

test("a targeted third-context gap remains visible", () => {
  const exercise = completeExercise();
  const trial = exercise.adaptiveTrials[0];
  const order = trial.sequences.find((sequence) => sequence.order.join("->") === "power->network->identity");
  order.observations[2].protectedAxes = ["droits"];
  assert.deepEqual(assessRiskDirectedContext(axes, audit, exercise).failures, [{
    triple: "network+power+identity",
    order: "power->network->identity",
    tick: 2,
    reason: "three_way_protection_gap",
    missingAxes: ["attribution_du_pouvoir"]
  }]);
});

test("runtime blocks without precommitted adaptive evidence", () => {
  const runtime = new CctRiskDirectedContextRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 17 } }, allowedActions: ["bridge"] }),
    { message: "CCT_RISK_DIRECTED_CONTEXT_UNESTABLISHED" }
  );
});
