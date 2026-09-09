import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assessBridgePresence, selectExercisedEvidenceBridge, validateBridgePresenceSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const bridge = { protectsAxes: axes, closesDebts: false, continuityLanes: [
  { controller: "rights-stewards", failureDomain: "rights-network", recourseRoute: "rights-appeal", protectsAxes: ["droits"] },
  { controller: "power-stewards", failureDomain: "power-network", recourseRoute: "power-appeal", protectsAxes: ["attribution_du_pouvoir"] }
] };
const exercise = { reports: [
  { target: "lane:0", outcome: "reachable", witness: "observer-a" }, { target: "recourse:0", outcome: "reachable", witness: "observer-b" },
  { target: "lane:1", outcome: "reachable", witness: "observer-c" }, { target: "recourse:1", outcome: "reachable", witness: "observer-d" }
] };

test("only a fully witnessed bridge becomes locally exercised", () => {
  assert.equal(validateBridgePresenceSpec(spec), true);
  assert.equal(assessBridgePresence(bridge), "declared_only");
  assert.equal(assessBridgePresence(bridge, exercise), "locally_exercised_candidate");
  assert.equal(selectExercisedEvidenceBridge({ bridge }, ["bridge"], axes, { bridge: exercise }), "bridge");
});

test("a controller cannot witness its own lane and a missing recourse remains partial", () => {
  const selfWitness = structuredClone(exercise);
  selfWitness.reports[0].witness = "rights-stewards";
  assert.equal(assessBridgePresence(bridge, selfWitness), "witness_not_separate");
  assert.equal(assessBridgePresence(bridge, { reports: exercise.reports.slice(0, 3) }), "partially_exercised");
});
