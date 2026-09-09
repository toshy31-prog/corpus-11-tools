import { readFileSync } from "node:fs";
import { assessDebtAxisNondegradation, CctDebtAxisNondegradationRuntime } from "../sequenced-restoration-v5.1-debt-axis-nondegradation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateIntersectionalNondegradationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-intersectional-nondegradation/v1" && candidate?.version === "5.2-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.1-DEBT-AXIS-NONDEGRADATION-CANDIDATE-001"
    && candidate?.intersectionOrder === 2 && candidate?.minimumObservationsPerIntersection === 10
    && candidate?.maximumAcceptedBrierDegradation === 0.005
    && candidate?.maximumDetectableIntersectionDifference === 0.04 && candidate?.criticalValue === 2.26
    && candidate?.powerMultiplier === 2.8;
}

function pairs(values) { return values.flatMap((left, index) => values.slice(index + 1).map((right) => [left, right])); }
function key(values) { return [...values].sort().join("+"); }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const average = mean(values); return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); }
function improvement(item) { return (item.baselinePrediction - item.outcome) ** 2 - (item.augmentedPrediction - item.outcome) ** 2; }

export function assessIntersectionalNondegradation(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessDebtAxisNondegradation(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "debt_axis_nondegradation_admission_candidate") return prior;
  const axes = [...new Set(openDebtAxes)].sort();
  const required = pairs(axes).map(key).sort();
  const declared = (validation?.intersectionRegistry ?? []).map(key).sort();
  if (!validateIntersectionalNondegradationSpec() || required.length === 0
    || JSON.stringify(declared) !== JSON.stringify(required)
    || validation.observations.some((item) => !Array.isArray(item?.debtAxes)
      || new Set(item.debtAxes).size !== item.debtAxes.length
      || item.debtAxes.some((axis) => !axes.includes(axis)))) {
    return { status: "not_established", failures: ["intersection_registry_invalid"] };
  }
  const intersectionResults = [];
  for (const intersection of pairs(axes)) {
    const values = validation.observations.filter((item) => intersection.every((axis) => item.debtAxes.includes(axis))).map(improvement);
    if (values.length < SPEC.minimumObservationsPerIntersection) {
      return { status: "not_established", failures: ["intersection_coverage_invalid"] };
    }
    const averageImprovement = mean(values);
    const standardError = Math.sqrt(variance(values) / values.length);
    const lowerBound = averageImprovement - SPEC.criticalValue * standardError;
    const detectableDifference = SPEC.powerMultiplier * standardError;
    intersectionResults.push({ intersection, observations: values.length, averageImprovement, lowerBound, detectableDifference });
  }
  if (intersectionResults.some((item) => ![item.averageImprovement, item.lowerBound, item.detectableDifference].every(Number.isFinite)
    || item.lowerBound < -SPEC.maximumAcceptedBrierDegradation
    || item.detectableDifference > SPEC.maximumDetectableIntersectionDifference)) {
    return { status: "not_established", intersectionResults, failures: ["intersectional_nondegradation_unestablished"] };
  }
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, intersectionResults, failures: [] };
}

export class CctIntersectionalNondegradationRuntime extends CctDebtAxisNondegradationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.intersectionalNondegradationExercises?.[action];
      return assessIntersectionalNondegradation(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_INTERSECTIONAL_NONDEGRADATION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
