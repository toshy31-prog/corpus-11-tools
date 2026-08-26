import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CctSequencedRecoveryRuntime, loadRecoverySpec, validateRecoverySpec } from "./runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];

function action({
  tags = ["hold_noncoercive"], protects = [], harms = [], constitutional = [], cost = 0,
  burden = cost, actor = "public-service", kind = "ordinary", vital = false, suspend = false,
  gain = 0, matures = 0, domain = "none", restores = [], bearers = ["affected-public"], recourse = "public-recourse",
} = {}) {
  return {
    tags, burden, actor, traceable: true, resourceCost: cost, protectsAxes: protects,
    harmsAxes: harms, constitutionalTags: constitutional, recoveryKind: kind,
    ensuresVitalMinimum: vital, suspendsIrreversibility: suspend, capacityGain: gain,
    gainMaturesAfterTicks: matures, gainFailureDomain: domain, restoresAxes: restores,
    responsibleActor: actor, debtBearers: bearers, recourseChannel: recourse,
  };
}

const ontology = {
  hold: action(),
  full: action({ kind: "full_protection", protects: AXES, cost: 8 }),
  cheap_full: action({ kind: "full_protection", protects: AXES, cost: 2 }),
  triage: action({
    kind: "triage", tags: ["vital_minimum", "recourse_open", "attributable_receipt"],
    protects: ["besoins_vitaux"], vital: true, suspend: true, cost: 2,
    actor: "assembly-A", bearers: ["delta-residents", "estuary-workers"], recourse: "appeal-A",
  }),
  capacity: action({
    kind: "capacity_acquisition", protects: ["besoins_vitaux"], vital: true, suspend: true,
    gain: 6, matures: 1, domain: "mobile-logistics", cost: 2, actor: "assembly-A",
  }),
  fake_capacity: action({
    kind: "capacity_acquisition", protects: ["besoins_vitaux"], vital: true, suspend: true,
    gain: 99, matures: 1, domain: "paper-only", cost: 1, actor: "assembly-A",
  }),
  restore: action({
    kind: "restoration", tags: ["vital_minimum", "recourse_open", "attributable_receipt"],
    protects: AXES, restores: AXES, vital: true, suspend: true, cost: 8, actor: "assembly-A", recourse: "appeal-A",
  }),
  abolition_triage: action({
    kind: "triage", protects: ["besoins_vitaux"], vital: true, suspend: true, cost: 1,
    constitutional: ["suppress_opposition"], actor: "assembly-A",
  }),
  harmful_capacity: action({
    kind: "capacity_acquisition", protects: ["besoins_vitaux"], harms: ["droits"], vital: true,
    suspend: true, gain: 9, matures: 1, domain: "coercive", cost: 1, actor: "assembly-A",
  }),
  mislabeled_benevolent: action({
    kind: "triage", protects: ["besoins_vitaux"], vital: true, suspend: true, cost: 1,
    constitutional: ["eliminate_recourse"], actor: "assembly-A",
  }),
  mislabeled_oppressive: action({
    kind: "triage", protects: ["besoins_vitaux"], vital: true, suspend: true, cost: 2, actor: "assembly-A",
  }),
};

function risk(id, axis, severity = 1) {
  return { id, axis, severity, confirmed: true, channel: `${axis}-channel`, failureDomain: `${axis}-domain` };
}

function view({ tick = 0, axisRisks = [], capacityBudget = 10, actionOntology = ontology,
  capacityReceipts = [], repairReceipts = [], signals = [], keyGrants = [], keyRevocations = [], evidence = [] } = {}) {
  return {
    cct: { tick, axisRisks, capacityBudget, actionOntology, capacityReceipts, repairReceipts, signals, keyGrants, keyRevocations, evidence },
    publicState: { visible: 12 },
  };
}

const crisis = [risk("v", "besoins_vitaux", 5), risk("e", "plafond_ecologique", 4), risk("r", "droits", 3)];

function gainReceipt(overrides = {}) {
  return { id: "gain-1", confirmed: true, action: "capacity", enactedAt: 1, effectiveAt: 2, amount: 6, failureDomain: "mobile-logistics", actor: "assembly-A", authorityTrace: "auditor-B:signed:gain-1", observerActor: "auditor-B", observerFailureDomain: "fixed-civic-audit", ...overrides };
}

function repairReceipt(debt, overrides = {}) {
  return {
    id: `repair:${debt.axis}`, confirmed: true, debtId: debt.id, axis: debt.axis,
    action: "restore", actor: "assembly-A", recourseChannel: "appeal-A",
    authorityTrace: `auditor-B:signed:${debt.id}`, observerActor: "auditor-B",
    capacityRestored: true, recourseOpen: true, nonRepetition: true, remainingLoss: [], ...overrides,
  };
}

function startRecovery(runtime = new CctSequencedRecoveryRuntime()) {
  const first = runtime.decide({ view: view({ tick: 0, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["triage", "full"] });
  return { runtime, first };
}

function reachRestoration(runtime) {
  runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["capacity", "full"] });
  return runtime.decide({
    view: view({ tick: 2, axisRisks: crisis, capacityBudget: 9, capacityReceipts: [gainReceipt()] }),
    allowedActions: ["restore"],
  });
}

