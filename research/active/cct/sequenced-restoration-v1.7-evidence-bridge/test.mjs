import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CctEvidenceBridgeRuntime, evidenceBridgeEligible, selectEvidenceBridge, validateEvidenceBridgeSpec } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

const axes = ["droits", "attribution_du_pouvoir"];
const independentBridge = {
  protectsAxes: axes,
  closesDebts: false,
  continuityLanes: [
    { controller: "rights-stewards", failureDomain: "rights-network", recourseRoute: "rights-appeal", protectsAxes: ["droits"] },
    { controller: "power-stewards", failureDomain: "power-network", recourseRoute: "power-appeal", protectsAxes: ["attribution_du_pouvoir"] }
  ]
};

test("an evidence bridge creates an executable dual-protection option", () => {
  assert.equal(validateEvidenceBridgeSpec(spec), true);
  assert.equal(evidenceBridgeEligible(independentBridge, axes), true);
  assert.equal(selectEvidenceBridge({ bridge: independentBridge }, ["bridge"], axes), "bridge");
});

test("a centrally controlled or closure-claiming bridge remains inadmissible", () => {
  const central = structuredClone(independentBridge);
  central.continuityLanes[1].controller = "rights-stewards";
  assert.equal(evidenceBridgeEligible(central, axes), false);
  assert.equal(evidenceBridgeEligible({ ...independentBridge, closesDebts: true }, axes), false);
});

test("runtime refuses to substitute a partial lane for a bridge", () => {
  const runtime = new CctEvidenceBridgeRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 4, actionOntology: { partial: { protectsAxes: ["droits"] } } } }, allowedActions: ["partial"] }),
    { message: "CCT_EVIDENCE_BRIDGE_UNAVAILABLE" }
  );
});
