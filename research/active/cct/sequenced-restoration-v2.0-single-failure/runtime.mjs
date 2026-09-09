import { readFileSync } from "node:fs";
import { CctExerciseLineageRuntime, selectLineageQualifiedBridge } from "../sequenced-restoration-v1.9-exercise-lineage/runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function singleLaneFailureCoverage(semantics, openDebtAxes) {
  const lanes = semantics?.continuityLanes;
  if (!Array.isArray(lanes) || lanes.length < 2) return { tolerant: false, failures: ["insufficient_lanes"] };
  const failures = [];
  for (let failed = 0; failed < lanes.length; failed += 1) {
    const remaining = new Set(lanes.flatMap((lane, index) => index === failed ? [] : lane.protectsAxes ?? []));
    const missing = openDebtAxes.filter((axis) => !remaining.has(axis));
    if (missing.length) failures.push({ failedLane: failed, missingAxes: missing });
  }
  return { tolerant: failures.length === 0, failures };
}

export function selectSingleFailureTolerantBridge(actionOntology, allowedActions, openDebtAxes, exercises = {}) {
  const qualified = [...allowedActions].filter((id) => singleLaneFailureCoverage(actionOntology?.[id], openDebtAxes).tolerant);
  return selectLineageQualifiedBridge(actionOntology, qualified, openDebtAxes, exercises);
}

export class CctSingleFailureBridgeRuntime extends CctExerciseLineageRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectSingleFailureTolerantBridge(view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises);
    if (!selected) this.terminal("CCT_EVIDENCE_BRIDGE_SINGLE_FAILURE_UNSAFE", view?.cct?.tick ?? -1, { openDebtAxes });
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

export function validateSingleFailureSpec(candidate) {
  return candidate?.schema === spec.schema && candidate?.version === spec.version && typeof candidate?.rule === "string";
}
