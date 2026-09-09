import { readFileSync } from "node:fs";
import { assessIntersectionalNondegradation, CctIntersectionalNondegradationRuntime } from "../sequenced-restoration-v5.2-intersectional-nondegradation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateAxisMembershipObservabilitySpec(candidate = SPEC) {
  return candidate?.schema === "cct-axis-membership-observability/v1" && candidate?.version === "5.3-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-5.2-INTERSECTIONAL-NONDEGRADATION-CANDIDATE-001"
    && candidate?.minimumIndependentChannelsPerAxis === 2 && candidate?.requireCompleteAxisObservation === true
    && candidate?.requirePreOutcomeObservation === true;
}

function sorted(values) { return [...values].sort(); }

export function assessAxisMembershipObservability(openDebtAxes, dependencyAudit, currentExercise, amendment, validation) {
  const prior = assessIntersectionalNondegradation(openDebtAxes, dependencyAudit, currentExercise, amendment, validation);
  if (prior.status !== "intersectional_nondegradation_admission_candidate") return prior;
  const axes = sorted(new Set(openDebtAxes));
  const invalid = !validateAxisMembershipObservabilitySpec() || validation.observations.some((item) => {
    const records = item?.axisMembershipMeasurements;
    if (!Array.isArray(records) || records.length !== axes.length
      || JSON.stringify(sorted(records.map((record) => record?.axis))) !== JSON.stringify(axes)) return true;
    const measuredMembership = [];
    for (const record of records) {
      const measurements = record?.measurements;
      if (!Array.isArray(measurements) || measurements.length < SPEC.minimumIndependentChannelsPerAxis
        || measurements.some((measurement) => typeof measurement?.channel !== "string" || !measurement.channel
          || typeof measurement?.controller !== "string" || !measurement.controller
          || typeof measurement?.failureDomain !== "string" || !measurement.failureDomain
          || typeof measurement?.value !== "boolean" || !Number.isInteger(measurement?.observedAtTick)
          || measurement.observedAtTick >= validation.outcomesAccessedAtTick)
        || new Set(measurements.map((measurement) => measurement.channel)).size !== measurements.length
        || new Set(measurements.map((measurement) => measurement.controller)).size !== measurements.length
        || new Set(measurements.map((measurement) => measurement.failureDomain)).size !== measurements.length
        || new Set(measurements.map((measurement) => measurement.value)).size !== 1) return true;
      if (measurements[0].value) measuredMembership.push(record.axis);
    }
    return JSON.stringify(sorted(measuredMembership)) !== JSON.stringify(sorted(item.debtAxes));
  });
  if (invalid) return { status: "not_established", failures: ["axis_membership_observability_unestablished"] };
  return { status: SPEC.successStatus, admittedVariable: amendment.variable, auditedObservations: validation.observations.length, failures: [] };
}

export class CctAxisMembershipObservabilityRuntime extends CctIntersectionalNondegradationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.axisMembershipObservabilityExercises?.[action];
      return assessAxisMembershipObservability(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_AXIS_MEMBERSHIP_OBSERVABILITY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
