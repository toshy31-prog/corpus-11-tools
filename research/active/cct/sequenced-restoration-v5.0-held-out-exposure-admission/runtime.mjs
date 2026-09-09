import { readFileSync } from "node:fs";
import { assessRegistryAmendment, CctRegistryAmendmentRuntime } from "../sequenced-restoration-v4.9-exposure-registry-amendment/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateHeldOutAdmissionSpec(candidate = SPEC) {
  return candidate?.schema === "cct-held-out-exposure-admission/v1" && candidate?.version === "5.0-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.9-EXPOSURE-REGISTRY-AMENDMENT-CANDIDATE-001"
    && candidate?.minimumObservations === 40 && candidate?.minimumBrierImprovementLowerBound === 0.01
    && candidate?.maximumDetectableImprovement === 0.02 && candidate?.criticalValue === 2.02 && candidate?.powerMultiplier === 2.8;
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const average = mean(values); return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); }

export function assessHeldOutExposureAdmission(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessRegistryAmendment(openDebtAxes, dependencyAudit, currentExercise, amendment);
  if (prior.status !== "precommitted_future_registry_amendment_candidate") return prior;
  const observations = validation?.observations;
  if (!validateHeldOutAdmissionSpec() || validation?.schema !== "cct-held-out-exposure-validation/v1"
    || validation?.campaignId !== amendment.effectiveCampaignId
    || typeof validation?.sourceRoot !== "string" || !validation.sourceRoot
    || typeof validation?.controller !== "string" || !validation.controller
    || typeof validation?.failureDomain !== "string" || !validation.failureDomain
    || amendment.attestations.some((item) => item.sourceRoot === validation.sourceRoot
      || item.controller === validation.controller || item.failureDomain === validation.failureDomain)
    || !Number.isInteger(validation?.predictionsFrozenAtTick) || !Number.isInteger(validation?.outcomesAccessedAtTick)
    || validation.predictionsFrozenAtTick >= validation.outcomesAccessedAtTick
    || !Array.isArray(observations) || observations.length < SPEC.minimumObservations
    || new Set(observations.map((item) => item?.sampleId)).size !== observations.length
    || observations.some((item) => typeof item?.sampleId !== "string" || !item.sampleId
      || ![0, 1].includes(item?.outcome) || !Number.isFinite(item?.baselinePrediction)
      || !Number.isFinite(item?.augmentedPrediction) || item.baselinePrediction < 0 || item.baselinePrediction > 1
      || item.augmentedPrediction < 0 || item.augmentedPrediction > 1)) {
    return { status: "not_established", failures: ["held_out_admission_protocol_invalid"] };
  }
  const improvements = observations.map((item) => (item.baselinePrediction - item.outcome) ** 2 - (item.augmentedPrediction - item.outcome) ** 2);
  const averageImprovement = mean(improvements);
  const standardError = Math.sqrt(variance(improvements) / improvements.length);
  const lowerBound = averageImprovement - SPEC.criticalValue * standardError;
  const detectableImprovement = SPEC.powerMultiplier * standardError;
  if (![averageImprovement, standardError, lowerBound, detectableImprovement].every(Number.isFinite)
    || lowerBound < SPEC.minimumBrierImprovementLowerBound || detectableImprovement > SPEC.maximumDetectableImprovement) {
    return { status: "not_established", averageImprovement, lowerBound, detectableImprovement, failures: ["held_out_incremental_value_unestablished"] };
  }
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, campaignId: validation.campaignId,
    averageImprovement, lowerBound, detectableImprovement, failures: [] };
}

export class CctHeldOutExposureAdmissionRuntime extends CctRegistryAmendmentRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.heldOutExposureAdmissionExercises?.[action];
      return assessHeldOutExposureAdmission(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_HELD_OUT_EXPOSURE_ADMISSION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
