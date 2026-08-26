import test from "node:test";
import assert from "node:assert/strict";
import {
  CctSequencedRestorationRuntime,
  loadSequencedRestorationSpec,
  validateSequencedRestorationSpec,
} from "./runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];
const risk = (axis) => ({ id: axis, axis, severity: 3, confirmed: true, channel: axis, failureDomain: axis });
const risks = [risk("besoins_vitaux"), risk("plafond_ecologique"), risk("droits"), risk("attribution_du_pouvoir")];
const deltas = (overrides = {}) => Object.fromEntries(AXES.map((axis) => [axis, overrides[axis] ?? 0]));
const channel = (id, actor, domain) => ({ id, observerActor: actor, failureDomain: domain, targetAxes: ["portabilite_effective"] });

function action({ kind = "ordinary", gain = 0, maturation = gain ? 1 : 0, target = [], restores = [], delta = {}, channels = [], cost = 1, actor = "assembly-A" } = {}) {
  const axisDeltas = deltas(delta);
  return {
    tags: ["public-action"], burden: cost, actor, traceable: true, resourceCost: cost,
    protectsAxes: AXES.filter((axis) => axisDeltas[axis] > 0),
    harmsAxes: AXES.filter((axis) => axisDeltas[axis] < 0),
    constitutionalTags: [], recoveryKind: kind,
    ensuresVitalMinimum: axisDeltas.besoins_vitaux > 0,
    suspendsIrreversibility: axisDeltas.plafond_ecologique > 0,
    capacityGain: gain, gainMaturesAfterTicks: maturation, gainFailureDomain: gain ? "gain-domain" : "none",
    restoresAxes: restores, responsibleActor: actor, debtBearers: ["affected-public"], recourseChannel: "appeal-A",
    effectEvidence: { axisDeltas, observedFrom: "public_immediate_effects", noFutureLeak: true },
    verificationChannelsOpened: channels, verificationTargetAxes: target,
  };
}

const channels = [channel("c1", "auditor-B", "sensor-domain"), channel("c2", "auditor-C", "community-domain")];
const O = {
  triage: action({ kind: "triage", delta: { besoins_vitaux: 2, plafond_ecologique: 2, droits: -1, attribution_du_pouvoir: -1 }, channels }),
  acquire: action({ kind: "capacity_acquisition", gain: 2, target: ["portabilite_effective"], delta: { portabilite_effective: 2 } }),
  restore_rights: action({ kind: "restoration", restores: ["droits"], delta: { droits: 1 } }),
  restore_power: action({ kind: "restoration", restores: ["attribution_du_pouvoir"], delta: { attribution_du_pouvoir: 1 } }),
  restore_both: action({ kind: "restoration", restores: ["droits", "attribution_du_pouvoir"], delta: { droits: 1, attribution_du_pouvoir: 1 } }),
  hold: action({ delta: {} }),
  full: action({ kind: "full_protection", delta: { besoins_vitaux: 1, plafond_ecologique: 1, droits: 1, attribution_du_pouvoir: 1 } }),
};

function view(tick, { verificationReceipts = [], repairReceipts = [], ontology = O } = {}) {
  return { visible: 1, cct: {
    tick, axisRisks: risks, capacityBudget: 10, actionOntology: ontology,
    capacityReceipts: [], repairReceipts, verificationReceipts,
    signals: [], keyGrants: [], keyRevocations: [], evidence: [],
  } };
}

function decide(runtime, tick, allowed, extras) {
  return runtime.decide({ view: view(tick, extras), allowedActions: allowed, predictionKeys: ["visible"] });
}

function verificationReceipts() {
  return [
    { id: "v1", channelId: "c1", verdict: "confirmed", action: "acquire", enactedAt: 1, effectiveAt: 2, amount: 2, failureDomain: "gain-domain", actor: "assembly-A", observerActor: "auditor-B", observerFailureDomain: "sensor-domain", authorityTrace: "B:signed" },
    { id: "v2", channelId: "c2", verdict: "confirmed", action: "acquire", enactedAt: 1, effectiveAt: 2, amount: 2, failureDomain: "gain-domain", actor: "assembly-A", observerActor: "auditor-C", observerFailureDomain: "community-domain", authorityTrace: "C:signed" },
  ];
}

function repairReceipt(id, debt, actionId, overrides = {}) {
  return {
    id, confirmed: true, debtId: debt.id, axis: debt.axis, capacityRestored: true,
    recourseOpen: true, nonRepetition: true, remainingLoss: [], action: actionId,
    actor: "assembly-A", recourseChannel: "appeal-A", authorityTrace: "independent:signed",
    observerActor: "repair-auditor", ...overrides,
  };
}

