import assert from "node:assert/strict";
import { REQUIRED_DEPENDENCY_CLASSES } from "../../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { assessBoundedTriples, permutations, requiredTripleCover } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };
const exercise = {
  windowTicks: 2,
  tripleTrials: requiredTripleCover().map((classes) => ({
    classes,
    components: classes.map((dependencyClass) => ({ dependencyClass, root: `${dependencyClass}-root`, impact: 5 })),
    sequences: permutations(classes).map((order) => ({
      order,
      observations: [0, 1, 2].map((tick) => ({
        tick,
        appliedClasses: order.slice(0, tick + 1),
        protectedAxes: order.join("->") === "power->network->finance" && tick === 2 ? ["droits"] : axes
      }))
    }))
  }))
};

const result = assessBoundedTriples(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  triple: "network+power+finance",
  order: "power->network->finance",
  tick: 2,
  reason: "three_way_protection_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: the third dependency exposes a gap absent from both prefixes");
