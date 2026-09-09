import { completeExercise as lineageExercise, audit, axes } from "../sequenced-restoration-v3.3-cluster-lineage/fixtures.mjs";
import { computePortfolioLineageProtocolDigest } from "./runtime.mjs";

export { audit, axes };

export function completeExercise() {
  const exercise = lineageExercise();
  exercise.portfolioLineageProtocolCommitment = { algorithm: "sha256", committedAtTick: 15, digest: "" };
  exercise.portfolioLineageProtocolCommitment.digest = computePortfolioLineageProtocolDigest(exercise);
  return exercise;
}
