import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CctExerciseLineageRuntime, assessExerciseLineage, bridgeExerciseAdmissible, selectLineageQualifiedBridge, validateExerciseLineageSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const bridge = { continuityLanes: [
  { controller: "rights-stewards", failureDomain: "rights-network", recourseRoute: "rights-appeal", protectsAxes: ["droits"] },
  { controller: "power-stewards", failureDomain: "power-network", recourseRoute: "power-appeal", protectsAxes: ["attribution_du_pouvoir"] }
] };
const report = (target, witness, witnessFailureDomain, sourceRoot) => ({ target, outcome: "reachable", witness, witnessFailureDomain, sourceRoot });

test("lineage diversity turns an exercise into bounded independent support", () => {
  const exercise = { reports: [
    report("lane:0", "observer-a", "field-a", "record-a"), report("recourse:0", "observer-b", "field-b", "record-b"),
    report("lane:1", "observer-a", "field-a", "record-a"), report("recourse:1", "observer-b", "field-b", "record-b")
  ] };
  assert.equal(validateExerciseLineageSpec(spec), true);
  assert.equal(assessExerciseLineage(bridge, exercise), "materially_independent_exercise_candidate");
  assert.equal(bridgeExerciseAdmissible(bridge, exercise), true);
  assert.equal(selectLineageQualifiedBridge({ bridge: { ...bridge, protectsAxes: axes, closesDebts: false } }, ["bridge"], axes, { bridge: exercise }), "bridge");
});

test("structural eligibility is composed before ordering can shadow a valid bridge", () => {
  const exercise = { reports: [
    report("lane:0", "observer-a", "field-a", "record-a"), report("recourse:0", "observer-b", "field-b", "record-b"),
    report("lane:1", "observer-a", "field-a", "record-a"), report("recourse:1", "observer-b", "field-b", "record-b")
  ] };
  const invalid = structuredClone(bridge);
  invalid.protectsAxes = axes;
  invalid.closesDebts = false;
  invalid.continuityLanes[1].controller = invalid.continuityLanes[0].controller;
  const valid = { ...bridge, protectsAxes: axes, closesDebts: false };
  assert.equal(
    selectLineageQualifiedBridge({ a_invalid: invalid, z_valid: valid }, ["a_invalid", "z_valid"], axes, { a_invalid: exercise, z_valid: exercise }),
    "z_valid"
  );
});

test("four reports from one lineage do not masquerade as four supports", () => {
  const shared = { reports: ["lane:0", "recourse:0", "lane:1", "recourse:1"].map((target) => report(target, "observer-a", "field-a", "record-a")) };
  const unknown = { reports: shared.reports.map(({ target, outcome, witness }) => ({ target, outcome, witness })) };
  assert.equal(assessExerciseLineage(bridge, shared), "substantially_dependent");
  assert.equal(assessExerciseLineage(bridge, unknown), "independence_unknown");
});

test("runtime gate rejects a bridge whose reports share one lineage", () => {
  const shared = { reports: ["lane:0", "recourse:0", "lane:1", "recourse:1"].map((target) => report(target, "observer-a", "field-a", "record-a")) };
  const runtime = new CctExerciseLineageRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }, { axis: "attribution_du_pouvoir", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 5, actionOntology: { bridge }, bridgeExercises: { bridge: shared } } }, allowedActions: ["bridge"] }),
    { message: "CCT_EVIDENCE_BRIDGE_LINEAGE_INSUFFICIENT" }
  );
});
