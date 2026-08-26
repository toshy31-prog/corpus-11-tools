import { writeFileSync } from "node:fs";
import { CctSequencedRecoveryRuntime } from "./runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];

function action({ tags = ["hold_noncoercive"], protects = [], harms = [], constitutional = [], cost = 0,
  actor = "assembly-A", kind = "ordinary", vital = false, suspend = false, gain = 0, matures = 0,
  domain = "none", restores = [], bearers = ["affected-public"], recourse = "appeal-A" } = {}) {
  return { tags, burden: cost, actor, traceable: true, resourceCost: cost, protectsAxes: protects,
    harmsAxes: harms, constitutionalTags: constitutional, recoveryKind: kind, ensuresVitalMinimum: vital,
    suspendsIrreversibility: suspend, capacityGain: gain, gainMaturesAfterTicks: matures,
    gainFailureDomain: domain, restoresAxes: restores, responsibleActor: actor,
    debtBearers: bearers, recourseChannel: recourse };
}

const O = {
  full: action({ kind: "full_protection", protects: AXES, cost: 8 }),
  triage: action({ kind: "triage", tags: ["vital_minimum", "recourse_open", "attributable_receipt"], protects: ["besoins_vitaux"], vital: true, suspend: true, cost: 2, bearers: ["residents", "workers"] }),
  capacity: action({ kind: "capacity_acquisition", protects: ["besoins_vitaux"], vital: true, suspend: true, gain: 6, matures: 1, domain: "mobile-logistics", cost: 2 }),
  restore: action({ kind: "restoration", protects: AXES, restores: AXES, vital: true, suspend: true, cost: 8 }),
  unsafe: action({ kind: "triage", protects: ["besoins_vitaux"], vital: true, suspend: false, cost: 1 }),
  abolition: action({ kind: "triage", protects: ["besoins_vitaux"], vital: true, suspend: true, constitutional: ["suppress_opposition"], cost: 1 }),
};

const risks = [
  { id: "v", axis: "besoins_vitaux", severity: 5, confirmed: true, channel: "vital-channel", failureDomain: "vital-domain" },
  { id: "e", axis: "plafond_ecologique", severity: 4, confirmed: true, channel: "eco-channel", failureDomain: "eco-domain" },
  { id: "r", axis: "droits", severity: 3, confirmed: true, channel: "rights-channel", failureDomain: "rights-domain" },
];

function view(tick, budget, { capacityReceipts = [], repairReceipts = [], ontology = O } = {}) {
  return { cct: { tick, axisRisks: risks, capacityBudget: budget, actionOntology: ontology,
    capacityReceipts, repairReceipts, signals: [], keyGrants: [], keyRevocations: [], evidence: [] }, publicState: { visible: 1 } };
}

function gainReceipt(overrides = {}) {
  return { id: "gain-1", confirmed: true, action: "capacity", enactedAt: 1, effectiveAt: 2,
    amount: 6, failureDomain: "mobile-logistics", actor: "assembly-A", authorityTrace: "auditor-B:signed:gain-1",
    observerActor: "auditor-B", observerFailureDomain: "fixed-audit", ...overrides };
}

function repairReceipt(debt, overrides = {}) {
  return { id: `repair:${debt.axis}`, confirmed: true, debtId: debt.id, axis: debt.axis, action: "restore",
    actor: "assembly-A", recourseChannel: "appeal-A", authorityTrace: `auditor-B:signed:${debt.id}`,
    observerActor: "auditor-B", capacityRestored: true, recourseOpen: true, nonRepetition: true,
    remainingLoss: [], ...overrides };
}

function call(runtime, tick, budget, allowedActions, extras = {}) {
  return runtime.decide({ view: view(tick, budget, extras), allowedActions });
}

function expectError(run, code) {
  try { run(); return { observed: "NO_ERROR", matched: false }; }
  catch (error) { return { observed: error.message, matched: error.message.includes(code) }; }
}

function begin() {
  const runtime = new CctSequencedRecoveryRuntime();
  call(runtime, 0, 3, ["triage", "full"]);
  return runtime;
}

