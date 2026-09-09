import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { completeExercise as provenancedExercise, audit, axes } from "../sequenced-restoration-v2.9-signal-provenance/fixtures.mjs";
import { computeTransportProtocolDigest } from "./runtime.mjs";

export { audit, axes };

function pairTrial(pair, context, margin) {
  const sampleSize = 200;
  const rivalAllAxesProtectedCount = 100;
  return {
    schema: "axis-protection-contrast/v1",
    contextId: `${pair.join("+")}-target-${context}`,
    contextRoot: `pair-target-root-${context}-${pair.join("-")}`,
    controller: `target-pair-team-${context}`,
    failureDomain: `target-pair-site-${context}`,
    observedAtTick: context === "a" ? 20 : 21,
    sampleSize,
    candidateAllAxesProtectedCount: rivalAllAxesProtectedCount + Math.round(margin * sampleSize / 100),
    rivalAllAxesProtectedCount
  };
}

function riskTrial(dependencyClass, context, risk) {
  const sampleSize = 100;
  return {
    schema: "dependency-failure-frequency/v1",
    contextId: `${dependencyClass}-target-${context}`,
    contextRoot: `risk-target-root-${context}-${dependencyClass}`,
    controller: `target-risk-team-${context}`,
    failureDomain: `target-risk-site-${context}`,
    observedAtTick: context === "a" ? 20 : 21,
    sampleSize,
    failureCount: Math.round(risk * sampleSize)
  };
}

export function completeExercise() {
  const exercise = provenancedExercise();
  exercise.firstExerciseTick = 22;
  const transportEvidence = {
    constructs: {
      pairMargin: { schema: "axis-protection-contrast/v1", construct: "all_open_debt_axes_protected_rate_difference", unit: "percentage_points", openDebtAxes: axes },
      classRisk: { schema: "dependency-failure-frequency/v1", construct: "dependency_failure_frequency", unit: "proportion" }
    },
    pairMargins: exercise.pairSignals.map((signal) => ({
      pair: signal.pair,
      trials: [pairTrial(signal.pair, "a", signal.minimumMargin), pairTrial(signal.pair, "b", signal.minimumMargin)]
    })),
    classRisks: REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass) => {
      const risk = exercise.classRiskScores.find((item) => item.dependencyClass === dependencyClass).riskScore;
      return { dependencyClass, trials: [riskTrial(dependencyClass, "a", risk), riskTrial(dependencyClass, "b", risk)] };
    })
  };
  exercise.transportEvidence = transportEvidence;
  exercise.transportProtocolCommitment = { algorithm: "sha256", digest: computeTransportProtocolDigest(transportEvidence), committedAtTick: 19 };
  return exercise;
}
