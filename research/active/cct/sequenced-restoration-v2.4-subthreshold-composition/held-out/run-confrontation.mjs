import assert from "node:assert/strict";
import { REQUIRED_DEPENDENCY_CLASSES } from "../../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { assessSubthresholdComposition } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const audit = { materialityThresholds: Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 10])) };
const exercise = {
  windowTicks: 1,
  classTrials: REQUIRED_DEPENDENCY_CLASSES.map((dependencyClass) => ({
    dependencyClass,
    components: [{ root: `${dependencyClass}-1`, impact: 6 }, { root: `${dependencyClass}-2`, impact: 6 }],
    aggregationOutcomes: [
      { mapId: "sum", controller: "team-a", sourceRoot: "model-a", aggregateImpact: 12 },
      { mapId: "interaction", controller: "team-b", sourceRoot: "model-b", aggregateImpact: 11 }
    ],
    observations: [0, 1].map((tick) => ({
      tick,
      protectedAxes: dependencyClass === "power" && tick === 1 ? ["droits"] : axes
    }))
  }))
};

const result = assessSubthresholdComposition(axes, audit, exercise);
assert.equal(result.status, "not_established");
assert.deepEqual(result.failures, [{
  dependencyClass: "power",
  tick: 1,
  reason: "composed_protection_gap",
  missingAxes: ["attribution_du_pouvoir"]
}]);
console.log("held-out confrontation: jointly material subthreshold roots expose a transient debt gap");
