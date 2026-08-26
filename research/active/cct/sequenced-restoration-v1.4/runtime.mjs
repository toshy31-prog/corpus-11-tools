import { readFileSync } from "node:fs";
import {
  CctEvidenceGovernanceRuntime,
  loadEvidenceGovernanceSpec,
} from "../evidence-governance-v1.3/runtime.mjs";
import { loadOpenWorldSpec } from "../open-world-recovery-v1.2/runtime.mjs";
import { loadUnifiedSpec } from "../unified-exec/runtime.mjs";
import { minimumStagedRestorationPlan } from "../structural-solver-v0.1/solver.mjs";

const defaultSpecUrl = new URL("./spec.json", import.meta.url);
const VITAL = "besoins_vitaux";
const ECO = "plafond_ecologique";

export function loadSequencedRestorationSpec(url = defaultSpecUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateSequencedRestorationSpec(spec) {
  const errors = [];
  if (spec?.schema !== "cct-sequenced-restoration/v1" || spec?.version !== "1.4-candidate") errors.push("invalid 1.4 schema or version");
  if (spec?.parentFreeze !== "CCT-EXEC-1.3-FREEZE-2026-08-26-01") errors.push("frozen 1.3 parent required");
  if (spec?.planning?.objective !== "shortest_currently_visible_safe_cover_of_open_debts") errors.push("bounded cover objective required");
  if (spec?.planning?.replanEveryTick !== true) errors.push("replanning every tick required");
  if (spec?.planning?.deadlineExtension !== "forbidden") errors.push("deadline extension forbidden");
  if (spec?.stepAdmissibility?.harmToAnyAxis !== "forbidden") errors.push("zero-harm staged steps required");
  if (spec?.closure?.perDebtIndependentReceipt !== true || spec?.closure?.partialClosurePreserved !== true) errors.push("per-debt evidenced closure required");
  for (const field of ["acquisitionSelectionTicks", "maximumGainMaturationTicks", "finalReceiptLagTicks"]) {
    if (!Number.isInteger(spec?.deadlineFormation?.[field]) || spec.deadlineFormation[field] < 1) errors.push(`positive deadline component required: ${field}`);
  }
  if (spec?.deadlineFormation?.postPublicationExtension !== "forbidden") errors.push("post-publication deadline extension forbidden");
  return errors;
}

function normalizedAction(id, semantics, axes) {
  const deltas = semantics?.effectEvidence?.axisDeltas;
  const protectsAxes = deltas ? axes.filter((axis) => deltas[axis] > 0) : [...(semantics?.protectsAxes ?? [])];
  const harmsAxes = deltas ? axes.filter((axis) => deltas[axis] < 0) : [...(semantics?.harmsAxes ?? [])];
  return {
    id,
    resourceCost: semantics?.resourceCost,
    recoveryKind: semantics?.recoveryKind,
    vitalMaintained: deltas ? deltas[VITAL] >= 0 : semantics?.ensuresVitalMinimum === true,
    ecologyMaintained: deltas ? deltas[ECO] >= 0 : semantics?.suspendsIrreversibility === true,
    harmsAxes,
    protectsAxes,
    restoresAxes: [...(semantics?.restoresAxes ?? [])],
  };
}

function safeWaitAction(id, semantics, axes, budget, forbiddenTags) {
  const action = normalizedAction(id, semantics, axes);
  return Number.isFinite(action.resourceCost) && action.resourceCost <= budget
    && action.vitalMaintained && action.ecologyMaintained && action.harmsAxes.length === 0
    && !(semantics.constitutionalTags ?? []).some((tag) => forbiddenTags.has(tag));
}

export class CctSequencedRestorationRuntime extends CctEvidenceGovernanceRuntime {
  constructor({
    spec = loadSequencedRestorationSpec(),
    evidenceSpec = loadEvidenceGovernanceSpec(),
    openWorldSpec = loadOpenWorldSpec(),
    unifiedSpec = loadUnifiedSpec(),
  } = {}) {
    const errors = validateSequencedRestorationSpec(spec);
    if (errors.length) throw new Error(`invalid CCT 1.4 spec: ${errors.join("; ")}`);
    super({ spec: evidenceSpec, openWorldSpec, unifiedSpec });
    this.restorationSpec = structuredClone(spec);
    this.state.stagedPlan = null;
  }

  formDeadlinesAtCreation(tick, governance) {
    const created = this.state.debts.filter((debt) => debt.status === "open" && debt.createdAt === tick);
    if (!created.length) return governance;
    const components = this.restorationSpec.deadlineFormation;
    const window = components.acquisitionSelectionTicks
      + components.maximumGainMaturationTicks
      + this.evidenceSpec.verification.maximumSolicitationTicks
      + created.length
      + components.finalReceiptLagTicks;
    const deadline = tick + window;
    for (const debt of created) debt.deadline = deadline;
    const adjusted = { ...governance, deadline, deadlineFormation: { window, openDebtCount: created.length, rule: components.formula } };
    const prior = this.trace.at(-1);
    if (prior?.tick === tick && prior.event === "open_world_decision") Object.assign(prior, structuredClone(adjusted));
    this.trace.push({ tick, event: "repair_deadline_formed", deadline, window, debtIds: created.map((debt) => debt.id).sort() });
    return adjusted;
  }

  stagedDecision({ view, allowedActions, history, predictionKeys }) {
    const cct = view?.cct;
    if (!cct || !Number.isInteger(cct.tick) || !cct.actionOntology || !Array.isArray(allowedActions) || !allowedActions.length) {
      this.fail("CCT_SEQUENCED_RESTORATION_INTERFACE_MISSING", cct?.tick ?? -1);
    }
    const open = this.state.debts.filter((debt) => debt.status === "open");
    const unattempted = open.filter((debt) => !debt.restorationAction);
    const earliestDeadline = Math.min(...open.map((debt) => debt.deadline));
    const remainingActionTicks = earliestDeadline - cct.tick;
    if (remainingActionTicks < 0) this.terminal("CCT_REPAIR_DEADLINE_MISSED", cct.tick, { overdueDebtIds: open.map((debt) => debt.id).sort() });

    if (!unattempted.length) {
      const waiting = allowedActions.filter((id) => safeWaitAction(id, cct.actionOntology[id], this.axes, cct.capacityBudget, this.forbiddenTags)).sort();
      if (!waiting.length || cct.tick >= earliestDeadline) this.terminal("CCT_STAGED_REPAIR_RECEIPT_WAIT_INFEASIBLE", cct.tick, { openDebtIds: open.map((debt) => debt.id).sort() });
      const action = waiting[0];
      const delegated = this.delegate({ view, allowedActions: [action], history, predictionKeys });
      this.state.phase = "staged_restoration_receipt_pending";
      this.state.lastTick = cct.tick;
      const governance = { tick: cct.tick, event: "staged_restoration_wait", phase: this.state.phase, action, openDebtIds: open.map((debt) => debt.id).sort(), deadline: earliestDeadline };
      this.trace.push(governance);
      return { ...delegated, governance };
    }

    if (remainingActionTicks < 1) this.terminal("CCT_STAGED_RESTORATION_DEADLINE_INFEASIBLE", cct.tick, { openDebtIds: unattempted.map((debt) => debt.id).sort() });
    const actions = allowedActions.map((id) => normalizedAction(id, cct.actionOntology[id], this.axes));
    const plan = minimumStagedRestorationPlan({
      debts: unattempted.map((debt) => debt.axis),
      budget: cct.capacityBudget,
      actions,
      maximumTicks: remainingActionTicks,
    });
    if (!plan.feasible) this.terminal("CCT_STAGED_RESTORATION_PLAN_INFEASIBLE", cct.tick, {
      openDebtIds: unattempted.map((debt) => debt.id).sort(),
      coveredAxes: plan.covered,
      missingAxes: plan.missing,
      remainingActionTicks,
    });
    const action = plan.plan[0];
    const semantics = cct.actionOntology[action];
    const restoredNow = unattempted.filter((debt) => semantics.restoresAxes.includes(debt.axis));
    for (const debt of restoredNow) {
      debt.restorationAction = action;
      debt.restorationAttemptedAt = cct.tick;
    }
    const delegated = this.delegate({ view, allowedActions: [action], history, predictionKeys });
    this.state.phase = "staged_restoration";
    this.state.lastTick = cct.tick;
    this.state.stagedPlan = { computedAt: cct.tick, actions: [...plan.plan], assumption: "current action availability only", deadline: earliestDeadline };
    const governance = {
      tick: cct.tick,
      event: "staged_restoration_decision",
      phase: this.state.phase,
      action,
      attemptedDebtIds: restoredNow.map((debt) => debt.id).sort(),
      openDebtIds: open.map((debt) => debt.id).sort(),
      plan: [...plan.plan],
      deadline: earliestDeadline,
    };
    this.trace.push(governance);
    return { ...delegated, governance };
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    const cct = view?.cct;
    let receiptsProcessed = false;
    if (this.state.pendingGain && cct?.tick >= this.state.pendingGain.dueAt) {
      if (this.state.lastTick !== null && cct.tick <= this.state.lastTick) this.fail("CCT_RECOVERY_TICK_NOT_MONOTONIC", cct.tick);
      this.processReceipts(cct);
      receiptsProcessed = true;
      if (["verification_pending", "verification_contested"].includes(this.state.phase)) {
        return this.holdingDecision({ view, allowedActions, history, predictionKeys });
      }
    }

    if (["restoration_due", "staged_restoration", "staged_restoration_receipt_pending"].includes(this.state.phase)
      && this.state.debts.some((debt) => debt.status === "open")) {
      if (!receiptsProcessed) {
        if (this.state.lastTick !== null && cct.tick <= this.state.lastTick) this.fail("CCT_RECOVERY_TICK_NOT_MONOTONIC", cct.tick);
        this.processReceipts(cct);
      }
      if (this.state.debts.some((debt) => debt.status === "open")) {
        return this.stagedDecision({ view, allowedActions, history, predictionKeys });
      }
      this.state.phase = "normal";
      this.state.stagedPlan = null;
    }

    const result = super.decide({ view, allowedActions, history, predictionKeys });
    if (this.state.pendingGain) {
      const maturation = this.state.pendingGain.dueAt - this.state.pendingGain.enactedAt;
      if (maturation > this.restorationSpec.deadlineFormation.maximumGainMaturationTicks) {
        this.terminal("CCT_GAIN_MATURATION_EXCEEDS_DECLARED_BOUND", cct.tick, { maturation });
      }
    }
    if (result.governance?.phase === "triage_immediate") result.governance = this.formDeadlinesAtCreation(cct.tick, result.governance);
    return result;
  }
}

export function createCctSequencedRestorationContender({ predictionKeys = [] } = {}) {
  const runtime = new CctSequencedRestorationRuntime();
  return {
    manifest: { id: "cct-exec-1.4-candidate", version: "1.4.0-candidate", title: "CCT sequenced restoration candidate", family: "constitutional-sequenced-restoration" },
    decide({ view, allowedActions, history }) { return runtime.decide({ view, allowedActions, history, predictionKeys }); },
    snapshot: () => runtime.snapshot(),
  };
}
