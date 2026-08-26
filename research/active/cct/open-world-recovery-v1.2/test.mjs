import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CctOpenWorldRecoveryRuntime, loadOpenWorldSpec, validateOpenWorldSpec } from "./runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];

function effect(overrides = {}, extra = {}) {
  return {
    axisDeltas: Object.fromEntries(AXES.map((axis) => [axis, overrides[axis] ?? 0])),
    observedFrom: "public_immediate_effects",
    noFutureLeak: true,
    ...extra,
  };
}

function action({
  protects = [], harms = [], constitutional = [], cost = 0, kind = "ordinary",
  vital = false, ecology = false, gain = 0, matures = 0, domain = "none", restores = [],
  actor = "assembly-A", bearers = ["affected-public"], recourse = "appeal-A", evidence,
} = {}) {
  const result = {
    tags: ["public-action"], burden: cost, actor, traceable: true, resourceCost: cost,
    protectsAxes: protects, harmsAxes: harms, constitutionalTags: constitutional,
    recoveryKind: kind, ensuresVitalMinimum: vital, suspendsIrreversibility: ecology,
    capacityGain: gain, gainMaturesAfterTicks: matures, gainFailureDomain: domain,
    restoresAxes: restores, responsibleActor: actor, debtBearers: bearers, recourseChannel: recourse,
  };
  if (evidence) result.effectEvidence = evidence;
  return result;
}

const crisis = [
  { id: "v", axis: "besoins_vitaux", severity: 5, confirmed: true, channel: "vital", failureDomain: "vital" },
  { id: "e", axis: "plafond_ecologique", severity: 4, confirmed: true, channel: "eco", failureDomain: "eco" },
  { id: "r", axis: "droits", severity: 3, confirmed: true, channel: "rights", failureDomain: "rights" },
];

const O = {
  full: action({ protects: AXES, cost: 8, kind: "full_protection" }),
  legacy_triage: action({ protects: ["besoins_vitaux", "plafond_ecologique"], cost: 2, kind: "triage", vital: true, ecology: true }),
  evidence_triage: action({ cost: 2, evidence: effect({ besoins_vitaux: 2, plafond_ecologique: 1, droits: -1 }) }),
  evidence_capacity: action({ cost: 1, evidence: effect({ portabilite_effective: 2, droits: -1 }) }),
  restore: action({ protects: AXES, restores: AXES, cost: 4, kind: "restoration", vital: true, ecology: true }),
  harmful_only: action({ cost: 1, evidence: effect({ besoins_vitaux: 1, droits: -2 }) }),
  forbidden: action({ constitutional: ["suppress_opposition"], cost: 1, evidence: effect({ besoins_vitaux: 2, plafond_ecologique: 2 }) }),
};

function view({ tick = 0, risks = crisis, budget = 4, ontology = O, capacityReceipts = [], repairReceipts = [] } = {}) {
  return { cct: { tick, axisRisks: risks, capacityBudget: budget, actionOntology: ontology, capacityReceipts, repairReceipts, signals: [], keyGrants: [], keyRevocations: [], evidence: [] }, visible: 1 };
}

function decide(runtime, tick, allowedActions, extras = {}) {
  return runtime.decide({ view: view({ tick, ...extras }), allowedActions, predictionKeys: ["visible"] });
}

function gainReceipt(overrides = {}) {
  return {
    id: "gain-1", confirmed: true, action: "evidence_capacity", enactedAt: 1, effectiveAt: 2,
    amount: 2, failureDomain: "public-effect-evidence", actor: "assembly-A",
    authorityTrace: "auditor-B:signed:gain-1", observerActor: "auditor-B",
    observerFailureDomain: "independent-audit", ...overrides,
  };
}

function repairReceipt(debt, overrides = {}) {
  return {
    id: `repair:${debt.axis}`, confirmed: true, debtId: debt.id, axis: debt.axis,
    action: "restore", actor: "assembly-A", recourseChannel: "appeal-A",
    authorityTrace: `auditor-B:signed:${debt.id}`, observerActor: "auditor-B",
    capacityRestored: true, recourseOpen: true, nonRepetition: true, remainingLoss: [], ...overrides,
  };
}

function beginEvidenceRecovery() {
  const runtime = new CctOpenWorldRecoveryRuntime();
  const first = decide(runtime, 0, ["evidence_triage", "full"]);
  return { runtime, first };
}

test("1.2 specification validates", () => assert.deepEqual(validateOpenWorldSpec(loadOpenWorldSpec()), []));

test("full zero-harm protection remains prior to sequencing", () => {
  const result = decide(new CctOpenWorldRecoveryRuntime(), 0, ["evidence_triage", "full"], { budget: 9 });
  assert.equal(result.action, "full");
  assert.equal(result.governance.phase, "full_protection");
});

test("legacy 1.1 triage semantics remain executable", () => {
  const result = decide(new CctOpenWorldRecoveryRuntime(), 0, ["legacy_triage", "full"]);
  assert.equal(result.action, "legacy_triage");
  assert.equal(result.governance.phase, "triage_immediate");
});

test("public effect evidence can infer triage without a predeclared recovery kind", () => {
  const { first } = beginEvidenceRecovery();
  assert.equal(first.action, "evidence_triage");
  assert.equal(first.governance.phase, "triage_immediate");
  assert.deepEqual(first.governance.harmedAxes, ["droits"]);
});

test("a material harm creates debt and is not mislabeled I13", () => {
  const { runtime } = beginEvidenceRecovery();
  const snapshot = runtime.snapshot();
  assert.equal(snapshot.trace.some((entry) => entry.code === "CCT_I13_NO_ADMISSIBLE_ACTION"), false);
  assert.deepEqual(snapshot.state.debts.map((debt) => debt.axis), ["droits"]);
});

