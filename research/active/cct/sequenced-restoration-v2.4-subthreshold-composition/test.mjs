import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  assessSubthresholdComposition,
  CctSubthresholdCompositionRuntime,
  validateSubthresholdCompositionSpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const dependencyAudit = {
  materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10]))
};

function completeExercise() {
  return {
    windowTicks: 1,
    classTrials: REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass) => ({
      dependencyClass,
      components: [{ root: `${dependencyClass}-a`, impact: 6 }, { root: `${dependencyClass}-b`, impact: 6 }],
      aggregationOutcomes: [
        { mapId: "sum", controller: "team-a", sourceRoot: "model-a", aggregateImpact: 12 },
        { mapId: "bounded-interaction", controller: "team-b", sourceRoot: "model-b", aggregateImpact: 11 }
      ],
      observations: [0, 1].map((tick) => ({ tick, protectedAxes: axes }))
    }))
  };
}

test("jointly material subthreshold compositions must preserve every debt axis", () => {
  assert.equal(validateSubthresholdCompositionSpec(spec), true);
  assert.deepEqual(assessSubthresholdComposition(axes, dependencyAudit, completeExercise()), {
    status: "bounded_subthreshold_tolerance_candidate",
    failures: []
  });
});

test("a transient gap from individually small roots is retained", () => {
  const exercise = completeExercise();
  exercise.classTrials.find((trial) => trial.dependencyClass === "network").observations[1].protectedAxes = ["droits"];
  assert.deepEqual(assessSubthresholdComposition(axes, dependencyAudit, exercise).failures, [{
    dependencyClass: "network",
    tick: 1,
    reason: "composed_protection_gap",
    missingAxes: ["attribution_du_pouvoir"]
  }]);
});

test("materiality under one aggregation only is not silently generalized", () => {
  const exercise = completeExercise();
  exercise.classTrials[0].aggregationOutcomes[1].aggregateImpact = 9;
  assert.deepEqual(assessSubthresholdComposition(axes, dependencyAudit, exercise).failures, [{
    dependencyClass: "control",
    reason: "aggregation_dependent_materiality"
  }]);
});

test("two labels over one aggregation lineage do not count as two maps", () => {
  const exercise = completeExercise();
  exercise.classTrials[0].aggregationOutcomes[1].controller = "team-a";
  exercise.classTrials[0].aggregationOutcomes[1].sourceRoot = "model-a";
  assert.deepEqual(assessSubthresholdComposition(axes, dependencyAudit, exercise).failures, [{
    dependencyClass: "control",
    reason: "aggregation_dependent_materiality"
  }]);
});

test("runtime blocks when subthreshold composition evidence is absent", () => {
  const runtime = new CctSubthresholdCompositionRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 10 } }, allowedActions: ["bridge"] }),
    { message: "CCT_SUBTHRESHOLD_COMPOSITION_TOLERANCE_UNESTABLISHED" }
  );
});
