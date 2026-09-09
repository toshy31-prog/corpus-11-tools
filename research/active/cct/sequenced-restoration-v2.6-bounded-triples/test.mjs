import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  assessBoundedTriples,
  CctBoundedTriplesRuntime,
  permutations,
  requiredTripleCover,
  tripleCoverProperties,
  validateBoundedTriplesSpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };

function completeExercise() {
  return {
    windowTicks: 2,
    tripleTrials: requiredTripleCover().map((classes) => ({
      classes,
      components: classes.map((dependencyClass) => ({ dependencyClass, root: `${dependencyClass}-root`, impact: 6 })),
      sequences: permutations(classes).map((order) => ({
        order,
        observations: [0, 1, 2].map((tick) => ({
          tick,
          appliedClasses: order.slice(0, tick + 1),
          protectedAxes: axes
        }))
      }))
    }))
  };
}

test("the affine design covers every pair once and balances all nine classes", () => {
  assert.equal(validateBoundedTriplesSpec(spec), true);
  assert.deepEqual(tripleCoverProperties(), {
    tripleCount: 12,
    uniquePairCount: 36,
    everyPairExactlyOnce: true,
    classCounts: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 4]))
  });
});

test("all twelve triples pass in all six application orders", () => {
  const exercise = completeExercise();
  assert.equal(exercise.tripleTrials.reduce((count, trial) => count + trial.sequences.length, 0), 72);
  assert.deepEqual(assessBoundedTriples(axes, audit, exercise), {
    status: "bounded_three_way_interaction_candidate",
    failures: []
  });
});

test("a third-class order effect exposes the affected debt axis", () => {
  const exercise = completeExercise();
  const trial = exercise.tripleTrials.find((candidate) => candidate.classes.join("+") === "network+power+finance");
  const sequence = trial.sequences.find((candidate) => candidate.order.join("->") === "power->network->finance");
  sequence.observations[2].protectedAxes = ["droits"];
  assert.deepEqual(assessBoundedTriples(axes, audit, exercise).failures, [{
    triple: "network+power+finance",
    order: "power->network->finance",
    tick: 2,
    reason: "three_way_protection_gap",
    missingAxes: ["attribution_du_pouvoir"]
  }]);
});

test("an incomplete cover and a missing permutation cannot pass", () => {
  const exercise = completeExercise();
  exercise.tripleTrials.pop();
  exercise.tripleTrials[0].sequences.pop();
  const result = assessBoundedTriples(axes, audit, exercise);
  assert.equal(result.status, "not_established");
  assert.equal(result.failures.some((failure) => failure.reason === "invalid_triple_cover"), true);
  assert.equal(result.failures.some((failure) => failure.reason === "invalid_order_set"), true);
  assert.equal(result.failures.some((failure) => failure.reason === "missing_order_sequence"), true);
  assert.equal(result.failures.some((failure) => failure.reason === "missing_triple_trial"), true);
});

test("runtime blocks when bounded triple evidence is absent", () => {
  const runtime = new CctBoundedTriplesRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 13 } }, allowedActions: ["bridge"] }),
    { message: "CCT_BOUNDED_TRIPLE_TOLERANCE_UNESTABLISHED" }
  );
});
