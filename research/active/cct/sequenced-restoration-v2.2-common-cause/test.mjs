import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessCommonCauseExercise, CctCommonCauseRuntime, validateCommonCauseSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const independent = { continuityLanes: [
  { dependencyRoots: ["root-a"], protectsAxes: axes },
  { dependencyRoots: ["root-b"], protectsAxes: axes }
] };

function exerciseFor(semantics) {
  const roots = [...new Set(semantics.continuityLanes.flatMap((lane) => lane.dependencyRoots))].sort();
  return {
    windowTicks: 1,
    dependencyTrials: roots.map((dependencyRoot) => ({
      dependencyRoot,
      observations: [0, 1].map((tick) => ({
        tick,
        activeLanes: semantics.continuityLanes
          .map((lane, index) => lane.dependencyRoots.includes(dependencyRoot) ? null : index)
          .filter((index) => index !== null),
        protectedAxes: axes
      }))
    }))
  };
}

test("each declared dependency root is confronted as a grouped perturbation", () => {
  assert.equal(validateCommonCauseSpec(spec), true);
  assert.deepEqual(assessCommonCauseExercise(independent, axes, exerciseFor(independent)), {
    status: "bounded_common_cause_candidate",
    failures: []
  });
});

test("two nominally distinct lanes sharing one root fail together", () => {
  const shared = { continuityLanes: [
    { dependencyRoots: ["shared-root"], protectsAxes: axes },
    { dependencyRoots: ["shared-root"], protectsAxes: axes }
  ] };
  const result = assessCommonCauseExercise(shared, axes, exerciseFor(shared));
  assert.equal(result.status, "substantially_dependent");
  assert.deepEqual(result.failures, [
    { dependencyRoot: "shared-root", tick: 0, reason: "common_cause_gap", missingAxes: axes },
    { dependencyRoot: "shared-root", tick: 1, reason: "common_cause_gap", missingAxes: axes }
  ]);
});

test("unknown dependency lineage is never treated as independence", () => {
  const unknown = { continuityLanes: [{ protectsAxes: axes }, { protectsAxes: axes }] };
  assert.deepEqual(assessCommonCauseExercise(unknown, axes, {}), {
    status: "independence_unknown",
    failures: ["dependency_inventory_incomplete"]
  });
});

test("runtime blocks before accepting a bridge with no dependency evidence", () => {
  const runtime = new CctCommonCauseRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(
    () => runtime.decide({
      view: { cct: { tick: 8, actionOntology: { bridge: independent } } },
      allowedActions: ["bridge"]
    }),
    { message: "CCT_EVIDENCE_BRIDGE_COMMON_CAUSE_UNSAFE" }
  );
});

