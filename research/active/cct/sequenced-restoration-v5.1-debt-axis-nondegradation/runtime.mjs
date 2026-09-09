import { readFileSync } from "node:fs";
import { assessHeldOutExposureAdmission, CctHeldOutExposureAdmissionRuntime } from "../sequenced-restoration-v5.0-held-out-exposure-admission/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateDebtAxisNondegradationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-debt-axis-nondegradation/v1" && candidate?.version === "5.1-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.0-HELD-OUT-EXPOSURE-ADMISSION-CANDIDATE-001"
    && candidate?.minimumObservationsPerAxis === 20 && candidate?.maximumAcceptedBrierDegradation === 0.005
    && candidate?.maximumDetectableAxisDifference === 0.03 && candidate?.criticalValue === 2.09 && candidate?.powerMultiplier === 2.8;
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const average = mean(values); return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); }
function improvement(item) { return (item.baselinePrediction - item.outcome) ** 2 - (item.augmentedPrediction - item.outcome) ** 2; }

export function assessDebtAxisNondegradation(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessHeldOutExposureAdmission(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "held_out_exposure_admission_candidate") return prior;
  const axes = [...new Set(openDebtAxes)].sort();
  const observedAxes = [...new Set(validation.observations.map((item) => item?.debtAxis))].sort();
  if (!validateDebtAxisNondegradationSpec() || axes.length === 0 || JSON.stringify(observedAxes) !== JSON.stringify(axes)) {
    return { status: "not_established", failures: ["debt_axis_coverage_invalid"] };
  }
  const axisResults = [];
  for (const axis of axes) {
    const values = validation.observations.filter((item) => item.debtAxis === axis).map(improvement);
    if (values.length < SPEC.minimumObservationsPerAxis) {
      return { status: "not_established", failures: ["debt_axis_coverage_invalid"] };
    }
    const averageImprovement = mean(values);
    const standardError = Math.sqrt(variance(values) / values.length);
    const lowerBound = averageImprovement - SPEC.criticalValue * standardError;
    const detectableDifference = SPEC.powerMultiplier * standardError;
    axisResults.push({ axis, observations: values.length, averageImprovement, lowerBound, detectableDifference });
  }
  if (axisResults.some((item) => ![item.averageImprovement, item.lowerBound, item.detectableDifference].every(Number.isFinite)
    || item.lowerBound < -SPEC.maximumAcceptedBrierDegradation
    || item.detectableDifference > SPEC.maximumDetectableAxisDifference)) {
    return { status: "not_established", axisResults, failures: ["debt_axis_nondegradation_unestablished"] };
  }
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, axisResults, failures: [] };
}

export class CctDebtAxisNondegradationRuntime extends CctHeldOutExposureAdmissionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.debtAxisNondegradationExercises?.[action];
      return assessDebtAxisNondegradation(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_DEBT_AXIS_NONDEGRADATION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
