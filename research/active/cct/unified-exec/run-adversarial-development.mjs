#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CctUnifiedRuntime } from "./runtime.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const axes = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];
const semantics = ({ tags = ["hold_noncoercive"], protects = [], harms = [], constitutional = [], cost = 0, burden = cost } = {}) => ({
  tags, burden, actor: "development-fixture", traceable: true, resourceCost: cost,
  protectsAxes: protects, harmsAxes: harms, constitutionalTags: constitutional,
});
const baseOntology = {
  hold: semantics(),
  vital_only: semantics({ tags: ["vital_minimum"], protects: ["besoins_vitaux"], cost: 1 }),
  emergency_complete: semantics({ tags: ["vital_minimum", "recourse_open", "attributable_receipt"], protects: ["besoins_vitaux"], cost: 2 }),
  rights_safe: semantics({ protects: ["droits", "attribution_du_pouvoir"], constitutional: ["preserve_opposition", "preserve_recourse"], cost: 2 }),
  abolition: semantics({ protects: ["droits", "attribution_du_pouvoir"], constitutional: ["suppress_opposition", "eliminate_recourse"], cost: 1 }),
  full_safe: semantics({ tags: ["vital_minimum", "recourse_open", "attributable_receipt", "provisional_signed", "preserve_divergence"], protects: axes, cost: 6 }),
  full_harmful: semantics({ protects: axes, harms: ["droits"], cost: 2 }),
};
const risk = (id, axis, severity = 1) => ({ id, axis, severity, confirmed: true, channel: `${axis}-public`, failureDomain: `${axis}-domain` });
const vitalSignals = [
  { id: "v1", kind: "vital_denial", subject: "p", channel: "offline", failureDomain: "local", confirmed: true },
  { id: "v2", kind: "vital_denial", subject: "p", channel: "signed", failureDomain: "remote", confirmed: true },
];
const grants = ["continuity", "contradictor"].map((key) => ({ mechanismId: "M14-01", key, authorityTrace: `signed:${key}` }));
const world = ({ axisRisks = [], capacityBudget = 10, actionOntology = baseOntology, signals = [], keyGrants = [] } = {}) => ({
  cct: { tick: 0, axisRisks, capacityBudget, actionOntology, signals, keyGrants, keyRevocations: [], evidence: [] },
  publicState: { stress: axisRisks.length },
});

const cases = [
  { id: "majority-abolishes-opposition", view: world({ axisRisks: [risk("r", "droits"), risk("p", "attribution_du_pouvoir")] }), actions: ["abolition", "rights_safe"], expected: "rights_safe" },
  { id: "dual-crisis-budget-too-low", view: world({ axisRisks: [risk("v", "besoins_vitaux"), risk("e", "plafond_ecologique")], capacityBudget: 3 }), actions: ["vital_only", "full_safe"], expectedError: "CCT_COMPOSED_PROTECTION_INFEASIBLE" },
  { id: "six-axis-full-bundle-available", view: world({ axisRisks: axes.map((axis, i) => risk(`a${i}`, axis)), capacityBudget: 6 }), actions: ["vital_only", "full_safe"], expected: "full_safe" },
  { id: "six-axis-resource-collapse", view: world({ axisRisks: axes.map((axis, i) => risk(`b${i}`, axis)), capacityBudget: 4 }), actions: ["vital_only", "full_safe"], expectedError: "CCT_COMPOSED_PROTECTION_INFEASIBLE" },
  { id: "emergency-nce-survives-composition", view: world({ axisRisks: [risk("v", "besoins_vitaux")], capacityBudget: 3, signals: vitalSignals, keyGrants: grants }), actions: ["vital_only", "emergency_complete"], expected: "emergency_complete" },
  { id: "harmful-full-coverage-rejected", view: world({ axisRisks: [risk("v", "besoins_vitaux"), risk("e", "plafond_ecologique")], capacityBudget: 6 }), actions: ["full_harmful", "full_safe"], expected: "full_safe" },
  { id: "only-unconstitutional-capacity", view: world({ axisRisks: [risk("r", "droits"), risk("p", "attribution_du_pouvoir")] }), actions: ["abolition"], expectedError: "CCT_I13_OR_BUDGET_NO_ADMISSIBLE_ACTION" },
  { id: "deceptive-name-does-not-control", view: world({ axisRisks: [risk("r", "droits")] , actionOntology: { benevolent: semantics({ protects: ["droits"], constitutional: ["abolish_dignity"], cost: 1 }), oppressive: semantics({ protects: ["droits"], cost: 2 }) } }), actions: ["benevolent", "oppressive"], expected: "oppressive" },
];

const results = cases.map((item) => {
  const runtime = new CctUnifiedRuntime();
  try {
    const decision = runtime.decide({ view: item.view, allowedActions: item.actions });
    return {
      id: item.id,
      observed: { type: "action", action: decision.action },
      expectationMatched: decision.action === item.expected,
      capacityStatus: "usable_on_fixture",
      trace: decision.governance,
    };
  } catch (error) {
    const code = String(error.message);
    return {
      id: item.id,
      observed: { type: "refusal", code },
      expectationMatched: code === item.expectedError,
      capacityStatus: "safe_refusal_but_no_usable_action",
      trace: runtime.snapshot().trace.at(-1),
    };
  }
});
const report = {
  schema: "cct-adversarial-development/v1",
  sourceRegime: "internal_synthetic_development_only",
  candidate: "CCT-EXEC-1.0-CANDIDATE-001",
  fixtures: results.length,
  expectationMatches: results.filter((item) => item.expectationMatched).length,
  usableFixtures: results.filter((item) => item.capacityStatus === "usable_on_fixture").length,
  noUsableActionFixtures: results.filter((item) => item.capacityStatus !== "usable_on_fixture").length,
  conclusionBoundary: "Tests executable guards and exposes local infeasibility; does not establish held-out performance, superiority or robustness.",
  results,
};
await writeFile(join(here, "development-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ fixtures: report.fixtures, expectationMatches: report.expectationMatches, usableFixtures: report.usableFixtures, noUsableActionFixtures: report.noUsableActionFixtures }, null, 2));
if (report.expectationMatches !== report.fixtures) process.exitCode = 1;
