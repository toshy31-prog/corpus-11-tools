import { readFileSync } from "node:fs";
import { assessAxisConstructCalibration, CctAxisConstructCalibrationRuntime } from "../sequenced-restoration-v5.4-axis-construct-calibration/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateAxisCalibrationTransportSpec(candidate = SPEC) {
  return candidate?.schema === "cct-axis-calibration-transport/v1" && candidate?.version === "5.5-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.4-AXIS-CONSTRUCT-CALIBRATION-CANDIDATE-001"
    && candidate?.minimumDistinctTargetContexts === 2 && candidate?.minimumReferenceCasesPerClass === 15
    && candidate?.minimumWilsonLowerBound === 0.75 && candidate?.z === 1.96;
}

function wilsonLower(successes, total) {
  const p = successes / total; const z2 = SPEC.z ** 2;
  return (p + z2 / (2 * total) - SPEC.z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / (1 + z2 / total);
}
function contextKey(context) { return [context?.population, context?.protocol, context?.environment].join("|"); }

export function assessAxisCalibrationTransport(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessAxisConstructCalibration(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "axis_construct_supported_for_scope_candidate") return prior;
  const axes = [...new Set(openDebtAxes)].sort();
  const source = validation?.sourceContext;
  const targets = validation?.transportAudit?.targetContexts;
  if (!validateAxisCalibrationTransportSpec() || [source?.population, source?.protocol, source?.environment].some((v) => typeof v !== "string" || !v)
    || !Array.isArray(targets) || targets.length < SPEC.minimumDistinctTargetContexts
    || new Set(targets.map(contextKey)).size !== targets.length || targets.some((target) => contextKey(target) === contextKey(source))) {
    return { status: "not_established", failures: ["transport_profile_invalid"] };
  }
  const results = [];
  for (const target of targets) {
    if ([target.population, target.protocol, target.environment, target.bridgeEvidence, target.reversalCondition]
      .some((v) => typeof v !== "string" || v.length < 12)
      || !Array.isArray(target.differences) || !["population", "protocol", "environment"].every((dimension) => target.differences.includes(dimension))
      || !Array.isArray(target.axisCases) || target.axisCases.length !== axes.length) {
      return { status: "not_established", failures: ["transport_profile_invalid"] };
    }
    for (const axis of axes) {
      const packet = target.axisCases.find((item) => item.axis === axis);
      if (!packet || !Array.isArray(packet.cases) || packet.cases.length !== validation.observations.length
        || new Set(packet.cases.map((item) => item.sampleId)).size !== validation.observations.length) {
        return { status: "not_established", failures: ["target_reobservation_invalid"] };
      }
      let positives = 0; let negatives = 0; let tp = 0; let tn = 0;
      for (const item of packet.cases) {
        const decisions = item?.referenceAdjudications;
        if (typeof item?.transportedValue !== "boolean" || !Array.isArray(decisions) || decisions.length < 2
          || decisions.some((decision) => typeof decision?.value !== "boolean" || decision?.blindToTransportedValue !== true)
          || new Set(decisions.map((decision) => decision?.controller)).size !== decisions.length
          || new Set(decisions.map((decision) => decision?.failureDomain)).size !== decisions.length
          || new Set(decisions.map((decision) => decision?.value)).size !== 1) {
          return { status: "not_established", failures: ["target_reobservation_invalid"] };
        }
        const reference = decisions[0].value;
        if (reference) { positives += 1; if (item.transportedValue) tp += 1; }
        else { negatives += 1; if (!item.transportedValue) tn += 1; }
      }
      if (positives < SPEC.minimumReferenceCasesPerClass || negatives < SPEC.minimumReferenceCasesPerClass)
        return { status: "not_established", failures: ["target_reobservation_invalid"] };
      results.push({ context: contextKey(target), axis, sensitivityLowerBound: wilsonLower(tp, positives), specificityLowerBound: wilsonLower(tn, negatives) });
    }
  }
  if (results.some((item) => item.sensitivityLowerBound < SPEC.minimumWilsonLowerBound || item.specificityLowerBound < SPEC.minimumWilsonLowerBound))
    return { status: "not_established", results, failures: ["axis_calibration_not_transportable"] };
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, results, failures: [] };
}

export class CctAxisCalibrationTransportRuntime extends CctAxisConstructCalibrationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.axisCalibrationTransportExercises?.[action];
      return assessAxisCalibrationTransport(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise, packet?.amendment, packet?.validation).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_AXIS_CALIBRATION_TRANSPORT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
