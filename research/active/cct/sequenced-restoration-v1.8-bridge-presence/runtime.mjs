import { readFileSync } from "node:fs";
import { CctEvidenceBridgeRuntime, evidenceBridgeEligible, selectEvidenceBridge } from "../sequenced-restoration-v1.7-evidence-bridge/runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessBridgePresence(semantics, exercise) {
  if (!semantics?.continuityLanes?.length) return "absent";
  if (!exercise) return "declared_only";
  const laneIds = semantics.continuityLanes.map((_, index) => String(index));
  const reports = exercise?.reports;
  if (!Array.isArray(reports) || !reports.length) return "declared_only";
  const witnessed = reports.filter((report) => report?.outcome === "reachable" && typeof report?.witness === "string");
  if (!witnessed.length) return "unexercised";
  const required = laneIds.flatMap((laneId) => [`lane:${laneId}`, `recourse:${laneId}`]);
  if (!required.every((target) => witnessed.some((report) => report.target === target))) return "partially_exercised";
  const controllers = new Set(semantics.continuityLanes.map((lane) => lane.controller));
  const domains = new Set(semantics.continuityLanes.map((lane) => lane.failureDomain));
  if (witnessed.some((report) => controllers.has(report.witness) || domains.has(report.witness))) return "witness_not_separate";
  return "locally_exercised_candidate";
}

export function selectExercisedEvidenceBridge(actionOntology, allowedActions, openDebtAxes, exercises = {}) {
  const candidates = [...allowedActions].filter((id) => evidenceBridgeEligible(actionOntology?.[id], openDebtAxes)
    && assessBridgePresence(actionOntology[id], exercises[id]) === "locally_exercised_candidate");
  return selectEvidenceBridge(actionOntology, candidates, openDebtAxes);
}

export class CctBridgePresenceRuntime extends CctEvidenceBridgeRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectExercisedEvidenceBridge(view?.cct?.actionOntology, allowedActions, axes, view?.cct?.bridgeExercises);
    if (!selected) this.terminal("CCT_EVIDENCE_BRIDGE_UNEXERCISED", view?.cct?.tick ?? -1, { openDebtAxes: axes });
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

export function validateBridgePresenceSpec(candidate) {
  return candidate?.schema === spec.schema && candidate?.version === spec.version && typeof candidate?.rule === "string";
}
