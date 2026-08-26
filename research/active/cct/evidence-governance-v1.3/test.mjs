import test from "node:test";
import assert from "node:assert/strict";
import { CctEvidenceGovernanceRuntime, loadEvidenceGovernanceSpec, validateEvidenceGovernanceSpec } from "./runtime.mjs";
import { loadOpenWorldSpec } from "../open-world-recovery-v1.2/runtime.mjs";

const AXES = ["besoins_vitaux", "plafond_ecologique", "droits", "attribution_du_pouvoir", "portabilite_effective", "recuperation"];
const risk = (axis) => ({ id: axis, axis, severity: 3, confirmed: true, channel: axis, failureDomain: axis });
const risks = [risk("besoins_vitaux"), risk("plafond_ecologique"), risk("droits")];
const deltas = (overrides = {}) => Object.fromEntries(AXES.map((axis) => [axis, overrides[axis] ?? 0]));
const channel = (id, actor, domain) => ({ id, observerActor: actor, failureDomain: domain, targetAxes: ["portabilite_effective"] });

function action({ kind = "ordinary", gain = 0, target = [], restores = [], delta = {}, channels = [], cost = 1, actor = "assembly-A" } = {}) {
  const axisDeltas = deltas(delta);
  return {
    tags: ["public-action"], burden: cost, actor, traceable: true, resourceCost: cost,
    protectsAxes: AXES.filter((axis) => axisDeltas[axis] > 0), harmsAxes: AXES.filter((axis) => axisDeltas[axis] < 0), constitutionalTags: [],
    recoveryKind: kind, ensuresVitalMinimum: axisDeltas.besoins_vitaux > 0, suspendsIrreversibility: axisDeltas.plafond_ecologique > 0,
    capacityGain: gain, gainMaturesAfterTicks: gain ? 1 : 0, gainFailureDomain: gain ? "gain-domain" : "none",
    restoresAxes: restores, responsibleActor: actor, debtBearers: ["affected-public"], recourseChannel: "appeal-A",
    effectEvidence: { axisDeltas, observedFrom: "public_immediate_effects", noFutureLeak: true },
    verificationChannelsOpened: channels, verificationTargetAxes: target,
  };
}

const channels = [channel("c1", "auditor-B", "sensor-domain"), channel("c2", "auditor-C", "community-domain")];
const O = {
  triage: action({ kind: "triage", delta: { besoins_vitaux: 2, plafond_ecologique: 2, droits: -1 }, channels }),
  acquire: action({ kind: "capacity_acquisition", gain: 2, target: ["portabilite_effective"], delta: { portabilite_effective: 2 } }),
  hold: action({ delta: {} }),
  harmful_hold: action({ delta: { besoins_vitaux: -1 } }),
  restore: action({ kind: "restoration", restores: AXES, delta: Object.fromEntries(AXES.map((axis) => [axis, 1])) }),
};

function view(tick, { receipts = [], ontology = O } = {}) {
  return { visible: 1, cct: { tick, axisRisks: risks, capacityBudget: 10, actionOntology: ontology, capacityReceipts: [], repairReceipts: [], verificationReceipts: receipts, signals: [], keyGrants: [], keyRevocations: [], evidence: [] } };
}
function decide(runtime, tick, allowed, extras) { return runtime.decide({ view: view(tick, extras), allowedActions: allowed, predictionKeys: ["visible"] }); }
function receipt(id, channelId, observerActor, observerFailureDomain, verdict = "confirmed", overrides = {}) {
  return { id, channelId, verdict, action: "acquire", enactedAt: 1, effectiveAt: 2, amount: 2, failureDomain: "gain-domain", actor: "assembly-A", observerActor, observerFailureDomain, authorityTrace: `${observerActor}:signed`, ...overrides };
}
function begin(runtime = new CctEvidenceGovernanceRuntime()) {
  assert.equal(decide(runtime, 0, ["triage"]).action, "triage");
  assert.equal(decide(runtime, 1, ["acquire"]).action, "acquire");
  return runtime;
}

