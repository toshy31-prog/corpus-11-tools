import { readFileSync } from "node:fs";
import { assessRivalEffectPowerEnvelope } from "../sequenced-restoration-v10.12-rival-effect-power-envelope/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessMinimaxEnvelopeCoverage(args) {
  const prior = assessRivalEffectPowerEnvelope(args);
  if (prior.status !== "rival_effect_power_envelope_candidate") return prior;

  const requiredBitsPerBatch = Math.max(...prior.powerEnvelope.map((plan) => plan.minimumBitsPerBatch));
  if (requiredBitsPerBatch !== SPEC.requiredBitsPerBatch) {
    return { status: "not_established", failures: ["minimax_coverage_rule_miscalibrated"] };
  }
  if (args.selectedAlternativeDistanceProbability !== undefined) {
    return { status: "not_established", failures: ["post_hoc_effect_scope_selection_forbidden"] };
  }

  const coverageRequested = args.requestedEnvelopeCoverage === "all_precommitted_alternatives";
  const coverageEligible = args.availableBitsPerBatch >= requiredBitsPerBatch;
  if (coverageRequested && !coverageEligible) {
    return {
      status: "not_established",
      failures: ["insufficient_bits_for_declared_effect_envelope"],
      requiredBitsPerBatch,
      availableBitsPerBatch: args.availableBitsPerBatch,
    };
  }

  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "precommitted_minimax_envelope_coverage_rule",
    selectionRule: SPEC.selectionRule,
    requiredBitsPerBatch,
    availableBitsPerBatch: args.availableBitsPerBatch,
    coverageEligible,
    strongerConclusionReopened: false,
    notEstablished: SPEC.notEstablished,
  };
}
