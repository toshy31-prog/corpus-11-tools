import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  buildAdaptiveTrials,
  computePlanDigest,
  deriveRiskDirectedSchedule
} from "../sequenced-restoration-v2.8-risk-directed-context/runtime.mjs";
import { compileSignalEvidence } from "./runtime.mjs";

export const axes = ["droits", "attribution_du_pouvoir"];
export const audit = {
  materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10]))
};

export function completeExercise() {
  const signalEvidence = {
    pairMargins: requiredClassPairs().map((pair, index) => {
      const base = pair.join("+") === "network+power" ? 0.5 : 10 + index;
      return {
        pair,
        attestations: [
          { schema: "axis-protection-margin/v1", sourceRoot: `pair-a-${index}`, controller: "margin-team-a", failureDomain: "margin-site-a", measuredAtTick: 18, value: base, sampleSize: 12, blindChallengePassed: true },
          { schema: "axis-protection-margin/v1", sourceRoot: `pair-b-${index}`, controller: "margin-team-b", failureDomain: "margin-site-b", measuredAtTick: 18, value: base + 0.5, sampleSize: 12, blindChallengePassed: true }
        ]
      };
    }),
    classRisks: REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass, index) => {
      const base = dependencyClass === "identity" ? 0.9 : 0.2 - (index * 0.01);
      return {
        dependencyClass,
        attestations: [
          { schema: "dependency-failure-risk/v1", sourceRoot: `risk-a-${index}`, controller: "risk-team-a", failureDomain: "risk-site-a", measuredAtTick: 18, value: base, sampleSize: 40, blindChallengePassed: true, calibrationError: 0.06 },
          { schema: "dependency-failure-risk/v1", sourceRoot: `risk-b-${index}`, controller: "risk-team-b", failureDomain: "risk-site-b", measuredAtTick: 18, value: base + 0.02, sampleSize: 40, blindChallengePassed: true, calibrationError: 0.07 }
        ]
      };
    })
  };
  const compiled = compileSignalEvidence(signalEvidence, 19);
  const schedule = deriveRiskDirectedSchedule(compiled.pairSignals, compiled.classRiskScores);
  return {
    signalEvidence,
    windowTicks: 2,
    firstExerciseTick: 20,
    pairBudget: 6,
    pairSignals: compiled.pairSignals,
    classRiskScores: compiled.classRiskScores,
    planCommitment: {
      algorithm: "sha256",
      digest: computePlanDigest(compiled.pairSignals, compiled.classRiskScores, schedule),
      committedAtTick: 19,
      sourceRoot: "independent-plan-register"
    },
    adaptiveTrials: buildAdaptiveTrials(schedule, axes)
  };
}
