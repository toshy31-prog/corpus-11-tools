import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assessDependencyDetectability,
  CctDependencyDetectabilityRuntime,
  REQUIRED_DEPENDENCY_CLASSES,
  validateDependencyDetectabilitySpec
} from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

function completeAudit() {
  const materialityThresholds = Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10]));
  const channels = ["a", "b"].map((suffix) => ({
    id: `detector-${suffix}`,
    dependencyClasses: [...REQUIRED_DEPENDENCY_CLASSES],
    controller: `controller-${suffix}`,
    failureDomain: `domain-${suffix}`,
    detectionThreshold: 10,
    noiseCeiling: 2
  }));
  const blindChallenges = REQUIRED_DEPENDENCY_CLASSES.flatMap((dependencyClass) => ["x", "y"].map((suffix) => ({
    id: `${dependencyClass}-${suffix}`,
    dependencyClass,
    blind: true,
    impact: 10,
    sourceRoot: `source-${suffix}`,
    detectedBy: ["detector-a", "detector-b"],
    detectionTick: 1
  })));
  return { windowTicks: 2, materialityThresholds, channels, blindChallenges };
}

test("all baseline classes require two independent exercised detectors", () => {
  assert.equal(validateDependencyDetectabilitySpec(spec), true);
  assert.deepEqual(assessDependencyDetectability(completeAudit()), {
    status: "bounded_inventory_detection_candidate",
    failures: []
  });
});

test("format diversity under one controller is not independent detection", () => {
  const audit = completeAudit();
  audit.channels[1].controller = audit.channels[0].controller;
  const result = assessDependencyDetectability(audit);
  assert.equal(result.status, "detectability_unknown");
  assert.deepEqual(result.failures, REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass) => ({
    dependencyClass,
    reason: "independent_detection_channels_missing"
  })));
});

test("one missed blind challenge preserves unknown detectability", () => {
  const audit = completeAudit();
  audit.blindChallenges.find((challenge) => challenge.id === "power-y").detectedBy = ["detector-a"];
  assert.deepEqual(assessDependencyDetectability(audit).failures, [{
    dependencyClass: "power",
    challenge: "power-y",
    reason: "blind_challenge_not_detected_in_window"
  }]);
});

test("runtime blocks a bridge when inventory detection evidence is absent", () => {
  const runtime = new CctDependencyDetectabilityRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = [{ axis: "droits", status: "open" }];
  assert.throws(
    () => runtime.decide({ view: { cct: { tick: 9 } }, allowedActions: ["bridge"] }),
    { message: "CCT_DEPENDENCY_INVENTORY_DETECTABILITY_UNESTABLISHED" }
  );
});

