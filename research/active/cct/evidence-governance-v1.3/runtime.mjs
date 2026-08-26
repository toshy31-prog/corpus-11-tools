import { readFileSync } from "node:fs";
import { CctOpenWorldRecoveryRuntime, loadOpenWorldSpec } from "../open-world-recovery-v1.2/runtime.mjs";
import { loadUnifiedSpec } from "../unified-exec/runtime.mjs";

const defaultSpecUrl = new URL("./spec.json", import.meta.url);
const VITAL = "besoins_vitaux";
const ECO = "plafond_ecologique";

export function loadEvidenceGovernanceSpec(url = defaultSpecUrl) { return JSON.parse(readFileSync(url, "utf8")); }
export function validateEvidenceGovernanceSpec(spec) {
  const errors = [];
  if (spec?.schema !== "cct-evidence-governance/v1" || spec?.version !== "1.3-candidate") errors.push("invalid 1.3 schema or version");
  if (spec?.parentFreeze !== "CCT-EXEC-1.2-FREEZE-2026-08-26-01") errors.push("frozen 1.2 parent required");
  if (!Number.isInteger(spec?.verification?.minimumIndependentConfirmations) || spec.verification.minimumIndependentConfirmations < 2) errors.push("plural independent confirmation required");
  if (!Number.isInteger(spec?.verification?.maximumSolicitationTicks) || spec.verification.maximumSolicitationTicks < 1) errors.push("positive solicitation window required");
  if (spec?.verification?.selfCertification !== "forbidden") errors.push("self-certification must remain forbidden");
  if (spec?.verification?.contradictions !== "preserve_and_contest_never_average") errors.push("contradiction fence missing");
  if (spec?.verification?.deadlineExtension !== "forbidden") errors.push("verification deadline extension forbidden");
  return errors;
}

function channelValid(channel) {
  return channel && typeof channel.id === "string" && channel.id.length > 0
    && typeof channel.observerActor === "string" && channel.observerActor.length > 0
    && typeof channel.failureDomain === "string" && channel.failureDomain.length > 0
    && Array.isArray(channel.targetAxes) && channel.targetAxes.length > 0;
}

function receiptMatches(receipt, expected) {
  return receipt && receipt.action === expected.action && receipt.enactedAt === expected.enactedAt
    && receipt.effectiveAt === expected.dueAt && receipt.amount === expected.amount
    && receipt.failureDomain === expected.failureDomain && receipt.actor === expected.actor
    && typeof receipt.authorityTrace === "string" && receipt.authorityTrace.length > 0;
}

export class CctEvidenceGovernanceRuntime extends CctOpenWorldRecoveryRuntime {
  constructor({ spec = loadEvidenceGovernanceSpec(), openWorldSpec = loadOpenWorldSpec(), unifiedSpec = loadUnifiedSpec() } = {}) {
    const errors = validateEvidenceGovernanceSpec(spec);
    if (errors.length) throw new Error(`invalid CCT 1.3 spec: ${errors.join("; ")}`);
    super({ spec: openWorldSpec, unifiedSpec });
    this.evidenceSpec = structuredClone(spec);
    this.state.activeVerificationChannels = [];
    this.state.verificationRequest = null;
  }

  registerChannels(semantics, action, tick) {
    for (const declared of semantics?.verificationChannelsOpened ?? []) {
      if (!channelValid(declared)) this.fail("CCT_VERIFICATION_CHANNEL_INVALID", tick, { action });
      if (declared.observerActor === semantics.responsibleActor || declared.failureDomain === semantics.gainFailureDomain) {
        this.fail("CCT_VERIFICATION_CHANNEL_NOT_INDEPENDENT", tick, { action, channelId: declared.id });
      }
      if (!this.state.activeVerificationChannels.some((item) => item.id === declared.id)) {
        this.state.activeVerificationChannels.push({ ...structuredClone(declared), openedBy: action, openedAt: tick });
        this.trace.push({ tick, event: "verification_channel_opened", channelId: declared.id, openedBy: action });
      }
    }
  }

