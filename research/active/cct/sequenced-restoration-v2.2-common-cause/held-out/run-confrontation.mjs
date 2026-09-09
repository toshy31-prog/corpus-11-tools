import assert from "node:assert/strict";
import { assessCommonCauseExercise } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const semantics = { continuityLanes: [
  { controller: "a", failureDomain: "zone-a", dependencyRoots: ["identity-service"], protectsAxes: axes },
  { controller: "b", failureDomain: "zone-b", dependencyRoots: ["identity-service"], protectsAxes: axes }
] };
const exercise = {
  windowTicks: 1,
  dependencyTrials: [{
    dependencyRoot: "identity-service",
    observations: [0, 1].map((tick) => ({ tick, activeLanes: [], protectedAxes: axes }))
  }]
};

const result = assessCommonCauseExercise(semantics, axes, exercise);
assert.equal(result.status, "substantially_dependent");
assert.equal(result.failures.filter((failure) => failure.reason === "common_cause_gap").length, 2);
console.log("held-out confrontation: shared dependency defeats nominal lane diversity");
