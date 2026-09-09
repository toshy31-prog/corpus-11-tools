import { readFileSync } from "node:fs";
import { selectEvidenceBridge } from "../runtime.mjs";

const campaign = JSON.parse(readFileSync(new URL("./confrontation-v1.json", import.meta.url)));
const axes = ["droits", "attribution_du_pouvoir"];
const actionOntology = {
  independent_bridge: {
    protectsAxes: axes,
    closesDebts: false,
    continuityLanes: [
      { controller: "rights-stewards", failureDomain: "rights-network", recourseRoute: "rights-appeal", protectsAxes: ["droits"] },
      { controller: "power-stewards", failureDomain: "power-network", recourseRoute: "power-appeal", protectsAxes: ["attribution_du_pouvoir"] }
    ]
  },
  centralized_bridge: {
    protectsAxes: axes,
    closesDebts: false,
    continuityLanes: [
      { controller: "central-office", failureDomain: "central-service", recourseRoute: "central-appeal", protectsAxes: ["droits"] },
      { controller: "central-office", failureDomain: "central-service", recourseRoute: "central-appeal", protectsAxes: ["attribution_du_pouvoir"] }
    ]
  }
};
const selected = selectEvidenceBridge(actionOntology, Object.keys(actionOntology), axes);
const report = {
  campaign: campaign.id,
  provenance: campaign.provenance,
  frozenBeforeExecution: campaign.freeze_before_execution,
  noScalarWinner: campaign.no_scalar_winner,
  results: [
    { contender: "cct-exec-1.7-evidence-bridge", selected, evidence_integrity: "preserved_pending_receipt", rights_continuity: "protected", power_continuity: "protected", centralization_risk: "bounded_by_distinct_lanes", debt_closure: "withheld" },
    { contender: "single-controller-continuity-acceptor", selected: "centralized_bridge", evidence_integrity: "preserved_pending_receipt", rights_continuity: "claimed", power_continuity: "claimed", centralization_risk: "unbounded", debt_closure: "unspecified" }
  ]
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = selected === "independent_bridge" ? 0 : 1;