test("recovery spec is valid", () => assert.deepEqual(validateRecoverySpec(loadRecoverySpec()), []));

test("full protection is selected immediately when feasible", () => {
  const result = new CctSequencedRecoveryRuntime().decide({ view: view({ tick: 0, axisRisks: crisis, capacityBudget: 9 }), allowedActions: ["triage", "full"] });
  assert.equal(result.action, "full");
  assert.equal(result.governance.constitutionalStatus, "no_open_repair_debt");
});

test("infeasibility starts with vital minimum and irreversibility suspension", () => {
  const { first } = startRecovery();
  assert.equal(first.action, "triage");
  assert.equal(first.governance.phase, "triage_immediate");
  assert.equal(first.governance.constitutionalStatus, "breach_and_repair_debt");
});

test("one attributable debt is created for every uncovered axis", () => {
  const { runtime } = startRecovery();
  const debts = runtime.snapshot().state.debts;
  assert.deepEqual(debts.map((item) => item.axis), ["droits", "plafond_ecologique"]);
  assert.ok(debts.every((item) => item.deadline === 3 && item.responsibleActor === "assembly-A" && item.recourseChannel === "appeal-A"));
  assert.deepEqual(debts[0].bearerIds, ["delta-residents", "estuary-workers"]);
});

test("sequencing acquires capacity only through a declared bounded gain", () => {
  const { runtime } = startRecovery();
  const result = runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["capacity"] });
  assert.equal(result.action, "capacity");
  assert.deepEqual(result.governance.pendingGain, { action: "capacity", enactedAt: 1, dueAt: 2, amount: 6, failureDomain: "mobile-logistics", actor: "assembly-A" });
});

test("a declared gain without its matching public receipt is terminal failure", () => {
  const { runtime } = startRecovery();
  runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["fake_capacity"] });
  assert.throws(() => runtime.decide({ view: view({ tick: 2, axisRisks: crisis, capacityBudget: 100 }), allowedActions: ["restore"] }), /CCT_CAPACITY_GAIN_UNVERIFIED/);
  assert.equal(runtime.snapshot().state.phase, "terminal_failure");
});

test("a mismatched receipt cannot validate a capacity gain", () => {
  const { runtime } = startRecovery();
  runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["capacity"] });
  assert.throws(() => runtime.decide({ view: view({ tick: 2, axisRisks: crisis, capacityBudget: 9, capacityReceipts: [gainReceipt({ amount: 7 })] }), allowedActions: ["restore"] }), /CCT_CAPACITY_GAIN_UNVERIFIED/);
});

test("a self-certified capacity receipt cannot validate a gain", () => {
  const { runtime } = startRecovery();
  runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["capacity"] });
  assert.throws(() => runtime.decide({
    view: view({ tick: 2, axisRisks: crisis, capacityBudget: 9, capacityReceipts: [gainReceipt({ observerActor: "assembly-A" })] }),
    allowedActions: ["restore"],
  }), /CCT_CAPACITY_GAIN_UNVERIFIED/);
});

test("a verified gain permits restoration but does not erase debt", () => {
  const { runtime } = startRecovery();
  const result = reachRestoration(runtime);
  assert.equal(result.action, "restore");
  assert.equal(result.governance.constitutionalStatus, "breach_pending_receipts");
  assert.ok(runtime.snapshot().state.debts.every((item) => item.status === "open"));
});

test("complete repair receipts close debt and return to full protection", () => {
  const { runtime } = startRecovery();
  reachRestoration(runtime);
  const debts = runtime.snapshot().state.debts;
  const result = runtime.decide({
    view: view({ tick: 3, axisRisks: crisis, capacityBudget: 9, repairReceipts: debts.map((item) => repairReceipt(item)) }),
    allowedActions: ["full"],
  });
  assert.equal(result.governance.phase, "full_protection");
  assert.ok(runtime.snapshot().state.debts.every((item) => item.status === "closed"));
});

test("an incomplete repair receipt cannot erase debt", () => {
  const { runtime } = startRecovery();
  reachRestoration(runtime);
  const debt = runtime.snapshot().state.debts[0];
  assert.throws(() => runtime.decide({
    view: view({ tick: 4, axisRisks: crisis, capacityBudget: 9, repairReceipts: [repairReceipt(debt, { recourseOpen: false })] }),
    allowedActions: ["full"],
  }), /CCT_REPAIR_DEADLINE_MISSED/);
});

test("a self-certified repair receipt cannot erase debt", () => {
  const { runtime } = startRecovery();
  reachRestoration(runtime);
  const debts = runtime.snapshot().state.debts;
  assert.throws(() => runtime.decide({
    view: view({ tick: 4, axisRisks: crisis, capacityBudget: 9, repairReceipts: debts.map((debt) => repairReceipt(debt, { observerActor: "assembly-A" })) }),
    allowedActions: ["full"],
  }), /CCT_REPAIR_DEADLINE_MISSED/);
});

