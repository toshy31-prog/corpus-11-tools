import { readFileSync } from "node:fs";
import { CctV014Runtime, loadV014Spec } from "../next-version/runtime-v014.mjs";

const defaultSpecUrl = new URL("./spec.json", import.meta.url);

export function loadUnifiedSpec(url = defaultSpecUrl) {
  return JSON.parse(readFileSync(url, "utf8"));
}

export function validateUnifiedSpec(spec) {
  const errors = [];
  if (spec?.schema !== "cct-unified-exec/v1") errors.push("schema must be cct-unified-exec/v1");
  if (spec?.version !== "1.0-candidate") errors.push("version must be 1.0-candidate");
  if (!["written_untested", "locally_tested"].includes(spec?.lifecycle?.state)) errors.push("lifecycle must remain written_untested or locally_tested");
  for (const value of ["authorization", "deployment", "institutional effect", "composed robustness", "external transport"]) {
    if (!spec?.lifecycle?.notEstablished?.includes(value)) errors.push(`missing lifecycle boundary: ${value}`);
  }
  const axes = spec?.I15?.axes ?? [];
  if (axes.length !== 6 || new Set(axes).size !== 6) errors.push("I15 requires six unique constitutional axes");
  const forbidden = spec?.I13?.forbiddenActionTags ?? [];
  if (!forbidden.length || new Set(forbidden).size !== forbidden.length) errors.push("I13 forbidden tags must be unique and non-empty");
  if (spec?.I13?.activation !== "always") errors.push("I13 must remain permanently active");
  if (spec?.I15?.minimumComposedAxes !== 2) errors.push("I15 composed threshold must remain two axes");
  if (!spec?.I15?.infeasibleRule?.includes("never select a partial protection")) errors.push("I15 must fail closed on partial protection");
  if (!spec?.interface?.fairness?.includes("every contender")) errors.push("matched public semantics are required");
  return errors;
}

function validateRisk(risk, axes) {
  return risk && typeof risk.id === "string" && axes.includes(risk.axis)
    && Number.isFinite(risk.severity) && risk.severity >= 0
    && typeof risk.channel === "string" && typeof risk.failureDomain === "string"
    && typeof risk.confirmed === "boolean";
}

function normalizePublicView(view, allowedActions, spec) {
  const cct = view?.cct;
  if (!cct || !Array.isArray(cct.axisRisks) || !Number.isFinite(cct.capacityBudget) || cct.capacityBudget < 0) {
    throw new Error("CCT_EXEC_INTERFACE_MISSING: axisRisks|capacityBudget");
  }
  if (cct.axisRisks.some((risk) => !validateRisk(risk, spec.I15.axes))) throw new Error("CCT_EXEC_INVALID_AXIS_RISK");
  const ontology = cct.actionOntology;
  if (!ontology || typeof ontology !== "object") throw new Error("CCT_EXEC_INTERFACE_MISSING: actionOntology");
  for (const action of allowedActions) {
    const semantics = ontology[action];
    if (!semantics || !Number.isFinite(semantics.resourceCost) || semantics.resourceCost < 0
      || !Array.isArray(semantics.protectsAxes) || !Array.isArray(semantics.harmsAxes)
      || !Array.isArray(semantics.constitutionalTags)) {
      throw new Error(`CCT_EXEC_ACTION_SEMANTICS_MISSING: ${action}`);
    }
    for (const axis of [...semantics.protectsAxes, ...semantics.harmsAxes]) {
      if (!spec.I15.axes.includes(axis)) throw new Error(`CCT_EXEC_UNKNOWN_AXIS: ${axis}`);
    }
  }
  return cct;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export class CctUnifiedRuntime {
  constructor({ spec = loadUnifiedSpec(), nceSpec = loadV014Spec() } = {}) {
    const errors = validateUnifiedSpec(spec);
    if (errors.length) throw new Error(`invalid CCT unified spec: ${errors.join("; ")}`);
    this.spec = structuredClone(spec);
    this.nce = new CctV014Runtime(nceSpec);
    this.trace = [];
  }

  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (!Array.isArray(allowedActions) || !allowedActions.length) throw new Error("CCT_EXEC_INTERFACE_MISSING: allowedActions");
    const cct = normalizePublicView(view, allowedActions, this.spec);
    const forbiddenSubjectTags = new Set(this.spec.I13.forbiddenActionTags);
    const axes = new Set(this.spec.I15.axes);
    const activeRisks = cct.axisRisks.filter((risk) => risk.confirmed && risk.severity > 0);
    const activeAxes = uniqueSorted(activeRisks.map((risk) => risk.axis));
    const semanticsByAction = cct.actionOntology;

    let eligible = allowedActions.filter((action) => {
      const semantics = semanticsByAction[action];
      return semantics.resourceCost <= cct.capacityBudget
        && !semantics.constitutionalTags.some((tag) => forbiddenSubjectTags.has(tag))
        && !semantics.harmsAxes.some((axis) => axes.has(axis));
    });
    if (!eligible.length) {
      const event = { tick: cct.tick, event: "refusal", code: "CCT_I13_OR_BUDGET_NO_ADMISSIBLE_ACTION", activeAxes, capacityBudget: cct.capacityBudget };
      this.trace.push(event);
      throw new Error(event.code);
    }

    if (activeAxes.length) {
      eligible = eligible.filter((action) => activeAxes.every((axis) => semanticsByAction[action].protectsAxes.includes(axis)));
      if (!eligible.length) {
        const event = {
          tick: cct.tick,
          event: "refusal",
          code: "CCT_COMPOSED_PROTECTION_INFEASIBLE",
          activeAxes,
          composed: activeAxes.length >= this.spec.I15.minimumComposedAxes,
          capacityBudget: cct.capacityBudget,
        };
        this.trace.push(event);
        throw new Error(event.code);
      }
    }

    const result = this.nce.decide({ view, allowedActions: eligible, history, predictionKeys });
    const event = {
      tick: cct.tick,
      event: "unified_decision",
      action: result.action,
      I13: "subject_capacities_preserved",
      I15: activeAxes.length ? "all_active_axes_covered" : "no_confirmed_axis_risk",
      activeAxes,
      composed: activeAxes.length >= this.spec.I15.minimumComposedAxes,
      capacityBudget: cct.capacityBudget,
      resourceCost: semanticsByAction[result.action].resourceCost,
      nce: result.governance,
    };
    this.trace.push(event);
    return { ...result, governance: event };
  }

  snapshot() {
    return { trace: structuredClone(this.trace), nce: this.nce.snapshot() };
  }
}

export function createCctUnifiedContender({ spec = loadUnifiedSpec(), nceSpec = loadV014Spec(), predictionKeys = [] } = {}) {
  const runtime = new CctUnifiedRuntime({ spec, nceSpec });
  return {
    manifest: {
      id: "cct-exec-1.0-candidate",
      version: "1.0.0-candidate",
      title: "CCT unified constitutional executable candidate",
      family: "constitutional-composed-state-machine",
    },
    decide({ view, allowedActions, history }) {
      return runtime.decide({ view, allowedActions, history, predictionKeys });
    },
    snapshot: () => runtime.snapshot(),
  };
}