  processReceipts(cct) {
    const pending = this.state.pendingGain;
    if (!pending || cct.tick < pending.dueAt) return super.processReceipts(cct);
    const receipts = (cct.verificationReceipts ?? []).filter((item) => receiptMatches(item, pending));
    const eligible = receipts.filter((receipt) => {
      const channel = this.state.activeVerificationChannels.find((item) => item.id === receipt.channelId);
      return channel && receipt.observerActor === channel.observerActor
        && receipt.observerFailureDomain === channel.failureDomain
        && pending.targetAxes.some((axis) => channel.targetAxes.includes(axis));
    });
    const rejected = eligible.filter((item) => item.verdict === "rejected");
    const confirmed = eligible.filter((item) => item.verdict === "confirmed" && item.observerActor !== pending.actor);
    const independent = [];
    for (const receipt of confirmed) {
      if (independent.some((item) => item.observerActor === receipt.observerActor || item.observerFailureDomain === receipt.observerFailureDomain)) continue;
      independent.push(receipt);
    }
    if (!rejected.length && independent.length >= this.evidenceSpec.verification.minimumIndependentConfirmations) {
      this.state.verifiedCapacityGains.push({ ...pending, receiptIds: independent.map((item) => item.id).sort(), verifiedAt: cct.tick });
      this.state.pendingGain = null;
      this.state.verificationRequest = null;
      this.state.phase = "restoration_due";
      this.trace.push({ tick: cct.tick, event: "capacity_gain_plural_verified", receiptIds: independent.map((item) => item.id).sort() });
      return super.processReceipts(cct);
    }
    if (!this.state.verificationRequest) {
      this.state.verificationRequest = {
        requestedAt: cct.tick,
        deadline: cct.tick + this.evidenceSpec.verification.maximumSolicitationTicks,
        action: pending.action,
        targetAxes: [...pending.targetAxes],
      };
    }
    if (cct.tick > this.state.verificationRequest.deadline) this.terminal("CCT_VERIFICATION_DEADLINE_MISSED", cct.tick, { request: structuredClone(this.state.verificationRequest) });
    this.state.phase = rejected.length ? "verification_contested" : "verification_pending";
    this.trace.push({ tick: cct.tick, event: this.state.phase, confirmed: independent.map((item) => item.id).sort(), rejected: rejected.map((item) => item.id).sort(), request: structuredClone(this.state.verificationRequest) });
    this.state.pendingGain = null;
    try { super.processReceipts(cct); } finally { this.state.pendingGain = pending; }
  }

  holdingDecision({ view, allowedActions, history, predictionKeys }) {
    const cct = view.cct;
    const safe = allowedActions.filter((action) => {
      const semantics = cct.actionOntology[action];
      const deltas = semantics?.effectEvidence?.axisDeltas;
      return semantics && semantics.resourceCost <= cct.capacityBudget
        && !semantics.constitutionalTags.some((tag) => this.forbiddenTags.has(tag))
        && deltas && deltas[VITAL] >= 0 && deltas[ECO] >= 0;
    });
    if (!safe.length) this.terminal("CCT_VERIFICATION_HOLD_INFEASIBLE", cct.tick);
    const missingGain = (action) => (cct.actionOntology[action].verificationChannelsOpened ?? [])
      .filter((candidate) => !this.state.activeVerificationChannels.some((active) => active.id === candidate.id)).length;
    const action = [...safe].sort((a, b) => missingGain(b) - missingGain(a)
      || cct.actionOntology[a].resourceCost - cct.actionOntology[b].resourceCost || a.localeCompare(b))[0];
    const semantics = cct.actionOntology[action];
    this.registerChannels(semantics, action, cct.tick);
    this.state.lastTick = cct.tick;
    const predictions = Object.fromEntries(predictionKeys.map((key) => [key, Number(view[key]) || 0]));
    const governance = { tick: cct.tick, event: "verification_safe_continuation", phase: this.state.phase, action, request: structuredClone(this.state.verificationRequest) };
    this.trace.push(governance);
    return { action, predictions, governance };
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    const cct = view?.cct;
    if (this.state.terminalFailure) this.fail("CCT_RECOVERY_ALREADY_TERMINAL", cct?.tick ?? -1);
    if (this.state.pendingGain && cct?.tick >= this.state.pendingGain.dueAt) {
      if (this.state.lastTick !== null && cct.tick <= this.state.lastTick) this.fail("CCT_RECOVERY_TICK_NOT_MONOTONIC", cct.tick);
      this.processReceipts(cct);
      if (["verification_pending", "verification_contested"].includes(this.state.phase)) return this.holdingDecision({ view, allowedActions, history, predictionKeys });
    }
    let effectiveAllowed = allowedActions;
    if (this.state.phase === "triage_immediate" && this.state.activeVerificationChannels.length) {
      const covered = new Set(this.state.activeVerificationChannels.flatMap((channel) => channel.targetAxes));
      const verifiable = allowedActions.filter((action) => view.cct.actionOntology[action]?.recoveryKind === "capacity_acquisition"
        && (view.cct.actionOntology[action].verificationTargetAxes ?? []).some((axis) => covered.has(axis)));
      if (verifiable.length) effectiveAllowed = verifiable;
    }
    const result = super.decide({ view, allowedActions: effectiveAllowed, history, predictionKeys });
    const semantics = view.cct.actionOntology[result.action];
    this.registerChannels(semantics, result.action, cct.tick);
    if (this.state.pendingGain?.action === result.action) this.state.pendingGain.targetAxes = [...(semantics.verificationTargetAxes ?? [])];
    return result;
  }
}

export function createCctEvidenceGovernanceContender({ predictionKeys = [] } = {}) {
  const runtime = new CctEvidenceGovernanceRuntime();
  return {
    manifest: { id: "cct-exec-1.3-candidate", version: "1.3.0-candidate", title: "CCT plural evidence governance candidate", family: "constitutional-evidence-governance" },
    decide({ view, allowedActions, history }) { return runtime.decide({ view, allowedActions, history, predictionKeys }); },
    snapshot: () => runtime.snapshot(),
  };
}
