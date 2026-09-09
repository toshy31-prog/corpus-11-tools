import { readFileSync } from "node:fs";
import { validateReceiptProvenance } from "../contract.mjs";

const spec = JSON.parse(readFileSync(new URL("../spec.json", import.meta.url)));
const campaign = JSON.parse(readFileSync(new URL("./confrontation-v1.json", import.meta.url)));
const attack = JSON.parse(readFileSync(new URL("./shared-origin-receipts.json", import.meta.url)));
const rejected = validateReceiptProvenance(spec, attack).includes("reused:sourceCollectionRoot:single-survey");
const report = {
  campaign: campaign.id,
  provenance: campaign.provenance,
  frozenBeforeExecution: campaign.freeze_before_execution,
  noScalarWinner: campaign.no_scalar_winner,
  results: [
    { contender: "cct-exec-1.5-provenance", evidence_integrity: rejected ? "preserved" : "breached", repair_debt_closure: rejected ? "withheld" : "closed" },
    { contender: "formal-receipt-acceptor", evidence_integrity: "breached", repair_debt_closure: "closed" }
  ],
  conclusion: rejected
    ? "CCT preserves the evidence fence but does not close the debt; the rival closes the debt by accepting shared-origin evidence. No scalar winner is declared."
    : "CCT accepted shared-origin evidence: the candidate must be revised."
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = rejected ? 0 : 1;
