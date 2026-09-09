import assert from "node:assert/strict";
import { REQUIRED_DEPENDENCY_CLASSES } from "../../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  assessRiskDirectedContext,
  buildAdaptiveTrials,
  computePlanDigest,
  deriveRiskDirectedSchedule
} from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };
const pairSignals = requiredClassPairs().map((pair, index) => ({
  pair,
  minimumMargin: pair.join("+") === "network+power" ? 0.5 : 20 + index,
  sourceRoot: index % 2 === 0 ? "held-margin-a" : "held-margin-b"
}));
const classRiskScores = REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass, index) => ({
  dependencyClass,
  riskScore: dependencyClass === "identity" ? 100 : 30 - index,
  sourceRoot: index % 2 === 0 ? "held-risk-a" : "held-risk-b"
}));
const schedule = deriveRiskDirectedSchedule(pairSignals, classRiskScores);
const adaptiveTrials = buildAdaptiveTrials(schedule, axes);
const targeted = adaptiveTrials[0].sequences.find((sequence) =>
  sequence.order.join("->") === "power->network->identity"
);
targeted.observations[2].protectedAxes = ["droits"];
const exercise = {
  windowTicks: 2,
  firstExerciseTick: 31,
  pairBudget: 6,
  pairSignals,
  classRiskScores,
  planCommitment: {
    algorithm: "sha256",
    digest: computePlanDigest(pairSignals, classRiskScores, schedule),
    committedAtTick: 30,
    sourceRoot: "held-commitment-register"
  },
  adaptiveTrials
};

const result = assessRiskDirectedContext(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  triple: "network+power+identity",
  order: "power->network->identity",
  tick: 2,
  reason: "three_way_protection_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: the precommitted low-margin context exposes a new debt gap");