const attacks = [
  {
    id: "A11-01-full-protection-preemption", expected: "full_protection",
    classification: "usable_without_debt",
    run() { const r = new CctSequencedRecoveryRuntime(); return call(r, 0, 9, ["triage", "full"]).governance.phase; },
  },
  {
    id: "A11-02-complete-sequence", expected: "full_protection",
    classification: "usable_sequence",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); call(r, 2, 9, ["restore"], { capacityReceipts: [gainReceipt()] }); const debts = r.snapshot().state.debts; return call(r, 3, 9, ["full"], { repairReceipts: debts.map(repairReceipt) }).governance.phase; },
  },
  {
    id: "A11-03-paper-capacity-gain", expected: "CCT_CAPACITY_GAIN_UNVERIFIED",
    classification: "protected_failure",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); return expectError(() => call(r, 2, 100, ["restore"]), "CCT_CAPACITY_GAIN_UNVERIFIED").observed; },
  },
  {
    id: "A11-04-self-certified-gain", expected: "CCT_CAPACITY_GAIN_UNVERIFIED",
    classification: "protected_failure",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); return expectError(() => call(r, 2, 9, ["restore"], { capacityReceipts: [gainReceipt({ observerActor: "assembly-A" })] }), "CCT_CAPACITY_GAIN_UNVERIFIED").observed; },
  },
  {
    id: "A11-05-no-safe-triage", expected: "CCT_TRIAGE_INFEASIBLE",
    classification: "material_failure_preserved",
    run() { const r = new CctSequencedRecoveryRuntime(); return expectError(() => call(r, 0, 3, ["unsafe", "full"]), "CCT_TRIAGE_INFEASIBLE").observed; },
  },
  {
    id: "A11-06-no-capacity-path", expected: "CCT_CAPACITY_ACQUISITION_INFEASIBLE",
    classification: "material_failure_preserved",
    run() { const r = begin(); return expectError(() => call(r, 1, 3, ["triage"]), "CCT_CAPACITY_ACQUISITION_INFEASIBLE").observed; },
  },
  {
    id: "A11-07-common-cause-budget-collapse", expected: "CCT_RECOVERY_BUDGET_COLLAPSE",
    classification: "material_failure_preserved",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); return expectError(() => call(r, 2, 3, ["restore"], { capacityReceipts: [gainReceipt()] }), "CCT_RECOVERY_BUDGET_COLLAPSE").observed; },
  },
  {
    id: "A11-08-deadline-miss", expected: "CCT_REPAIR_DEADLINE_MISSED",
    classification: "terminal_failure_exposed",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); call(r, 2, 9, ["restore"], { capacityReceipts: [gainReceipt()] }); return expectError(() => call(r, 4, 9, ["restore"]), "CCT_REPAIR_DEADLINE_MISSED").observed; },
  },
  {
    id: "A11-09-I13-emergency-abolition", expected: "CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION",
    classification: "material_failure_preserved",
    run() { const r = new CctSequencedRecoveryRuntime(); return expectError(() => call(r, 0, 3, ["abolition"]), "CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION").observed; },
  },
  {
    id: "A11-10-self-certified-repair", expected: "CCT_REPAIR_DEADLINE_MISSED",
    classification: "terminal_failure_exposed",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); call(r, 2, 9, ["restore"], { capacityReceipts: [gainReceipt()] }); const debts = r.snapshot().state.debts; return expectError(() => call(r, 4, 9, ["full"], { repairReceipts: debts.map((d) => repairReceipt(d, { observerActor: "assembly-A" })) }), "CCT_REPAIR_DEADLINE_MISSED").observed; },
  },
  {
    id: "A11-11-residual-loss-visible", expected: "named_residual",
    classification: "limitation_exposed",
    run() { const r = begin(); call(r, 1, 3, ["capacity"]); call(r, 2, 9, ["restore"], { capacityReceipts: [gainReceipt()] }); const debts = r.snapshot().state.debts; call(r, 3, 9, ["full"], { repairReceipts: debts.map((d) => repairReceipt(d, { remainingLoss: ["lost-time"] })) }); return r.snapshot().state.debts.every((d) => d.remainingLoss.includes("lost-time")) ? "named_residual" : "residual_erased"; },
  },
  {
    id: "A11-12-exogenous-capacity-shortcut", expected: "restoration_due",
    classification: "usable_shortcut",
    run() { const r = begin(); return call(r, 1, 9, ["capacity", "restore"]).governance.phase; },
  },
];

const results = attacks.map(({ id, expected, classification, run }) => {
  let observed;
  try { observed = run(); } catch (error) { observed = `UNEXPECTED:${error.message}`; }
  return { id, expected, observed, behaviorMatched: observed === expected, classification };
});

const counts = {};
for (const result of results) counts[result.classification] = (counts[result.classification] ?? 0) + 1;
const report = {
  schema: "cct-sequenced-recovery-development/v1",
  candidate: "CCT-EXEC-1.1-CANDIDATE-001",
  generatedAt: "2026-08-26",
  sourceRegime: "internal_synthetic_development_only",
  lifecycleBoundary: "Behavior matches on maintainer-authored attacks do not establish robustness, authorization, deployment or external transport.",
  vectorSummary: { total: results.length, behaviorMatched: results.filter((r) => r.behaviorMatched).length, behaviorMismatch: results.filter((r) => !r.behaviorMatched).length, classifications: counts },
  noScalarWinner: true,
  materialFailuresRemainFailures: results.filter((r) => r.classification.includes("material_failure") || r.classification.includes("terminal_failure")).map((r) => r.id),
  results,
};

writeFileSync(new URL("./development-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.vectorSummary));
if (results.some((result) => !result.behaviorMatched)) process.exitCode = 1;
