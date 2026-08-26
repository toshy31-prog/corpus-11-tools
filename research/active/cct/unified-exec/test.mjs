import test from "node:test";
import assert from "node:assert/strict";
import { CctUnifiedRuntime, loadUnifiedSpec, validateUnifiedSpec } from "./runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];

function action({ tags = ["hold_noncoercive"], protects = [], harms = [], constitutional = [], cost = 0, burden = cost, actor = "public-service" } = {}) {
  return { tags, burden, actor, traceable: true, resourceCost: cost, protectsAxes: protects, harmsAxes: harms, constitutionalTags: constitutional };
}

const ontology = {
  hold: action(),
  rescue: action({ tags: ["vital_minimum", "recourse_open", "attributable_receipt"], protects: ["besoins_vitaux"], cost: 2 }),
  partial_vital: action({ tags: ["vital_minimum"], protects: ["besoins_vitaux"], cost: 1 }),
  safe_bundle: action({
    tags: ["vital_minimum", "recourse_open", "attributable_receipt", "provisional_signed", "preserve_divergence"],
    protects: ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"],
    cost: 5,
  }),
  majority_safe: action({ protects: ["droits", "attribution_du_pouvoir"], constitutional: ["preserve_opposition", "preserve_recourse"], cost: 2 }),
  abolition: action({ protects: ["droits", "attribution_du_pouvoir"], constitutional: ["suppress_opposition", "eliminate_recourse"], cost: 1 }),
  abolition_bundle: action({ protects: AXES, constitutional: ["disenfranchise_class"], cost: 2 }),
  harmful_bundle: action({ protects: AXES, harms: ["droits"], cost: 1 }),
};

function risk(id, axis, severity = 1, failureDomain = `${axis}-domain`) {
  return { id, axis, severity, confirmed: true, channel: `${axis}-channel`, failureDomain };
}

function grants(mechanismId, keys) {
  return keys.map((key) => ({ mechanismId, key, authorityTrace: `${mechanismId}:${key}:signed` }));
}

const vitalSignals = [
  { id: "v1", kind: "vital_denial", subject: "p", channel: "offline", failureDomain: "local", confirmed: true },
  { id: "v2", kind: "vital_denial", subject: "p", channel: "signed", failureDomain: "remote", confirmed: true },
];

function view({ tick = 0, axisRisks = [], capacityBudget = 10, actionOntology = ontology, signals = [], keyGrants = [], keyRevocations = [], evidence = [] } = {}) {
  return {
    cct: { tick, axisRisks, capacityBudget, actionOntology, signals, keyGrants, keyRevocations, evidence },
    publicState: { visible: 12 },
  };
}

test("unified spec is valid", () => assert.deepEqual(validateUnifiedSpec(loadUnifiedSpec()), []));

test("I13 is permanent and blocks majoritarian abolition", () => {
  const runtime = new CctUnifiedRuntime();
  const result = runtime.decide({ view: view({ axisRisks: [risk("r", "droits"), risk("p", "attribution_du_pouvoir")] }), allowedActions: ["abolition", "majority_safe"] });
  assert.equal(result.action, "majority_safe");
  assert.equal(result.governance.I13, "subject_capacities_preserved");
});

test("I13 fails closed when every action abolishes a protected capacity", () => {
  const runtime = new CctUnifiedRuntime();
  assert.throws(() => runtime.decide({ view: view(), allowedActions: ["abolition"] }), /CCT_I13_OR_BUDGET_NO_ADMISSIBLE_ACTION/);
  assert.equal(runtime.snapshot().trace.at(-1).event, "refusal");
});

test("I15 rejects partial protection under composed risk", () => {
  const runtime = new CctUnifiedRuntime();
  const result = runtime.decide({ view: view({ axisRisks: [risk("v", "besoins_vitaux", 5), risk("e", "plafond_ecologique", 1)] }), allowedActions: ["partial_vital", "safe_bundle"] });
  assert.equal(result.action, "safe_bundle");
  assert.equal(result.governance.I15, "all_active_axes_covered");
  assert.equal(result.governance.composed, true);
});

