import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  assessCrossClassPairs,
  CctCrossClassPairsRuntime,
  requiredClassPairs,
  validateCrossClassPairsSpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };

function completeExercise() {
  return {
    windowTicks: 1,
    pairTrials: requiredClassPairs().map((classes) => ({
      classes,
      components: classes.map((dependencyClass) => ({ dependencyClass, root: `${dependencyClass}-root`, impact: 6 })),
      sequences: [classes, [...classes].reverse()].map((order) => ({
        order,
        observations: [
          { tick: 0, appliedClasses: [order[0]], protectedAxes: axes },
          { tick: 1, appliedClasses: order, protectedAxes: axes }
        ]
      }))
    }))
  };
}

test("all 36 class pairs are exercised in both orders", () => {
  assert.equal(validateCrossClassPairsSpec(spec), true);
  assert.equal(requiredClassPairs().length, 36);
  assert.deepEqual(assessCrossClassPairs(axes, audit, completeExercise()), {
    status: "bounded_pairwise_cross_class_candidate",
    failures: []
  });
});

test("an order-specific cross-class gap is preserved", () => {
  const exercise = completeExercise();
  const trial = exercise.pairTrials.find((candidate) => candidate.classes.join("+") === "network+power");
  trial.sequences[1].observations[1].protectedAxes = ["droits"];
  assert.deepEqual(assessCrossClassPairs(axes, audit, exercise).failures, [{
    pair: "network+power",
    order: "power->network",
    tick: 1,
    reason: "cross_class_protection_gap",
    missingAxes: ["attribution_du_pouvoir"]
  }]);
});

test("a missing reverse order does not count as pairwise coverage", () => {
  const exercise = completeExercise();
  exercise.pairTrials[0].sequences.pop();
  const [left, right] = exercise.pairTrials[0].classes;
  assert.deepEqual(assessCrossClassPairs(axes, audit, exercise).failures, [{
    pair: `${left}+${right}`,
    order: `${right}->${left}`,
    reason: "missing_order_sequence"
  }]);
});

test("runtime blocks when cross-class evidence is absent", () => {
  const runtime = new CctCrossClassPairsRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 11 } }, allowedActions: ["bridge"] }),
    { message: "CCT_CROSS_CLASS_PAIR_TOLERANCE_UNESTABLISHED" }
  );
});

