import { CctSequencedRestorationRuntime } from "../sequenced-restoration-v1.4/runtime.mjs";
import { validateReceiptProvenance } from "./contract.mjs";
import { readFileSync } from "node:fs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export class CctReceiptProvenanceRuntime extends CctSequencedRestorationRuntime {
  processReceipts(cct) {
    const repairReceipts = (cct.repairReceipts ?? []).filter((receipt) => {
      const errors = validateReceiptProvenance(spec, { actionActor: receipt?.actor, receipts: receipt?.provenanceBundle });
      if (!errors.length) return true;
      this.trace.push({ tick: cct.tick, event: "repair_receipt_provenance_rejected", receiptId: receipt?.id, errors: [...errors].sort() });
      return false;
    });
    const safeCct = { ...cct, repairReceipts };
    const pending = this.state.pendingGain;
    if (!pending || cct.tick < pending.dueAt) return super.processReceipts(safeCct);
    const matching = (safeCct.verificationReceipts ?? []).filter((receipt) => receipt.action === pending.action
      && receipt.enactedAt === pending.enactedAt && receipt.effectiveAt === pending.dueAt);
    const errors = validateReceiptProvenance(spec, { actionActor: pending.actor, receipts: matching });
    if (!errors.length) return super.processReceipts(safeCct);
    this.trace.push({ tick: cct.tick, event: "receipt_provenance_rejected", errors: [...errors].sort() });
    return super.processReceipts({ ...safeCct, verificationReceipts: [] });
  }
}

export function createCctReceiptProvenanceContender({ predictionKeys = [] } = {}) {
  const runtime = new CctReceiptProvenanceRuntime();
  return {
    manifest: { id: "cct-exec-1.5-provenance-candidate", version: "1.5.0-candidate", title: "CCT receipt provenance candidate", family: "constitutional-receipt-provenance" },
    decide({ view, allowedActions, history }) { return runtime.decide({ view, allowedActions, history, predictionKeys }); },
    snapshot: () => runtime.snapshot(),
  };
}
