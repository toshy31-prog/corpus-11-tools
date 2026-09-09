import { audit, axes, completeExercise as registryExercise } from "../sequenced-restoration-v4.8-exposure-registry-pair-scan/fixtures.mjs";
import { computeRegistryAmendmentDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  return registryExercise();
}

export function validAmendment() {
  const amendment = {
    schema: "cct-exposure-registry-amendment-record/v1",
    variable: "housing_insecurity",
    operationalDefinition: "Share of households lacking stable access to habitable housing before assignment.",
    admissibilityPrediction: "Higher pre-treatment housing insecurity predicts a larger placebo access-loss imbalance.",
    currentCampaignId: "campaign-4.8",
    effectiveCampaignId: "campaign-4.9-followup",
    proposedAtTick: 2,
    outcomeAccessTick: 6,
    attestations: [
      { sourceRoot: "housing-source-a", controller: "housing-team-a", failureDomain: "housing-site-a", observedAtTick: 1, blindToCurrentOutcomes: true },
      { sourceRoot: "housing-source-b", controller: "housing-team-b", failureDomain: "housing-site-b", observedAtTick: 1, blindToCurrentOutcomes: true }
    ],
    commitment: { algorithm: "sha256", committedAtTick: 2, digest: "" }
  };
  amendment.commitment.digest = computeRegistryAmendmentDigest(amendment);
  return amendment;
}
