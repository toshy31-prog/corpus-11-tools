import { assessExerciseLineage, selectLineageQualifiedBridge } from "../runtime.mjs";
const bridge = { continuityLanes: [
  { controller: "rights-stewards", failureDomain: "rights-network" }, { controller: "power-stewards", failureDomain: "power-network" }
] };
const reports = ["lane:0", "recourse:0", "lane:1", "recourse:1"].map((target) => ({ target, outcome: "reachable", witness: "observer-a", witnessFailureDomain: "field-a", sourceRoot: "record-a" }));
const result = assessExerciseLineage(bridge, { reports });
const selected = selectLineageQualifiedBridge({ bridge: { ...bridge, protectsAxes: ["droits", "attribution_du_pouvoir"], closesDebts: false } }, ["bridge"], ["droits", "attribution_du_pouvoir"], { bridge: { reports } });
console.log(JSON.stringify({ provenance: "internal_synthetic_adversarial", repeatedArtifacts: 4, lineageVerdict: result, selected, reversalCondition: "Repeated reports sharing all lineage must neither be materially independent nor select a bridge." }, null, 2));
process.exitCode = result === "substantially_dependent" && selected === null ? 0 : 1;