test("I15 exposes infeasibility when the shared budget cannot fund full coverage", () => {
  const runtime = new CctUnifiedRuntime();
  assert.throws(() => runtime.decide({ view: view({ axisRisks: [risk("v", "besoins_vitaux"), risk("e", "plafond_ecologique")], capacityBudget: 3 }), allowedActions: ["partial_vital", "safe_bundle"] }), /CCT_COMPOSED_PROTECTION_INFEASIBLE/);
  assert.equal(runtime.snapshot().trace.at(-1).composed, true);
});

test("no constitutional axis may be silently harmed", () => {
  const runtime = new CctUnifiedRuntime();
  const result = runtime.decide({ view: view({ axisRisks: [risk("v", "besoins_vitaux"), risk("e", "plafond_ecologique")] }), allowedActions: ["harmful_bundle", "safe_bundle"] });
  assert.equal(result.action, "safe_bundle");
});

test("I13 and I15 compose without letting a cheaper abolition shadow the safe bundle", () => {
  const runtime = new CctUnifiedRuntime();
  const result = runtime.decide({ view: view({ axisRisks: AXES.map((axis, index) => risk(`a${index}`, axis)) }), allowedActions: ["abolition_bundle", "safe_bundle"] });
  assert.equal(result.action, "safe_bundle");
});

test("NCE emergency obligations survive the unified gate", () => {
  const runtime = new CctUnifiedRuntime();
  const result = runtime.decide({
    view: view({ axisRisks: [risk("v", "besoins_vitaux")], signals: vitalSignals, keyGrants: grants("M14-01", ["continuity", "contradictor"]) }),
    allowedActions: ["partial_vital", "rescue"],
  });
  assert.equal(result.action, "rescue");
  assert.deepEqual(result.governance.nce.satisfiedTags, ["attributable_receipt", "recourse_open", "vital_minimum"]);
});

test("risk and action ordering do not change the tested decision", () => {
  const run = (axisRisks, allowedActions) => new CctUnifiedRuntime().decide({ view: view({ axisRisks }), allowedActions }).action;
  const risks = [risk("v", "besoins_vitaux"), risk("e", "plafond_ecologique")];
  assert.equal(run(risks, ["partial_vital", "safe_bundle"]), run([...risks].reverse(), ["safe_bundle", "partial_vital"]));
});

test("action names do not supply unified semantics", () => {
  const renamed = {
    oppressive_name: action({ protects: ["droits"], cost: 2 }),
    benevolent_name: action({ protects: ["droits"], constitutional: ["abolish_dignity"], cost: 1 }),
  };
  const result = new CctUnifiedRuntime().decide({ view: view({ axisRisks: [risk("r", "droits")], actionOntology: renamed }), allowedActions: Object.keys(renamed) });
  assert.equal(result.action, "oppressive_name");
});

test("missing extended public semantics fail closed", () => {
  const broken = { hold: { tags: [], burden: 0, actor: "x", traceable: true } };
  assert.throws(() => new CctUnifiedRuntime().decide({ view: view({ actionOntology: broken }), allowedActions: ["hold"] }), /CCT_EXEC_ACTION_SEMANTICS_MISSING/);
});

test("unknown constitutional axes are rejected", () => {
  const broken = { strange: action({ protects: ["unknown_axis"] }) };
  assert.throws(() => new CctUnifiedRuntime().decide({ view: view({ actionOntology: broken }), allowedActions: ["strange"] }), /CCT_EXEC_UNKNOWN_AXIS/);
});

test("predictions remain explicit", () => {
  const result = new CctUnifiedRuntime().decide({ view: view(), allowedActions: ["hold"], predictionKeys: ["x", "y"] });
  assert.deepEqual(Object.keys(result.predictions), ["x", "y"]);
});

test("no confirmed risk delegates ordinary selection without inventing a crisis", () => {
  const result = new CctUnifiedRuntime().decide({ view: view({ axisRisks: [{ ...risk("r", "droits"), confirmed: false }] }), allowedActions: ["hold", "majority_safe"] });
  assert.equal(result.governance.I15, "no_confirmed_axis_risk");
});

test("spec mutations cannot remove I13 permanence or the I15 failure fence", () => {
  const spec = loadUnifiedSpec();
  spec.I13.activation = "majority_transition_only";
  spec.I15.infeasibleRule = "choose the best scalar compromise";
  const errors = validateUnifiedSpec(spec).join("\n");
  assert.match(errors, /permanently active/);
  assert.match(errors, /fail closed/);
});
