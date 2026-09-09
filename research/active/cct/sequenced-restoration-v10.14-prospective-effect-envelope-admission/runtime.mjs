import { readFileSync } from "node:fs";
import { assessMinimaxEnvelopeCoverage } from "../sequenced-restoration-v10.13-minimax-envelope-coverage/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

function assessEntry(entry, registerFrozenAt) {
  const missingFields = SPEC.requiredEvidenceFields.filter((field) => entry[field] === undefined);
  const failures = missingFields.map((field) => `missing_${field}`);
  if (entry.estimateType !== undefined && !SPEC.admissibleEstimateTypes.includes(entry.estimateType)) failures.push("inadmissible_estimate_type");
  if (entry.targetMatch !== undefined && entry.targetMatch !== SPEC.admissibleTargetMatch) failures.push("target_mismatch");
  if (entry.frozenAt !== undefined && !(entry.frozenAt < registerFrozenAt)) failures.push("effect_evidence_not_prospectively_frozen");
  if (entry.uncertaintyBounds !== undefined && (!Array.isArray(entry.uncertaintyBounds) || entry.uncertaintyBounds.length !== 2 || entry.uncertaintyBounds[0] > entry.alternativeDistanceProbability || entry.uncertaintyBounds[1] < entry.alternativeDistanceProbability)) failures.push("effect_outside_uncertainty_bounds");
  return { alternativeDistanceProbability: entry.alternativeDistanceProbability, admitted: failures.length === 0, failures };
}

export function assessProspectiveEffectEnvelopeAdmission(args) {
  const prior = assessMinimaxEnvelopeCoverage(args);
  if (prior.status !== "minimax_envelope_coverage_candidate") return prior;
  const expected = prior.powerEnvelope.map((plan) => plan.alternativeDistanceProbability);
  const entries = args.effectEnvelopeRegister ?? [];
  const observed = entries.map((entry) => entry.alternativeDistanceProbability);
  if (JSON.stringify(observed) !== JSON.stringify(expected)) return { status: "not_established", failures: ["effect_envelope_register_mismatch"] };
  const admission = entries.map((entry) => assessEntry(entry, args.registerFrozenAt));
  const allEffectsAdmitted = admission.every((entry) => entry.admitted);
  if (args.requestedBudgetStatus === "evidence_justified_requirement" && !allEffectsAdmitted) {
    return { status: "not_established", failures: ["unsubstantiated_envelope_cannot_set_operational_budget"], admission };
  }
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "prospective_effect_envelope_admission_rule",
    admission,
    allEffectsAdmitted,
    budgetStatus: allEffectsAdmitted ? args.requestedBudgetStatus : "scenario_ceiling_only",
    operationalRequirementEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