function begin(runtime = new CctSequencedRestorationRuntime()) {
  const triage = decide(runtime, 0, ["triage"]);
  assert.equal(triage.action, "triage");
  assert.equal(decide(runtime, 1, ["acquire"]).action, "acquire");
  return runtime;
}

test("1.4 specification validates", () => {
  assert.deepEqual(validateSequencedRestorationSpec(loadSequencedRestorationSpec()), []);
});

test("deadline is calculated once when debts are created", () => {
  const runtime = new CctSequencedRestorationRuntime();
  const result = decide(runtime, 0, ["triage"]);
  assert.equal(result.governance.deadline, 8);
  assert.ok(runtime.snapshot().state.debts.every((debt) => debt.deadline === 8));
});

test("two debts are restored in two evidenced stages", () => {
  const runtime = begin();
  const first = decide(runtime, 2, ["restore_rights", "restore_power"], { verificationReceipts: verificationReceipts() });
  assert.equal(first.action, "restore_power");
  assert.deepEqual(first.governance.plan, ["restore_power", "restore_rights"]);
  let debts = runtime.snapshot().state.debts;
  const power = debts.find((debt) => debt.axis === "attribution_du_pouvoir");
  const second = decide(runtime, 3, ["restore_rights"], { repairReceipts: [repairReceipt("p", power, "restore_power")] });
  assert.equal(second.action, "restore_rights");
  debts = runtime.snapshot().state.debts;
  const rights = debts.find((debt) => debt.axis === "droits");
  const complete = decide(runtime, 4, ["full"], { repairReceipts: [repairReceipt("r", rights, "restore_rights")] });
  assert.equal(complete.action, "full");
  assert.ok(runtime.snapshot().state.debts.every((debt) => debt.status === "closed"));
});

test("one atomic repair remains admissible", () => {
  const runtime = begin();
  const result = decide(runtime, 2, ["restore_both"], { verificationReceipts: verificationReceipts() });
  assert.equal(result.action, "restore_both");
  assert.deepEqual(result.governance.plan, ["restore_both"]);
});

test("no restoration semantics means no invented repair", () => {
  const runtime = begin();
  assert.throws(
    () => decide(runtime, 2, ["hold"], { verificationReceipts: verificationReceipts() }),
    /CCT_STAGED_RESTORATION_PLAN_INFEASIBLE/,
  );
});

test("a harmful partial repair is rejected", () => {
  const runtime = begin();
  const harmful = action({ kind: "restoration", restores: ["droits"], delta: { droits: 1, attribution_du_pouvoir: -1 } });
  assert.throws(
    () => decide(runtime, 2, ["harmful"], { verificationReceipts: verificationReceipts(), ontology: { harmful } }),
    /CCT_STAGED_RESTORATION_PLAN_INFEASIBLE/,
  );
});

test("action selection alone never closes a debt", () => {
  const runtime = begin();
  decide(runtime, 2, ["restore_both"], { verificationReceipts: verificationReceipts() });
  assert.ok(runtime.snapshot().state.debts.every((debt) => debt.status === "open"));
});

test("incomplete repair receipt does not close debt", () => {
  const runtime = begin();
  decide(runtime, 2, ["restore_both"], { verificationReceipts: verificationReceipts() });
  const debt = runtime.snapshot().state.debts[0];
  const incomplete = repairReceipt("bad", debt, "restore_both", { nonRepetition: false });
  const result = decide(runtime, 3, ["hold"], { repairReceipts: [incomplete] });
  assert.equal(result.governance.phase, "staged_restoration_receipt_pending");
  assert.equal(runtime.snapshot().state.debts.find((item) => item.id === debt.id).status, "open");
});

test("gain maturation beyond the declared bound is terminal", () => {
  const runtime = new CctSequencedRestorationRuntime();
  decide(runtime, 0, ["triage"]);
  const slow = action({ kind: "capacity_acquisition", gain: 2, maturation: 3, target: ["portabilite_effective"], delta: { portabilite_effective: 2 } });
  assert.throws(() => decide(runtime, 1, ["slow"], { ontology: { slow } }), /CCT_GAIN_MATURATION_EXCEEDS_DECLARED_BOUND/);
});

test("spec mutation cannot permit harmful steps or deadline extension", () => {
  const spec = loadSequencedRestorationSpec();
  spec.stepAdmissibility.harmToAnyAxis = "allowed";
  spec.planning.deadlineExtension = "allowed";
  assert.ok(validateSequencedRestorationSpec(spec).length >= 2);
});
