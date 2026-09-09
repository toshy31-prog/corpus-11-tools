import { readFileSync } from "node:fs";
import { CctBridgePresenceRuntime, assessBridgePresence } from "../sequenced-restoration-v1.8-bridge-presence/runtime.mjs";
import { evidenceBridgeEligible } from "../sequenced-restoration-v1.7-evidence-bridge/runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const lineageFields = ["witness", "witnessFailureDomain", "sourceRoot"];

export function assessExerciseLineage(semantics, exercise) {
  if (assessBridgePresence(semantics, exercise) !== "locally_exercised_candidate") return "presence_not_established";
  const reports = exercise.reports;
  if (reports.some((report) => lineageFields.some((field) => typeof report[field] !== "string" || !report[field]))) return "independence_unknown";
  const diversity = Object.fromEntries(lineageFields.map((field) => [field, new Set(reports.map((report) => report[field])).size]));
  if (Object.values(diversity).every((count) => count >= 2)) return "materially_independent_exercise_candidate";
  return "substantially_dependent";
}

export function bridgeExerciseAdmissible(semantics, exercise) {
  return assessExerciseLineage(semantics, exercise) === "materially_independent_exercise_candidate";
}

export function selectLineageQualifiedBridge(actionOntology, allowedActions, openDebtAxes, exercises = {}) {
  return [...allowedActions].sort().find((id) => evidenceBridgeEligible(actionOntology?.[id], openDebtAxes)
    && bridgeExerciseAdmissible(actionOntology[id], exercises[id])) ?? null;
}

export class CctExerciseLineageRuntime extends CctBridgePresenceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectLineageQualifiedBridge(view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises);
    if (!selected) this.terminal("CCT_EVIDENCE_BRIDGE_LINEAGE_INSUFFICIENT", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

export function validateExerciseLineageSpec(candidate) {
  return candidate?.schema === spec.schema && candidate?.version === spec.version && typeof candidate?.rule === "string";
}
