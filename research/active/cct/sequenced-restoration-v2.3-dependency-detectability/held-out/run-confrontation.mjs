import assert from "node:assert/strict";
import { assessDependencyDetectability, REQUIRED_DEPENDENCY_CLASSES } from "../runtime.mjs";

const thresholds = Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 5]));
const channels = ["log", "probe"].map((format) => ({
  id: format,
  dependencyClasses: [...REQUIRED_DEPENDENCY_CLASSES],
  controller: "same-operator",
  failureDomain: `domain-${format}`,
  detectionThreshold: 5,
  noiseCeiling: 1
}));
const blindChallenges = REQUIRED_DEPENDENCY_CLASSES.flatMap((dependencyClass) => [1, 2].map((n) => ({
  id: `${dependencyClass}-${n}`,
  dependencyClass,
  blind: true,
  impact: 5,
  sourceRoot: `root-${n}`,
  detectedBy: ["log", "probe"],
  detectionTick: 1
})));

const result = assessDependencyDetectability({ windowTicks: 2, materialityThresholds: thresholds, channels, blindChallenges });
assert.equal(result.status, "detectability_unknown");
assert.equal(result.failures.every((failure) => failure.reason === "independent_detection_channels_missing"), true);
console.log("held-out confrontation: two formats under one controller do not establish detectability");
