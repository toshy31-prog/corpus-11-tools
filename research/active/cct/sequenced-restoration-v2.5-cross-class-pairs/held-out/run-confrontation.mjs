import assert from "node:assert/strict";
import { REQUIRED_DEPENDENCY_CLASSES } from "../../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { assessCrossClassPairs, requiredClassPairs } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };
const exercise = {
  windowTicks: 1,
  pairTrials: requiredClassPairs().map((classes) => ({
    classes,
    components: classes.map((dependencyClass) => ({ dependencyClass, root: `${dependencyClass}-root`, impact: 5 })),
    sequences: [classes, [...classes].reverse()].map((order) => ({
      order,
      observations: [
        { tick: 0, appliedClasses: [order[0]], protectedAxes: axes },
        {
          tick: 1,
          appliedClasses: order,
          protectedAxes: order.join("->") === "power->network" ? ["droits"] : axes
        }
      ]
    }))
  }))
};

const result = assessCrossClassPairs(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  pair: "network+power",
  order: "power->network",
  tick: 1,
  reason: "cross_class_protection_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: reverse-order network/power interaction exposes a debt gap");
