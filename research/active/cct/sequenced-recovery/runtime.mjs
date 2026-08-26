import { readFileSync } from "node:fs";
import { CctUnifiedRuntime, loadUnifiedSpec } from "../unified-exec/runtime.mjs";

const defaultSpecUrl = new URL("./spec.json", import.meta.url);
const AXIS_VITAL = "besoins_vitaux";
const RECOVERY_KINDS = new Set(["ordinary", "triage", "capacity_acquisition", "restoration", "full_protection"]);

export function loadRecoverySpec(url = defaultSpecUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateRecoverySpec(spec) {
  const errors = [];
  if (spec?.schema !== "cct-sequenced-recovery/v1") errors.push("schema must be cct-sequenced-recovery/v1");
  if (spec?.version !== "1.1-candidate") errors.push("version must be 1.1-candidate");
  if (!['written_untested', 'locally_tested'].includes(spec?.lifecycle?.state)) errors.push("lifecycle must remain written_untested or locally_tested");
  for (const value of ["authorization", "deployment", "institutional effect", "composed robustness", "external transport"]) {
    if (!spec?.lifecycle?.notEstablished?.includes(value)) errors.push(`missing lifecycle boundary: ${value}`);
  }
  if (spec?.constitutionalBoundary?.temporaryDeficitStatus !== "constitutional_breach_and_repair_debt") errors.push("temporary deficit must remain a constitutional breach and repair debt");
  if (spec?.constitutionalBoundary?.I13Activation !== "always") errors.push("I13 must remain permanently active");
  if (!Number.isInteger(spec?.sequence?.maximumRecoveryTicks) || spec.sequence.maximumRecoveryTicks < 1) errors.push("maximumRecoveryTicks must be a positive integer");
  if (!spec?.sequence?.terminalRule?.includes("terminal failure")) errors.push("missed debt deadline must remain terminal failure");
  if (!spec?.interface?.fairness?.includes("every contender")) errors.push("matched public recovery semantics are required");
  return errors;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function activeAxes(cct) {
  return uniqueSorted(cct.axisRisks.filter((risk) => risk.confirmed && risk.severity > 0).map((risk) => risk.axis));
}

function semanticsValid(semantics, axes) {
  return semantics
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
}

function validatePublicView(view, allowedActions, axes) {
  const cct = view?.cct;
  if (!cct || !Number.isInteger(cct.tick) || cct.tick < 0 || !Array.isArray(cct.axisRisks)
    || !Number.isFinite(cct.capacityBudget) || cct.capacityBudget < 0
    || !Array.isArray(cct.capacityReceipts) || !Array.isArray(cct.repairReceipts)
    || !cct.actionOntology || typeof cct.actionOntology !== "object") {
    throw new Error("CCT_RECOVERY_INTERFACE_MISSING");
  }
  for (const action of allowedActions) {
    if (!semanticsValid(cct.actionOntology[action], axes)) throw new Error(`CCT_RECOVERY_ACTION_SEMANTICS_MISSING: ${action}`);
  }
  return cct;
}

function debtId(axis, tick) {
  return `debt:${axis}:${tick}`;
}

export class CctSequencedRecoveryRuntime {
  constructor({ spec = loadRecoverySpec(), unifiedSpec = loadUnifiedSpec() } = {}) {
    const errors = validateRecoverySpec(spec);
    if (errors.length) throw new Error(`invalid CCT recovery spec: ${errors.join("; ")}`);
    this.spec = structuredClone(spec);
    this.unifiedSpec = structuredClone(unifiedSpec);
    this.axes = [...unifiedSpec.I15.axes];
    this.forbiddenTags = new Set(unifiedSpec.I13.forbiddenActionTags);
    this.unified = new CctUnifiedRuntime({ spec: unifiedSpec });
    this.state = {
      phase: "normal",
      lastTick: null,
      terminalFailure: null,
      debts: [],
      pendingGain: null,
      verifiedCapacityGains: [],
    };
    this.trace = [];
  }

  fail(code, tick, detail = {}) {
    const event = { tick, event: "recovery_refusal", code, phase: this.state.phase, ...detail };
    this.trace.push(event);
    throw new Error(code);
  }

  terminal(code, tick, detail = {}) {
    this.state.phase = "terminal_failure";
    this.state.terminalFailure = { code, tick, ...detail };
    const event = { tick, event: "terminal_failure", code, ...detail };
    this.trace.push(event);
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
        && tick <= debt.deadline
        && item.axis === debt.axis && item.capacityRestored === true && item.recourseOpen === true
        && item.nonRepetition === true && Array.isArray(item.remainingLoss)
        && item.action === debt.restorationAction && item.actor === debt.responsibleActor
        && item.recourseChannel === debt.recourseChannel
        && typeof item.authorityTrace === "string" && item.authorityTrace.length > 0
        && typeof item.observerActor === "string" && item.observerActor.length > 0
        && item.observerActor !== debt.responsibleActor);
      if (receipt) {
        debt.status = "closed";
        debt.closedAt = tick;
        debt.receiptId = receipt.id;
        debt.remainingLoss = [...receipt.remainingLoss];
        this.trace.push({ tick, event: "repair_debt_closed", debtId: debt.id, axis: debt.axis, receiptId: receipt.id, remainingLoss: [...receipt.remainingLoss] });
      }
    }

    const overdue = this.state.debts.filter((item) => item.status === "open" && tick > item.deadline);
    if (overdue.length) this.terminal("CCT_REPAIR_DEADLINE_MISSED", tick, { overdueDebtIds: overdue.map((item) => item.id).sort() });
  }

  baseEligible(cct, allowedActions) {
    return allowedActions.filter((action) => {
      const s = cct.actionOntology[action];
      return s.resourceCost <= cct.capacityBudget
        && !s.constitutionalTags.some((tag) => this.forbiddenTags.has(tag))
        && s.harmsAxes.length === 0;
    });
  }

  delegate({ view, allowedActions, history, predictionKeys }) {
    return this.unified.nce.decide({ view, allowedActions, history, predictionKeys });
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (!Array.isArray(allowedActions) || !allowedActions.length) throw new Error("CCT_RECOVERY_INTERFACE_MISSING: allowedActions");
    const cct = validatePublicView(view, allowedActions, this.axes);
    if (this.state.terminalFailure) this.fail("CCT_RECOVERY_ALREADY_TERMINAL", cct.tick, { terminalFailure: structuredClone(this.state.terminalFailure) });
    if (this.state.lastTick !== null && cct.tick <= this.state.lastTick) this.fail("CCT_RECOVERY_TICK_NOT_MONOTONIC", cct.tick, { lastTick: this.state.lastTick });
    this.processReceipts(cct);
    this.state.lastTick = cct.tick;

    const risks = activeAxes(cct);
    const openDebts = this.state.debts.filter((item) => item.status === "open");
    const constitutionallySafe = allowedActions.filter((action) => {
      const s = cct.actionOntology[action];
      return !s.constitutionalTags.some((tag) => this.forbiddenTags.has(tag)) && s.harmsAxes.length === 0;
    });
    if (!constitutionallySafe.length) this.fail("CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION", cct.tick, { activeAxes: risks });
    const base = this.baseEligible(cct, allowedActions);
    if (!base.length && openDebts.length) this.fail("CCT_RECOVERY_BUDGET_COLLAPSE", cct.tick, { activeAxes: risks, openDebtIds: openDebts.map((item) => item.id).sort(), capacityBudget: cct.capacityBudget });
    if (!base.length) this.fail("CCT_BUDGET_NO_ADMISSIBLE_ACTION", cct.tick, { activeAxes: risks, capacityBudget: cct.capacityBudget });
    const full = base.filter((action) => risks.every((axis) => cct.actionOntology[action].protectsAxes.includes(axis)));

    if (!openDebts.length && full.length) {
      const result = this.delegate({ view, allowedActions: full, history, predictionKeys });
      this.state.phase = risks.length ? "full_protection" : "normal";
      const governance = { tick: cct.tick, event: "recovery_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "no_open_repair_debt", activeAxes: risks, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    if (!openDebts.length) {
      const triage = base.filter((action) => {
        const s = cct.actionOntology[action];
        return s.recoveryKind === "triage" && s.ensuresVitalMinimum && s.suspendsIrreversibility
          && s.protectsAxes.includes(AXIS_VITAL);
      });
      if (!triage.length) this.fail("CCT_TRIAGE_INFEASIBLE", cct.tick, { activeAxes: risks });
      const result = this.delegate({ view, allowedActions: triage, history, predictionKeys });
      const s = cct.actionOntology[result.action];
      const uncovered = risks.filter((axis) => !s.protectsAxes.includes(axis));
      if (!uncovered.length) this.fail("CCT_SEQUENCE_NOT_NEEDED", cct.tick, { action: result.action });
      const deadline = cct.tick + this.spec.sequence.maximumRecoveryTicks;
      for (const axis of uncovered) {
        this.state.debts.push({ id: debtId(axis, cct.tick), axis, createdAt: cct.tick, deadline, bearerIds: [...s.debtBearers].sort(), responsibleActor: s.responsibleActor, recourseChannel: s.recourseChannel, status: "open" });
      }
      this.state.phase = "triage_immediate";
      const governance = { tick: cct.tick, event: "recovery_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "breach_and_repair_debt", openDebtIds: this.state.debts.filter((item) => item.status === "open").map((item) => item.id).sort(), deadline, activeAxes: risks, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    const maintainsFloor = (action) => {
      const s = cct.actionOntology[action];
      return s.ensuresVitalMinimum && s.suspendsIrreversibility && s.protectsAxes.includes(AXIS_VITAL);
    };

    const axesDue = uniqueSorted(openDebts.map((item) => item.axis));
    const restoration = base.filter((action) => {
      const s = cct.actionOntology[action];
      return s.recoveryKind === "restoration" && maintainsFloor(action)
        && risks.every((axis) => s.protectsAxes.includes(axis))
        && axesDue.every((axis) => s.restoresAxes.includes(axis) && s.protectsAxes.includes(axis));
    });
    if (restoration.length) {
      const result = this.delegate({ view, allowedActions: restoration, history, predictionKeys });
      for (const debt of openDebts) {
        debt.restorationAction = result.action;
        debt.restorationAttemptedAt = cct.tick;
      }
      this.state.phase = "restoration_due";
      const governance = { tick: cct.tick, event: "recovery_decision", phase: "restoration_due", action: result.action, constitutionalStatus: "breach_pending_receipts", openDebtIds: openDebts.map((item) => item.id).sort(), axesDue, nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    if (this.state.phase === "triage_immediate") {
      const acquisition = base.filter((action) => {
        const s = cct.actionOntology[action];
        return s.recoveryKind === "capacity_acquisition" && maintainsFloor(action)
          && s.capacityGain > 0 && s.gainMaturesAfterTicks > 0 && s.gainFailureDomain.length > 0;
      });
      if (!acquisition.length) this.fail("CCT_CAPACITY_ACQUISITION_INFEASIBLE", cct.tick, { openDebtIds: openDebts.map((item) => item.id).sort() });
      const result = this.delegate({ view, allowedActions: acquisition, history, predictionKeys });
      const s = cct.actionOntology[result.action];
      this.state.pendingGain = { action: result.action, enactedAt: cct.tick, dueAt: cct.tick + s.gainMaturesAfterTicks, amount: s.capacityGain, failureDomain: s.gainFailureDomain, actor: s.responsibleActor };
      this.state.phase = "capacity_acquisition";
      const governance = { tick: cct.tick, event: "recovery_decision", phase: this.state.phase, action: result.action, constitutionalStatus: "breach_and_repair_debt", pendingGain: structuredClone(this.state.pendingGain), openDebtIds: openDebts.map((item) => item.id).sort(), nce: result.governance };
      this.trace.push(governance);
      return { ...result, governance };
    }

    if (this.state.phase === "capacity_acquisition") {
      this.fail("CCT_CAPACITY_GAIN_PENDING", cct.tick, { pendingGain: structuredClone(this.state.pendingGain) });
    }

    if (this.state.phase === "restoration_due") {
      this.fail("CCT_RESTORATION_ACTION_INFEASIBLE", cct.tick, { axesDue });
    }

    this.fail("CCT_RECOVERY_STATE_INVALID", cct.tick, { phase: this.state.phase });
  }

  snapshot() {
    return { state: structuredClone(this.state), trace: structuredClone(this.trace), unified: this.unified.snapshot() };
  }
}

export function createCctSequencedRecoveryContender({ spec = loadRecoverySpec(), unifiedSpec = loadUnifiedSpec(), predictionKeys = [] } = {}) {
  const runtime = new CctSequencedRecoveryRuntime({ spec, unifiedSpec });
  return {
    manifest: {
      id: "cct-exec-1.1-candidate",
      version: "1.1.0-candidate",
      title: "CCT sequenced constitutional recovery candidate",
      family: "constitutional-sequenced-recovery-state-machine"
    },
    decide({ view, allowedActions, history }) {
      return runtime.decide({ view, allowedActions, history, predictionKeys });
    },
    snapshot: () => runtime.snapshot()
  };
}
