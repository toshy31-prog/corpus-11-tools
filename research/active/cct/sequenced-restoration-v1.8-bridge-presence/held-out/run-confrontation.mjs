import { assessBridgePresence } from "../runtime.mjs";

const bridge = { continuityLanes: [
  { controller: "rights-stewards", failureDomain: "rights-network" },
  { controller: "power-stewards", failureDomain: "power-network" }
] };
const declaredOnly = assessBridgePresence(bridge);
const exercised = assessBridgePresence(bridge, { reports: [
  { target: "lane:0", outcome: "reachable", witness: "observer-a" }, { target: "recourse:0", outcome: "reachable", witness: "observer-b" },
  { target: "lane:1", outcome: "reachable", witness: "observer-c" }, { target: "recourse:1", outcome: "reachable", witness: "observer-d" }
] });
console.log(JSON.stringify({ provenance: "internal_synthetic_adversarial", declaredOnly, exercised, reversalCondition: "A declaration alone must never classify as locally exercised." }, null, 2));
process.exitCode = declaredOnly === "declared_only" && exercised === "locally_exercised_candidate" ? 0 : 1;
