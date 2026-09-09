import { readFileSync } from "node:fs";
import { assessAxisMembershipObservability, CctAxisMembershipObservabilityRuntime } from "../sequenced-restoration-v5.3-axis-membership-observability/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateAxisConstructCalibrationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-axis-construct-calibration/v1" && candidate?.version === "5.4-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.3-AXIS-MEMBERSHIP-OBSERVABILITY-CANDIDATE-001"
    && candidate?.minimumReferenceCasesPerClass === 15 && candidate?.minimumWilsonLowerBound === 0.75
    && candidate?.z === 1.96 && candidate?.minimumIndependentAdjudicators === 2;
}

function wilsonLower(successes, total) {
  const p = successes / total;
  const denominator = 1 + SPEC.z ** 2 / total;
  const center = p + SPEC.z ** 2 / (2 * total);
  const spread = SPEC.z * Math.sqrt((p * (1 - p) + SPEC.z ** 2 / (4 * total)) / total);
  return (center - spread) / denominator;
}

export function assessAxisConstructCalibration(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessAxisMembershipObservability(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "observable_axis_membership_admission_candidate") return prior;
  const axes = [...new Set(openDebtAxes)].sort();
  const audits = validation?.axisConstructAudits;
  if (!validateAxisConstructCalibrationSpec() || !Array.isArray(audits) || audits.length !== axes.length
    || JSON.stringify(audits.map((audit) => audit?.axis).sort()) !== JSON.stringify(axes)) {
    return { status: "not_established", failures: ["axis_construct_audit_invalid"] };
  }
  const results = [];
  for (const audit of audits) {
    if ([audit.construct, audit.operationalDefinition, audit.inclusionObservable, audit.exclusionObservable,
      audit.closestRivalConstruct, audit.discriminatingObservation, audit.reversalCondition]
      .some((value) => typeof value !== "string" || value.length < 20)
      || !Array.isArray(audit.referenceCases)
      || new Set(audit.referenceCases.map((item) => item?.sampleId)).size !== validation.observations.length) {
      return { status: "not_established", failures: ["axis_construct_audit_invalid"] };
    }
    let positives = 0; let negatives = 0; let truePositives = 0; let trueNegatives = 0;
    for (const item of validation.observations) {
      const referenceCase = audit.referenceCases.find((candidate) => candidate.sampleId === item.sampleId);
      const decisions = referenceCase?.adjudications;
      if (!Array.isArray(decisions) || decisions.length < SPEC.minimumIndependentAdjudicators
        || decisions.some((decision) => typeof decision?.value !== "boolean" || decision?.blindToPredictionsAndOutcomes !== true
          || !Number.isInteger(decision?.observedAtTick) || decision.observedAtTick >= validation.outcomesAccessedAtTick
          || typeof decision?.sourceRoot !== "string" || !decision.sourceRoot
          || typeof decision?.controller !== "string" || !decision.controller
          || typeof decision?.failureDomain !== "string" || !decision.failureDomain)
        || new Set(decisions.map((decision) => decision.sourceRoot)).size !== decisions.length
        || new Set(decisions.map((decision) => decision.controller)).size !== decisions.length
        || new Set(decisions.map((decision) => decision.failureDomain)).size !== decisions.length
        || new Set(decisions.map((decision) => decision.value)).size !== 1) {
        return { status: "not_established", failures: ["axis_construct_reference_invalid"] };
      }
      const reference = decisions[0].value;
      const declared = item.debtAxes.includes(audit.axis);
      if (reference) { positives += 1; if (declared) truePositives += 1; }
      else { negatives += 1; if (!declared) trueNegatives += 1; }
    }
    if (positives < SPEC.minimumReferenceCasesPerClass || negatives < SPEC.minimumReferenceCasesPerClass) {
      return { status: "not_established", failures: ["axis_construct_reference_invalid"] };
    }
    results.push({ axis: audit.axis, sensitivityLowerBound: wilsonLower(truePositives, positives),
      specificityLowerBound: wilsonLower(trueNegatives, negatives) });
  }
  if (results.some((item) => item.sensitivityLowerBound < SPEC.minimumWilsonLowerBound
    || item.specificityLowerBound < SPEC.minimumWilsonLowerBound)) {
    return { status: "not_established", results, failures: ["axis_construct_proxy_substitution"] };
  }
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, results, failures: [] };
}

export class CctAxisConstructCalibrationRuntime extends CctAxisMembershipObservabilityRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.axisConstructCalibrationExercises?.[action];
      return assessAxisConstructCalibration(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_AXIS_CONSTRUCT_CALIBRATION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