test("1.3 specification validates", () => assert.deepEqual(validateEvidenceGovernanceSpec(loadEvidenceGovernanceSpec()), []));

test("missing proof opens a bounded request and safe continuation", () => {
  const runtime = begin();
  const result = decide(runtime, 2, ["hold"]);
  assert.equal(result.action, "hold");
  assert.equal(result.governance.phase, "verification_pending");
  assert.equal(runtime.snapshot().state.verificationRequest.deadline, 4);
});

test("two genuinely independent confirmations verify the gain", () => {
  const runtime = begin();
  decide(runtime, 2, ["hold"]);
  const receipts = [receipt("r1", "c1", "auditor-B", "sensor-domain"), receipt("r2", "c2", "auditor-C", "community-domain")];
  const result = decide(runtime, 3, ["restore"], { receipts });
  assert.equal(result.action, "restore");
  assert.equal(result.governance.phase, "restoration_due");
  assert.equal(runtime.snapshot().state.verifiedCapacityGains.length, 1);
});

test("self-certification cannot satisfy the quorum", () => {
  const runtime = begin();
  const self = receipt("self", "c1", "assembly-A", "sensor-domain");
  const result = decide(runtime, 2, ["hold"], { receipts: [self] });
  assert.equal(result.governance.phase, "verification_pending");
  assert.equal(runtime.snapshot().state.verifiedCapacityGains.length, 0);
});

test("same actor or failure domain counts only once", () => {
  const runtime = begin();
  const duplicated = [receipt("r1", "c1", "auditor-B", "sensor-domain"), receipt("r2", "c2", "auditor-B", "community-domain")];
  const result = decide(runtime, 2, ["hold"], { receipts: duplicated });
  assert.equal(result.governance.phase, "verification_pending");
});

test("contradiction is preserved as contestation and never averaged", () => {
  const runtime = begin();
  const mixed = [receipt("r1", "c1", "auditor-B", "sensor-domain"), receipt("r2", "c2", "auditor-C", "community-domain", "rejected")];
  const result = decide(runtime, 2, ["hold"], { receipts: mixed });
  assert.equal(result.governance.phase, "verification_contested");
  assert.equal(runtime.snapshot().state.verifiedCapacityGains.length, 0);
});

test("unsafe continuation is terminal", () => {
  const runtime = begin();
  assert.throws(() => decide(runtime, 2, ["harmful_hold"]), /CCT_VERIFICATION_HOLD_INFEASIBLE/);
});

test("missing evidence beyond the fixed deadline is terminal", () => {
  const openWorldSpec = loadOpenWorldSpec();
  openWorldSpec.sequence.maximumRecoveryTicks = 10;
  const runtime = begin(new CctEvidenceGovernanceRuntime({ openWorldSpec }));
  decide(runtime, 2, ["hold"]);
  decide(runtime, 3, ["hold"]);
  decide(runtime, 4, ["hold"]);
  assert.throws(() => decide(runtime, 5, ["hold"]), /CCT_VERIFICATION_DEADLINE_MISSED/);
});

test("invalid channel cannot become a capacity", () => {
  const runtime = new CctEvidenceGovernanceRuntime();
  const bad = { ...O.triage, verificationChannelsOpened: [{ id: "bad", observerActor: "assembly-A", failureDomain: "none", targetAxes: ["portabilite_effective"] }] };
  assert.throws(() => decide(runtime, 0, ["triage"], { ontology: { triage: bad } }), /CCT_VERIFICATION_CHANNEL_NOT_INDEPENDENT/);
});

test("spec mutation cannot permit self-certification or single confirmation", () => {
  const spec = loadEvidenceGovernanceSpec();
  spec.verification.selfCertification = "allowed";
  spec.verification.minimumIndependentConfirmations = 1;
  assert.ok(validateEvidenceGovernanceSpec(spec).length >= 2);
});
