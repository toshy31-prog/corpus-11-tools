import { readFileSync } from "node:fs";
import { CctEvidenceHoldRuntime } from "../runtime.mjs";

const campaign = JSON.parse(readFileSync(new URL("./confrontation-v1.json", import.meta.url)));
const runtime = new CctEvidenceHoldRuntime();
runtime.state.phase = "staged_restoration_receipt_pending";
runtime.state.debts = [{ axis: "droits", status: "open" }, { axis: "attribution_du_pouvoir", status: "open" }];
const actions = { rights_only: { protectsAxes: ["droits"] }, power_only: { protectsAxes: ["attribution_du_pouvoir"] } };
let cctResult;
try {
  runtime.decide({ view: { cct: { tick: 4, actionOntology: actions } }, allowedActions: Object.keys(actions) });
  cctResult = "unexpectedly_selected_partial_action";
} catch (error) {
  cctResult = error.message;
}
const report = {
  campaign: campaign.id, provenance: campaign.provenance, frozenBeforeExecution: campaign.freeze_before_execution,
  noScalarWinner: campaign.no_scalar_winner,
  results: [
    { contender: "cct-exec-1.6-evidence-hold", evidence_integrity: "preserved", rights_continuity: "not_closed", power_continuity: "not_closed", failure: cctResult },
    { contender: "partial-closure-acceptor", evidence_integrity: "breached", rights_continuity: "closed", power_continuity: "exposed" }
  ]
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = cctResult === "CCT_EVIDENCE_HOLD_DEBT_PROTECTION_INFEASIBLE" ? 0 : 1;