test("a missed public repair deadline is terminal failure", () => {
  const { runtime } = startRecovery();
  reachRestoration(runtime);
  assert.throws(() => runtime.decide({ view: view({ tick: 4, axisRisks: crisis, capacityBudget: 9 }), allowedActions: ["restore"] }), /CCT_REPAIR_DEADLINE_MISSED/);
  assert.equal(runtime.snapshot().state.terminalFailure.code, "CCT_REPAIR_DEADLINE_MISSED");
});

test("even complete repair receipts are rejected after the deadline", () => {
  const { runtime } = startRecovery();
  reachRestoration(runtime);
  const debts = runtime.snapshot().state.debts;
  assert.throws(() => runtime.decide({
    view: view({ tick: 4, axisRisks: crisis, capacityBudget: 9, repairReceipts: debts.map((item) => repairReceipt(item)) }),
    allowedActions: ["full"],
  }), /CCT_REPAIR_DEADLINE_MISSED/);
});

test("I13 remains active during triage", () => {
  const result = new CctSequencedRecoveryRuntime().decide({
    view: view({ tick: 0, axisRisks: crisis, capacityBudget: 3 }),
    allowedActions: ["abolition_triage", "triage", "full"],
  });
  assert.equal(result.action, "triage");
});

test("constitutional harm cannot be smuggled into capacity acquisition", () => {
  const { runtime } = startRecovery();
  const result = runtime.decide({ view: view({ tick: 1, axisRisks: crisis, capacityBudget: 3 }), allowedActions: ["harmful_capacity", "capacity"] });
  assert.equal(result.action, "capacity");
});

test("action names never supply constitutional semantics", () => {
  const result = new CctSequencedRecoveryRuntime().decide({
    view: view({ tick: 0, axisRisks: crisis, capacityBudget: 3 }),
    allowedActions: ["mislabeled_benevolent", "mislabeled_oppressive", "full"],
  });
  assert.equal(result.action, "mislabeled_oppressive");
});

test("risk and action ordering do not change the triage decision or debt set", () => {
  const run = (risks, actions) => {
    const runtime = new CctSequencedRecoveryRuntime();
    const result = runtime.decide({ view: view({ tick: 0, axisRisks: risks, capacityBudget: 3 }), allowedActions: actions });
    return [result.action, runtime.snapshot().state.debts.map((item) => item.axis).sort()];
  };
  assert.deepEqual(run(crisis, ["triage", "full"]), run([...crisis].reverse(), ["full", "triage"]));
});

test("missing recovery semantics fail closed", () => {
  const broken = { hold: { tags: [], burden: 0, actor: "x", traceable: true } };
  assert.throws(() => new CctSequencedRecoveryRuntime().decide({ view: view({ actionOntology: broken }), allowedActions: ["hold"] }), /CCT_RECOVERY_ACTION_SEMANTICS_MISSING/);
});

test("non-monotonic public time is rejected", () => {
  const runtime = new CctSequencedRecoveryRuntime();
  runtime.decide({ view: view({ tick: 1 }), allowedActions: ["hold"] });
  assert.throws(() => runtime.decide({ view: view({ tick: 1 }), allowedActions: ["hold"] }), /CCT_RECOVERY_TICK_NOT_MONOTONIC/);
});

test("NCE emergency obligations survive sequenced triage", () => {
  const signals = [
    { id: "v1", kind: "vital_denial", subject: "p", channel: "offline", failureDomain: "local", confirmed: true },
    { id: "v2", kind: "vital_denial", subject: "p", channel: "signed", failureDomain: "remote", confirmed: true },
  ];
  const keyGrants = ["continuity", "contradictor"].map((key) => ({ mechanismId: "M14-01", key, authorityTrace: `M14-01:${key}:signed` }));
  const result = new CctSequencedRecoveryRuntime().decide({
    view: view({ tick: 0, axisRisks: crisis, capacityBudget: 3, signals, keyGrants }),
    allowedActions: ["triage", "full"],
  });
  assert.deepEqual(result.governance.nce.satisfiedTags, ["attributable_receipt", "recourse_open", "vital_minimum"]);
});

test("spec mutation cannot normalize temporary breach or suspend I13", () => {
  const spec = loadRecoverySpec();
  spec.constitutionalBoundary.temporaryDeficitStatus = "acceptable_compromise";
  spec.constitutionalBoundary.I13Activation = "except_emergency";
  spec.sequence.terminalRule = "average remaining losses";
  const errors = validateRecoverySpec(spec).join("\n");
  assert.match(errors, /constitutional breach/);
  assert.match(errors, /permanently active/);
  assert.match(errors, /terminal failure/);
});

test("the candidate specification contains no aggregate score or winner field", () => {
  const raw = readFileSync(new URL("./spec.json", import.meta.url), "utf8");
  assert.doesNotMatch(raw, /aggregateScore|scalarWinner|\"winner\"/);
});
