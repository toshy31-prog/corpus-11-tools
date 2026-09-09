import assert from "node:assert/strict";
import { REQUIRED_DEPENDENCY_CLASSES } from "../../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { permutations } from "../../sequenced-restoration-v2.6-bounded-triples/runtime.mjs";
import { assessDualContextTriples, requiredDualTripleCovers } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };
const exercise = {
  windowTicks: 2,
  covers: requiredDualTripleCovers().map(({ coverId, triples }) => ({
    coverId,
    tripleTrials: triples.map((classes) => ({
      classes,
      components: classes.map((dependencyClass) => ({ dependencyClass, root: `${coverId}-${dependencyClass}`, impact: 5 })),
      sequences: permutations(classes).map((order) => ({
        order,
        observations: [0, 1, 2].map((tick) => ({
          tick,
          appliedClasses: order.slice(0, tick + 1),
          protectedAxes: coverId === "affine-b" && order.join("->") === "power->network->personnel" && tick === 2
            ? ["droits"]
            : axes
        }))
      }))
    }))
  }))
};

const result = assessDualContextTriples(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  coverId: "affine-b",
  triple: "network+power+personnel",
  order: "power->network->personnel",
  tick: 2,
  reason: "three_way_protection_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: the alternate third context exposes a previously invisible debt gap");
