import { readFileSync } from "node:fs";
import { CctReceiptProvenanceRuntime } from "../sequenced-restoration-v1.5-provenance/runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function evidenceHoldEligible(semantics, openDebtAxes) {
  return openDebtAxes.every((axis) => semantics?.protectsAxes?.includes(axis));
}

export class CctEvidenceHoldRuntime extends CctReceiptProvenanceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const eligible = allowedActions.filter((id) => evidenceHoldEligible(view?.cct?.actionOntology?.[id], openDebtAxes));
    if (!eligible.length) this.terminal("CCT_EVIDENCE_HOLD_DEBT_PROTECTION_INFEASIBLE", view?.cct?.tick ?? -1, { openDebtAxes });
    return super.decide({ view, allowedActions: eligible, history, predictionKeys });
  }
}

export function validateEvidenceHoldSpec(candidate) {
  return candidate?.schema === spec.schema && candidate?.version === spec.version && typeof candidate?.rule === "string";
}
