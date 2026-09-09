import { audit, axes, completeExercise, validAmendment } from "../sequenced-restoration-v4.9-exposure-registry-amendment/fixtures.mjs";

export { audit, axes, completeExercise, validAmendment };

export function validValidation() {
  return {
    schema: "cct-held-out-exposure-validation/v1",
    campaignId: "campaign-4.9-followup",
    sourceRoot: "held-out-source-c",
    controller: "held-out-team-c",
    failureDomain: "held-out-site-c",
    predictionsFrozenAtTick: 4,
    outcomesAccessedAtTick: 8,
    observations: Array.from({ length: 40 }, (_, index) => {
      const outcome = index % 2;
      return { sampleId: `held-out-${index + 1}`, outcome, baselinePrediction: 0.5, augmentedPrediction: outcome ? 0.7 : 0.3 };
    })
  };
}
