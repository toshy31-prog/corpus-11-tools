import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCctSequencedRecoveryContender } from "../runtime.mjs";
import { createRichScenario } from "../rich-arena-v2/interpreter.mjs";
import {
  compileActionSemantics,
  compileAxisRisks,
  loadProjectionContract,
  projectCctInterface,
  validateProjectionContract,
} from "./runtime.mjs";

const worldUrl = new URL("../scenario-intake/virelia-fractured-atoll-cascade-v1.0.0-r2.frozen.json", import.meta.url);
const document = JSON.parse(await readFile(worldUrl, "utf8"));
const contract = loadProjectionContract();

function initial(profileId) {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial();
  const baseView = scenario.project({ world: trial.world, round: 0, history: [] });
  const allowedActions = scenario.admissibleActions({ view: baseView, round: 0 });
  const view = projectCctInterface({ contract, document, baseView, allowedActions, profileId, tick: 0 });
  return { scenario, trial, baseView, allowedActions, view };
}

test("projection contract validates", () => assert.deepEqual(validateProjectionContract(contract), []));

test("power attribution cannot silently become observable", () => {
  const mutated = structuredClone(contract);
  mutated.publicProxyAxes.attribution_du_pouvoir.constructStatus = "supported";
  assert.match(validateProjectionContract(mutated).join("\n"), /power attribution must remain unobservable/);
});

test("axis risks remain bounded and power attribution remains unconfirmed", () => {
  const risks = compileAxisRisks(document.initialState);
  assert.equal(risks.length, 6);
  assert.ok(risks.every((risk) => risk.severity >= 0 && risk.severity <= 5));
  assert.deepEqual(risks.find((risk) => risk.axis === "attribution_du_pouvoir"), {
    id: "virelia-proxy:attribution_du_pouvoir",
    axis: "attribution_du_pouvoir",
    severity: 0,
    confirmed: false,
    channel: "unobservable",
    failureDomain: "public-proxy:unobservable",
  });
});

test("action semantics compile only immediate public mechanics", () => {
  const semantics = compileActionSemantics(document, "divert_flow");
  assert.equal(semantics.resourceCost, 2);
  assert.equal(semantics.projectionTrace.immediatePublicEffects.groundwater_index, 9);
  assert.equal(semantics.projectionTrace.immediatePublicEffects.harbor_depth, -12.030000000000001);
  assert.ok(semantics.protectsAxes.includes("besoins_vitaux"));
  assert.ok(semantics.harmsAxes.includes("portabilite_effective"));
  for (const hidden of document.view.hidden) assert.equal(JSON.stringify(semantics).includes(hidden), false);
});

test("bundle compilation is invariant to component order", () => {
  assert.deepEqual(
    compileActionSemantics(document, "divert_flow+reinforce_rim"),
    compileActionSemantics(document, "reinforce_rim+divert_flow"),
  );
});

test("P0 preserves the original view and therefore has no CCT interface", () => {
  const { baseView, view } = initial("P0-strict-original-view");
  assert.deepEqual(view, baseView);
  assert.equal(Object.hasOwn(view, "cct"), false);
});

test("P1 discloses matched ontology for every currently allowed action", () => {
  const { allowedActions, view } = initial("P1-matched-public-mechanics");
  assert.deepEqual(Object.keys(view.cct.actionOntology), allowedActions);
  assert.equal(view.cct.capacityBudget, 4);
  assert.deepEqual(view.cct.capacityReceipts, []);
  assert.deepEqual(view.cct.repairReceipts, []);
});

test("P2 removes harms but does not invent restoration or receipts", () => {
  const { view } = initial("P2-optimistic-harm-omission");
  for (const semantics of Object.values(view.cct.actionOntology)) {
    assert.deepEqual(semantics.harmsAxes, []);
    assert.notEqual(semantics.recoveryKind, "restoration");
    assert.deepEqual(semantics.restoresAxes, []);
  }
  assert.deepEqual(view.cct.capacityReceipts, []);
  assert.deepEqual(view.cct.repairReceipts, []);
});

test("projection does not mutate the base public view", () => {
  const { scenario, trial } = initial("P1-matched-public-mechanics");
  const baseView = scenario.project({ world: trial.world, round: 0, history: [] });
  const before = structuredClone(baseView);
  const allowedActions = scenario.admissibleActions({ view: baseView, round: 0 });
  projectCctInterface({ contract, document, baseView, allowedActions, profileId: "P1-matched-public-mechanics", tick: 0 });
  assert.deepEqual(baseView, before);
});

test("CCT fails at tick zero under non-compensating P1", () => {
  const { scenario, allowedActions, view } = initial("P1-matched-public-mechanics");
  const contender = createCctSequencedRecoveryContender({ predictionKeys: scenario.manifest.predictionKeys });
  assert.throws(() => contender.decide({ view, allowedActions, history: [], round: 0 }), /CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION/);
});

test("even optimistic P2 reaches triage then lacks a capacity-acquisition path", () => {
  const { scenario, trial, allowedActions, view } = initial("P2-optimistic-harm-omission");
  const contender = createCctSequencedRecoveryContender({ predictionKeys: scenario.manifest.predictionKeys });
  const first = contender.decide({ view, allowedActions, history: [], round: 0 });
  assert.equal(first.action, "divert_flow+reinforce_rim");
  assert.equal(first.governance.phase, "triage_immediate");
  scenario.act({ world: trial.world, action: first.action, round: 0, exogenous: trial.exogenous });
  const baseView = scenario.project({ world: trial.world, round: 1, history: [] });
  const nextAllowed = scenario.admissibleActions({ view: baseView, round: 1 });
  const nextView = projectCctInterface({ contract, document, baseView, allowedActions: nextAllowed, profileId: "P2-optimistic-harm-omission", tick: 1 });
  assert.throws(() => contender.decide({ view: nextView, allowedActions: nextAllowed, history: [], round: 1 }), /CCT_CAPACITY_ACQUISITION_INFEASIBLE/);
});

test("the contract preserves vector outcomes and forbids a scalar winner", () => {
  assert.equal(contract.fairness.noScalarWinner, true);
  assert.doesNotMatch(JSON.stringify(contract), /aggregateScore|scalarWinner/);
});