test("I13 refusal requires an actual forbidden constitutional tag", () => {
  assert.throws(() => decide(new CctOpenWorldRecoveryRuntime(), 0, ["forbidden"]), /CCT_I13_NO_ADMISSIBLE_ACTION/);
});

test("no full or triage path is classified as capacity failure, not I13", () => {
  assert.throws(() => decide(new CctOpenWorldRecoveryRuntime(), 0, ["harmful_only"]), /CCT_FULL_PROTECTION_INFEASIBLE/);
});

test("budget failure is distinct from I13", () => {
  assert.throws(() => decide(new CctOpenWorldRecoveryRuntime(), 0, ["evidence_triage"], { budget: 0 }), /CCT_BUDGET_NO_ADMISSIBLE_ACTION/);
});

test("public effect evidence can nominate capacity acquisition while preserving floors", () => {
  const { runtime } = beginEvidenceRecovery();
  const result = decide(runtime, 1, ["evidence_capacity"]);
  assert.equal(result.action, "evidence_capacity");
  assert.equal(result.governance.phase, "capacity_acquisition");
  assert.deepEqual(result.governance.pendingGain, { action: "evidence_capacity", enactedAt: 1, dueAt: 2, amount: 2, failureDomain: "public-effect-evidence", actor: "assembly-A" });
});

test("acquisition harm adds debt without extending the original deadline", () => {
  const { runtime } = beginEvidenceRecovery();
  decide(runtime, 1, ["evidence_capacity"]);
  const debts = runtime.snapshot().state.debts;
  assert.deepEqual(debts.map((debt) => debt.axis), ["droits"]);
  assert.ok(debts.every((debt) => debt.deadline === 3));
});

test("effect evidence never certifies its own capacity gain", () => {
  const { runtime } = beginEvidenceRecovery();
  decide(runtime, 1, ["evidence_capacity"]);
  assert.throws(() => decide(runtime, 2, ["restore"]), /CCT_CAPACITY_GAIN_UNVERIFIED/);
  assert.equal(runtime.snapshot().state.phase, "terminal_failure");
});

test("self-certified capacity receipt remains invalid", () => {
  const { runtime } = beginEvidenceRecovery();
  decide(runtime, 1, ["evidence_capacity"]);
  assert.throws(() => decide(runtime, 2, ["restore"], { capacityReceipts: [gainReceipt({ observerActor: "assembly-A" })] }), /CCT_CAPACITY_GAIN_UNVERIFIED/);
});

test("independent capacity receipt permits a restoration attempt but not debt erasure", () => {
  const { runtime } = beginEvidenceRecovery();
  decide(runtime, 1, ["evidence_capacity"]);
  const result = decide(runtime, 2, ["restore"], { capacityReceipts: [gainReceipt()] });
  assert.equal(result.action, "restore");
  assert.ok(runtime.snapshot().state.debts.every((debt) => debt.status === "open"));
});

test("complete repair receipt closes debt and returns to full protection", () => {
  const { runtime } = beginEvidenceRecovery();
  decide(runtime, 1, ["evidence_capacity"]);
  decide(runtime, 2, ["restore"], { capacityReceipts: [gainReceipt()] });
  const debts = runtime.snapshot().state.debts;
  const result = decide(runtime, 3, ["full"], { budget: 9, repairReceipts: debts.map(repairReceipt) });
  assert.equal(result.governance.phase, "full_protection");
  assert.ok(runtime.snapshot().state.debts.every((debt) => debt.status === "closed"));
});

test("future-leaking effect evidence is rejected", () => {
  const ontology = { leak: action({ evidence: effect({ besoins_vitaux: 2, plafond_ecologique: 2 }, { noFutureLeak: false }) }) };
  assert.throws(() => decide(new CctOpenWorldRecoveryRuntime(), 0, ["leak"], { ontology }), /CCT_OPEN_WORLD_ACTION_SEMANTICS_INVALID/);
});

test("unsupported evidence source is rejected", () => {
  const ontology = { hidden: action({ evidence: effect({ besoins_vitaux: 2, plafond_ecologique: 2 }, { observedFrom: "hidden_world_truth" }) }) };
  assert.throws(() => decide(new CctOpenWorldRecoveryRuntime(), 0, ["hidden"], { ontology }), /CCT_OPEN_WORLD_ACTION_SEMANTICS_INVALID/);
});

test("missing institutional attribution stays explicitly unresolved", () => {
  const ontology = {
    unresolved: action({ actor: "unspecified-virelia-operator", recourse: "absent-in-virelia-source", evidence: effect({ besoins_vitaux: 2, plafond_ecologique: 2, droits: -1 }) }),
    full: O.full,
  };
  const runtime = new CctOpenWorldRecoveryRuntime();
  decide(runtime, 0, ["unresolved", "full"], { ontology });
  assert.equal(runtime.snapshot().state.debts[0].attributionStatus, "institutional_attribution_unresolved");
});

test("spec mutation cannot restore harm/I13 conflation or accept self-certification", () => {
  const spec = loadOpenWorldSpec();
  spec.boundaries.I13 = "all material harms are I13";
  spec.boundaries.materialHarm = "renamed I13";
  spec.sequence.deadlineExtension = "allowed";
  const errors = validateOpenWorldSpec(spec).join("\n");
  assert.match(errors, /I13\/tag-only/);
  assert.match(errors, /material harm attribution/);
  assert.match(errors, /deadline extension/);
});

test("candidate source contains no aggregate winner", () => {
  assert.doesNotMatch(readFileSync(new URL("./spec.json", import.meta.url), "utf8"), /aggregateScore|scalarWinner|"winner"/);
});
