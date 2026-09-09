import { readFileSync } from "node:fs";
import { CctEvidenceHoldRuntime, evidenceHoldEligible } from "../sequenced-restoration-v1.6-evidence-hold/runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

function distinct(values) {
  return new Set(values).size === values.length;
}

export function evidenceBridgeEligible(semantics, openDebtAxes) {
  if (!evidenceHoldEligible(semantics, openDebtAxes) || semantics?.closesDebts === true) return false;
  const lanes = semantics?.continuityLanes;
  if (!Array.isArray(lanes) || lanes.length < 2) return false;
  if (!lanes.every((lane) => typeof lane?.controller === "string"
    && typeof lane?.failureDomain === "string"
    && typeof lane?.recourseRoute === "string"
    && Array.isArray(lane?.protectsAxes))) return false;
  if (!distinct(lanes.map((lane) => lane.controller))
    || !distinct(lanes.map((lane) => lane.failureDomain))
    || !distinct(lanes.map((lane) => lane.recourseRoute))) return false;
  const covered = new Set(lanes.flatMap((lane) => lane.protectsAxes));
  return openDebtAxes.every((axis) => covered.has(axis));
}

export function selectEvidenceBridge(actionOntology, allowedActions, openDebtAxes) {
  return [...allowedActions].sort().find((id) => evidenceBridgeEligible(actionOntology?.[id], openDebtAxes)) ?? null;
}

export class CctEvidenceBridgeRuntime extends CctEvidenceHoldRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectEvidenceBridge(view?.cct?.actionOntology, allowedActions, openDebtAxes);
    if (!selected) this.terminal("CCT_EVIDENCE_BRIDGE_UNAVAILABLE", view?.cct?.tick ?? -1, { openDebtAxes });
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

export function validateEvidenceBridgeSpec(candidate) {
  return candidate?.schema === spec.schema && candidate?.version === spec.version && typeof candidate?.rule === "string";
}
