import { readFileSync } from "node:fs";
import { CctUnifiedRuntime, loadUnifiedSpec } from "../unified-exec/runtime.mjs";

const defaultSpecUrl = new URL("./spec.json", import.meta.url);
const AXIS_VITAL = "besoins_vitaux";
const AXIS_ECO = "plafond_ecologique";
const RECOVERY_KINDS = new Set(["ordinary", "triage", "capacity_acquisition", "restoration", "full_protection"]);

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function loadOpenWorldSpec(url = defaultSpecUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateOpenWorldSpec(spec) {
  const errors = [];
  if (spec?.schema !== "cct-open-world-recovery/v1") errors.push("schema must be cct-open-world-recovery/v1");
  if (spec?.version !== "1.2-candidate") errors.push("version must be 1.2-candidate");
  if (!['written_untested', 'locally_tested'].includes(spec?.lifecycle?.state)) errors.push("lifecycle must remain written_untested or locally_tested");
  for (const boundary of ["authorization", "deployment", "institutional effect", "composed robustness", "external transport", "superiority"]) {
    if (!spec?.lifecycle?.notEstablished?.includes(boundary)) errors.push(`missing lifecycle boundary: ${boundary}`);
  }
  if (!spec?.boundaries?.I13?.includes("explicit frozen forbidden constitutional tag")) errors.push("I13/tag-only boundary missing");
  if (!spec?.boundaries?.materialHarm?.includes("not renamed I13")) errors.push("material harm attribution boundary missing");
  if (!Number.isInteger(spec?.sequence?.maximumRecoveryTicks) || spec.sequence.maximumRecoveryTicks < 1) errors.push("positive maximumRecoveryTicks required");
  if (spec?.sequence?.deadlineExtension !== "forbidden") errors.push("debt deadline extension must be forbidden");
  if (!(spec?.effectEvidence?.forbidden ?? []).includes("future exogenous events")) errors.push("future leak fence missing");
  if (!(spec?.withdrawalConditions ?? []).some((item) => item.includes("development evidence only"))) errors.push("observed-world reuse boundary missing");
  return errors;
}

function activeAxes(cct) {
  return uniqueSorted(cct.axisRisks.filter((risk) => risk.confirmed && risk.severity > 0).map((risk) => risk.axis));
}

function evidenceValid(evidence, axes, allowedSources) {
  return evidence && evidence.noFutureLeak === true && allowedSources.includes(evidence.observedFrom)
    && evidence.axisDeltas && typeof evidence.axisDeltas === "object"
    && axes.every((axis) => Number.isFinite(evidence.axisDeltas[axis]));
}

function semanticsValid(semantics, axes, allowedSources) {
  const base = semantics
    && Number.isFinite(semantics.resourceCost) && semantics.resourceCost >= 0
    && Array.isArray(semantics.protectsAxes)
    && Array.isArray(semantics.harmsAxes)
    && Array.isArray(semantics.constitutionalTags)
    && RECOVERY_KINDS.has(semantics.recoveryKind)
    && typeof semantics.ensuresVitalMinimum === "boolean"
    && typeof semantics.suspendsIrreversibility === "boolean"
    && Number.isFinite(semantics.capacityGain) && semantics.capacityGain >= 0
    && Number.isInteger(semantics.gainMaturesAfterTicks) && semantics.gainMaturesAfterTicks >= 0
    && typeof semantics.gainFailureDomain === "string"
    && Array.isArray(semantics.restoresAxes)
    && typeof semantics.responsibleActor === "string" && semantics.responsibleActor.length > 0
    && Array.isArray(semantics.debtBearers) && semantics.debtBearers.length > 0
    && typeof semantics.recourseChannel === "string" && semantics.recourseChannel.length > 0
    && [...semantics.protectsAxes, ...semantics.harmsAxes, ...semantics.restoresAxes].every((axis) => axes.includes(axis));
  return base && (!semantics.effectEvidence || evidenceValid(semantics.effectEvidence, axes, allowedSources));
}

function effectiveSemantics(semantics, axes) {
  const deltas = semantics.effectEvidence?.axisDeltas;
  const protectsAxes = deltas ? axes.filter((axis) => deltas[axis] > 0) : uniqueSorted(semantics.protectsAxes);
  const harmsAxes = deltas ? axes.filter((axis) => deltas[axis] < 0) : uniqueSorted(semantics.harmsAxes);
  const delta = (axis) => deltas ? deltas[axis] : null;
  let recoveryKind = semantics.recoveryKind;
  if (recoveryKind === "ordinary" && deltas) {
    if (delta(AXIS_VITAL) > 0 && delta(AXIS_ECO) > 0) recoveryKind = "triage";
    else if (delta("portabilite_effective") > 0 || delta("recuperation") > 0) recoveryKind = "capacity_acquisition";
  }
  const inferredGain = deltas ? Math.max(0, delta("portabilite_effective"), delta("recuperation")) : 0;
  const capacityGain = Math.max(semantics.capacityGain, inferredGain);
  return {
    ...semantics,
    protectsAxes,
    harmsAxes,
    recoveryKind,
    capacityGain,
    gainMaturesAfterTicks: capacityGain > 0 ? Math.max(1, semantics.gainMaturesAfterTicks) : semantics.gainMaturesAfterTicks,
    gainFailureDomain: capacityGain > 0 && (!semantics.gainFailureDomain || semantics.gainFailureDomain === "none")
      ? "public-effect-evidence"
      : semantics.gainFailureDomain,
    vitalImproves: deltas ? delta(AXIS_VITAL) > 0 : semantics.ensuresVitalMinimum,
    ecologyImproves: deltas ? delta(AXIS_ECO) > 0 : semantics.suspendsIrreversibility,
    vitalMaintained: deltas ? delta(AXIS_VITAL) >= 0 : semantics.ensuresVitalMinimum,
    ecologyMaintained: deltas ? delta(AXIS_ECO) >= 0 : semantics.suspendsIrreversibility,
    evidenceRole: deltas ? "public_effect_candidate_not_receipt" : "declared_action_semantics",
  };
}

function validatePublicView(view, allowedActions, axes, allowedSources) {
  const cct = view?.cct;
  if (!cct || !Number.isInteger(cct.tick) || cct.tick < 0 || !Array.isArray(cct.axisRisks)
    || !Number.isFinite(cct.capacityBudget) || cct.capacityBudget < 0
    || !Array.isArray(cct.capacityReceipts) || !Array.isArray(cct.repairReceipts)
    || !cct.actionOntology || typeof cct.actionOntology !== "object") throw new Error("CCT_OPEN_WORLD_INTERFACE_MISSING");
  for (const action of allowedActions) {
    if (!semanticsValid(cct.actionOntology[action], axes, allowedSources)) throw new Error(`CCT_OPEN_WORLD_ACTION_SEMANTICS_INVALID: ${action}`);
  }
  return cct;
}

function debtId(axis, tick) {
  return `debt:${axis}:${tick}`;
}

function unresolvedInstitution(value) {
  return value.startsWith("absent-") || value.startsWith("unspecified-") || value.startsWith("unresolved-");
}

export class CctOpenWorldRecoveryRuntime {
  constructor({ spec = loadOpenWorldSpec(), unifiedSpec = loadUnifiedSpec() } = {}) {
    const errors = validateOpenWorldSpec(spec);
    if (errors.length) throw new Error(`invalid CCT open-world spec: ${errors.join("; ")}`);
    this.spec = structuredClone(spec);
    this.unifiedSpec = structuredClone(unifiedSpec);
    this.axes = [...unifiedSpec.I15.axes];
    this.forbiddenTags = new Set(unifiedSpec.I13.forbiddenActionTags);
    this.unified = new CctUnifiedRuntime({ spec: unifiedSpec });
    this.state = { phase: "normal", lastTick: null, terminalFailure: null, debts: [], pendingGain: null, verifiedCapacityGains: [] };
    this.trace = [];
  }

  fail(code, tick, detail = {}) {
    this.trace.push({ tick, event: "open_world_control_failure", code, phase: this.state.phase, ...detail });
    throw new Error(code);
  }

  terminal(code, tick, detail = {}) {
    this.state.phase = "terminal_failure";
    this.state.terminalFailure = { code, tick, ...detail };
    this.trace.push({ tick, event: "terminal_failure", code, ...detail });
    throw new Error(code);
  }

  processReceipts(cct) {
    const tick = cct.tick;
    if (this.state.pendingGain && tick >= this.state.pendingGain.dueAt) {
      const expected = this.state.pendingGain;
      const receipt = cct.capacityReceipts.find((item) => item?.confirmed === true
        && item.action === expected.action && item.enactedAt === expected.enactedAt
        && item.effectiveAt === expected.dueAt && item.amount === expected.amount
        && item.failureDomain === expected.failureDomain && item.actor === expected.actor
        && typeof item.authorityTrace === "string" && item.authorityTrace.length > 0
        && typeof item.observerActor === "string" && item.observerActor.length > 0 && item.observerActor !== expected.actor
        && typeof item.observerFailureDomain === "string" && item.observerFailureDomain.length > 0
        && item.observerFailureDomain !== expected.failureDomain);
      if (!receipt) this.terminal("CCT_CAPACITY_GAIN_UNVERIFIED", tick, { pendingGain: structuredClone(expected) });
      this.state.verifiedCapacityGains.push({ ...expected, receiptId: receipt.id, verifiedAt: tick });
      this.state.pendingGain = null;
      this.state.phase = "restoration_due";
      this.trace.push({ tick, event: "capacity_gain_verified", receiptId: receipt.id, amount: receipt.amount });
    }

    for (const debt of this.state.debts.filter((item) => item.status === "open")) {
      const receipt = cct.repairReceipts.find((item) => item?.confirmed === true && item.debtId === debt.id
        && tick <= debt.deadline && item.axis === debt.axis && item.capacityRestored === true
        && item.recourseOpen === true && item.nonRepetition === true && Array.isArray(item.remainingLoss)
        && item.action === debt.restorationAction && item.actor === debt.responsibleActor
        && item.recourseChannel === debt.recourseChannel && typeof item.authorityTrace === "string" && item.authorityTrace.length > 0
        && typeof item.observerActor === "string" && item.observerActor.length > 0 && item.observerActor !== debt.responsibleActor);
      if (receipt) {
        debt.status = "closed";
        debt.closedAt = tick;
        debt.receiptId = receipt.id;
        debt.remainingLoss = [...receipt.remainingLoss];
        this.trace.push({ tick, event: "repair_debt_closed", debtId: debt.id, axis: debt.axis, receiptId: receipt.id });
      }
    }
    const overdue = this.state.debts.filter((item) => item.status === "open" && tick > item.deadline);
    if (overdue.length) this.terminal("CCT_REPAIR_DEADLINE_MISSED", tick, { overdueDebtIds: overdue.map((item) => item.id).sort() });
  }

  recordDebts(axes, tick, deadline, semantics) {
    const existing = new Set(this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis));
    for (const axis of uniqueSorted(axes)) {
      if (existing.has(axis)) continue;
      this.state.debts.push({
        id: debtId(axis, tick), axis, createdAt: tick, deadline,
        bearerIds: [...semantics.debtBearers].sort(), responsibleActor: semantics.responsibleActor,
        recourseChannel: semantics.recourseChannel, status: "open",
        attributionStatus: unresolvedInstitution(semantics.responsibleActor) || unresolvedInstitution(semantics.recourseChannel)
          ? "institutional_attribution_unresolved"
          : "institutionally_attributed",
      });
    }
  }

  delegate({ view, allowedActions, history, predictionKeys }) {
    return this.unified.nce.decide({ view, allowedActions, history, predictionKeys });
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (!Array.isArray(allowedActions) || !allowedActions.length) throw new Error("CCT_OPEN_WORLD_INTERFACE_MISSING: allowedActions");
    const cct = validatePublicView(view, allowedActions, this.axes, this.spec.effectEvidence.allowedObservedFrom);
    if (this.state.terminalFailure) this.fail("CCT_RECOVERY_ALREADY_TERMINAL", cct.tick, { terminalFailure: structuredClone(this.state.terminalFailure) });
    if (this.state.lastTick !== null && cct.tick <= this.state.lastTick) this.fail("CCT_RECOVERY_TICK_NOT_MONOTONIC", cct.tick, { lastTick: this.state.lastTick });
    this.processReceipts(cct);
    this.state.lastTick = cct.tick;

    const risks = activeAxes(cct);
    const semantics = Object.fromEntries(allowedActions.map((action) => [action, effectiveSemantics(cct.actionOntology[action], this.axes)]));
    const i13Safe = allowedActions.filter((action) => !semantics[action].constitutionalTags.some((tag) => this.forbiddenTags.has(tag)));
    if (!i13Safe.length) this.fail("CCT_I13_NO_ADMISSIBLE_ACTION", cct.tick, { activeAxes: risks });
    const budgetSafe = i13Safe.filter((action) => semantics[action].resourceCost <= cct.capacityBudget);
    const openDebts = this.state.debts.filter((debt) => debt.status === "open");
    if (!budgetSafe.length) this.fail(openDebts.length ? "CCT_RECOVERY_BUDGET_COLLAPSE" : "CCT_BUDGET_NO_ADMISSIBLE_ACTION", cct.tick, { activeAxes: risks, capacityBudget: cct.capacityBudget });

    const full = budgetSafe.filter((action) => semantics[action].harmsAxes.length === 0
      && risks.every((axis) => semantics[action].protectsAxes.includes(axis)));
    if (!openDebts.length && full.length) {
      const result = this.delegate({ view, allowedActions: full, history, predictionKeys });
      this.state.phase = risks.length ? "full_protection" : "normal";
      const governance = { tick: cct.tick, event: "open_world_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "no_open_repair_debt", activeAxes: risks, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    if (!openDebts.length) {
      const triage = budgetSafe.filter((action) => {
        const s = semantics[action];
        return s.recoveryKind === "triage" && s.vitalImproves && s.ecologyImproves
          && !s.harmsAxes.includes(AXIS_VITAL) && !s.harmsAxes.includes(AXIS_ECO);
      });
      if (!triage.length) this.fail("CCT_FULL_PROTECTION_INFEASIBLE", cct.tick, { activeAxes: risks, reason: "no_zero_harm_full_action_and_no_valid_triage" });
      const result = this.delegate({ view, allowedActions: triage, history, predictionKeys });
      const s = semantics[result.action];
      const debtAxes = uniqueSorted([...risks.filter((axis) => !s.protectsAxes.includes(axis)), ...s.harmsAxes]);
      if (!debtAxes.length) this.fail("CCT_SEQUENCE_NOT_NEEDED", cct.tick, { action: result.action });
      const deadline = cct.tick + this.spec.sequence.maximumRecoveryTicks;
      this.recordDebts(debtAxes, cct.tick, deadline, s);
      this.state.phase = "triage_immediate";
      const governance = { tick: cct.tick, event: "open_world_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "breach_and_repair_debt", openDebtIds: this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.id).sort(), deadline, activeAxes: risks, harmedAxes: s.harmsAxes, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    const axesDue = uniqueSorted(openDebts.map((debt) => debt.axis));
    const restoration = budgetSafe.filter((action) => {
      const s = semantics[action];
      return s.recoveryKind === "restoration" && s.vitalMaintained && s.ecologyMaintained
        && s.harmsAxes.length === 0 && risks.every((axis) => s.protectsAxes.includes(axis))
        && axesDue.every((axis) => s.restoresAxes.includes(axis) && s.protectsAxes.includes(axis));
    });
    if (restoration.length) {
      const result = this.delegate({ view, allowedActions: restoration, history, predictionKeys });
      for (const debt of openDebts) {
        debt.restorationAction = result.action;
        debt.restorationAttemptedAt = cct.tick;
      }
      this.state.phase = "restoration_due";
      const governance = { tick: cct.tick, event: "open_world_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "breach_pending_receipts", openDebtIds: openDebts.map((debt) => debt.id).sort(), axesDue, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    if (this.state.phase === "triage_immediate") {
      const acquisition = budgetSafe.filter((action) => {
        const s = semantics[action];
        return s.recoveryKind === "capacity_acquisition" && s.capacityGain > 0
          && s.vitalMaintained && s.ecologyMaintained
          && !s.harmsAxes.includes(AXIS_VITAL) && !s.harmsAxes.includes(AXIS_ECO);
      });
      if (!acquisition.length) this.fail("CCT_CAPACITY_ACQUISITION_INFEASIBLE", cct.tick, { openDebtIds: openDebts.map((debt) => debt.id).sort() });
      const result = this.delegate({ view, allowedActions: acquisition, history, predictionKeys });
      const s = semantics[result.action];
      const deadline = Math.min(...openDebts.map((debt) => debt.deadline));
      this.recordDebts(s.harmsAxes, cct.tick, deadline, s);
      this.state.pendingGain = { action: result.action, enactedAt: cct.tick, dueAt: cct.tick + s.gainMaturesAfterTicks, amount: s.capacityGain, failureDomain: s.gainFailureDomain, actor: s.responsibleActor };
      this.state.phase = "capacity_acquisition";
      const governance = { tick: cct.tick, event: "open_world_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "breach_and_repair_debt", pendingGain: structuredClone(this.state.pendingGain), openDebtIds: this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.id).sort(), harmedAxes: s.harmsAxes, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }
    if (this.state.phase === "capacity_acquisition") this.fail("CCT_CAPACITY_GAIN_PENDING", cct.tick, { pendingGain: structuredClone(this.state.pendingGain) });
    if (this.state.phase === "restoration_due") this.fail("CCT_RESTORATION_ACTION_INFEASIBLE", cct.tick, { axesDue });
    this.fail("CCT_RECOVERY_STATE_INVALID", cct.tick, { phase: this.state.phase });
  }

  snapshot() {
    return { state: structuredClone(this.state), trace: structuredClone(this.trace), unified: this.unified.snapshot() };
  }
}

export function createCctOpenWorldRecoveryContender({ spec = loadOpenWorldSpec(), unifiedSpec = loadUnifiedSpec(), predictionKeys = [] } = {}) {
  const runtime = new CctOpenWorldRecoveryRuntime({ spec, unifiedSpec });
  return {
    manifest: { id: "cct-exec-1.2-candidate", version: "1.2.0-candidate", title: "CCT open-world constitutional recovery candidate", family: "constitutional-open-world-recovery-state-machine" },
    decide({ view, allowedActions, history }) {
      return runtime.decide({ view, allowedActions, history, predictionKeys });
    },
    snapshot: () => runtime.snapshot(),
  };
}
