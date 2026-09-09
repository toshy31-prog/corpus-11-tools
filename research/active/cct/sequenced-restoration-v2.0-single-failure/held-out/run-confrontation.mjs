import { singleLaneFailureCoverage } from "../runtime.mjs";

const axes = ["droits", "attribution_du_pouvoir"];
const nominal = { continuityLanes: [{ protectsAxes: ["droits"] }, { protectsAxes: ["attribution_du_pouvoir"] }] };
const result = singleLaneFailureCoverage(nominal, axes);
console.log(JSON.stringify({ provenance: "internal_synthetic_adversarial", perturbation: "remove_each_lane_in_turn", nominalCoverage: axes, tolerant: result.tolerant, failures: result.failures, reversalCondition: "Revise 2.0 if a bridge is classified tolerant while one lane removal exposes an open debt axis." }, null, 2));
process.exitCode = result.tolerant === false && result.failures.length === 2 ? 0 : 1;
