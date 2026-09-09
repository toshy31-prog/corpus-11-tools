import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { permutations } from "../sequenced-restoration-v2.6-bounded-triples/runtime.mjs";
import {
  assessDualContextTriples,
  CctDualContextTriplesRuntime,
  dualCoverProperties,
  requiredDualTripleCovers,
  validateDualContextTriplesSpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };

function completeExercise() {
  return {
    windowTicks: 2,
    covers: requiredDualTripleCovers().map(({ coverId, triples }) => ({
      coverId,
      tripleTrials: triples.map((classes) => ({
        classes,
        components: classes.map((dependencyClass) => ({ dependencyClass, root: `${coverId}-${dependencyClass}`, impact: 6 })),
        sequences: permutations(classes).map((order) => ({
          order,
          observations: [0, 1, 2].map((tick) => ({
            tick,
            appliedClasses: order.slice(0, tick + 1),
            protectedAxes: axes
          }))
        }))
      }))
    }))
  };
}

test("two disjoint balanced covers give every pair two third contexts", () => {
  assert.equal(validateDualContextTriplesSpec(spec), true);
  assert.deepEqual(dualCoverProperties(), {
    coverCount: 2,
    tripleCount: 24,
    uniqueTripleCount: 24,
    everyCoverBalanced: true,
    pairCount: 36,
    everyPairHasTwoContexts: true
  });
});

test("all 144 ordered sequences preserve the open debts", () => {
  const exercise = completeExercise();
  const sequenceCount = exercise.covers.flatMap((cover) => cover.tripleTrials)
    .reduce((count, trial) => count + trial.sequences.length, 0);
  assert.equal(sequenceCount, 144);
  assert.deepEqual(assessDualContextTriples(axes, audit, exercise), {
    status: "bounded_dual_context_three_way_candidate",
    failures: []
  });
});

test("a gap appearing only in the second context remains attributable", () => {
  const exercise = completeExercise();
  const second = exercise.covers.find((cover) => cover.coverId === "affine-b");
  const trial = second.tripleTrials.find((candidate) => candidate.classes.join("+") === "network+power+personnel");
  const sequence = trial.sequences.find((candidate) => candidate.order.join("->") === "power->network->personnel");
  sequence.observations[2].protectedAxes = ["droits"];
  assert.deepEqual(assessDualContextTriples(axes, audit, exercise).failures, [{
    coverId: "affine-b",
    triple: "network+power+personnel",
    order: "power->network->personnel",
    tick: 2,
    reason: "three_way_protection_gap",
    missingAxes: ["attribution_du_pouvoir"]
  }]);
});

test("a missing second cover cannot masquerade as dual-context evidence", () => {
  const exercise = completeExercise();
  exercise.covers.pop();
  assert.deepEqual(assessDualContextTriples(axes, audit, exercise), {
    status: "not_established",
    failures: ["invalid_dual_cover_exercise"]
  });
});

test("runtime blocks when the second triple context is absent", () => {
  const runtime = new CctDualContextTriplesRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 15 } }, allowedActions: ["bridge"] }),
    { message: "CCT_DUAL_CONTEXT_TRIPLE_TOLERANCE_UNESTABLISHED" }
  );
});
