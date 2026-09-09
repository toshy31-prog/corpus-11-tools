import assert from "node:assert/strict";
import { assessTemporalFailover } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const semantics = { continuityLanes: [
  { protectsAxes: axes }, { protectsAxes: axes }
] };
const exercise = {
  windowTicks: 2,
  trials: [
    {
      failedLane: 0,
      observations: [
        { tick: 0, activeLanes: [1], protectedAxes: axes },
        { tick: 1, activeLanes: [1], protectedAxes: ["droits"] },
        { tick: 2, activeLanes: [1], protectedAxes: axes }
      ]
    },
    {
      failedLane: 1,
      observations: [0, 1, 2].map((tick) => ({ tick, activeLanes: [0], protectedAxes: axes }))
    }
  ]
};

const result = assessTemporalFailover(semantics, axes, exercise);
assert.equal(result.status, "unestablished");
assert.deepEqual(result.failures, [{
  failedLane: 0,
  tick: 1,
  reason: "temporal_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: transient protection gap preserved");
