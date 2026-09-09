import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateReceiptProvenance } from "./contract.mjs";
import { CctReceiptProvenanceRuntime } from "./runtime.mjs";

const spec = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const receipts = [
  { id: "r1", observerActor: "auditor-a", observerFailureDomain: "field-a", sourceArtifactId: "inspection-a", sourceHash: "sha256:a", sourceCollectionRoot: "visit-a", collectionLimit: "site visit only" },
  { id: "r2", observerActor: "auditor-b", observerFailureDomain: "field-b", sourceArtifactId: "inspection-b", sourceHash: "sha256:b", sourceCollectionRoot: "ledger-b", collectionLimit: "maintenance ledger only" }
];

test("separate evidence artifacts can support a provenance-complete receipt bundle", () => {
  assert.deepEqual(validateReceiptProvenance(spec, { actionActor: "operator", receipts }), []);
});

test("reused evidence cannot impersonate independent confirmation", () => {
  const forged = structuredClone(receipts);
  forged[1].sourceArtifactId = "inspection-a";
  forged[1].sourceHash = "sha256:a";
  forged[1].sourceCollectionRoot = "visit-a";
  forged[1].observerActor = "operator";
  assert.deepEqual(validateReceiptProvenance(spec, { actionActor: "operator", receipts: forged }).sort(), [
    "not_independent:receipt.1.observerActor",
    "reused:sourceArtifactId:inspection-a",
    "reused:sourceCollectionRoot:visit-a",
    "reused:sourceHash:sha256:a"
  ]);
});

function runtimeWithPendingGain() {
  const runtime = new CctReceiptProvenanceRuntime();
  runtime.state.pendingGain = { action: "acquire", enactedAt: 1, dueAt: 2, amount: 2, failureDomain: "gain-domain", actor: "operator", targetAxes: ["portabilite_effective"] };
  runtime.state.activeVerificationChannels = [
    { id: "c1", observerActor: "auditor-a", failureDomain: "field-a", targetAxes: ["portabilite_effective"] },
    { id: "c2", observerActor: "auditor-b", failureDomain: "field-b", targetAxes: ["portabilite_effective"] }
  ];
  return runtime;
}

function runtimeReceipt(id, channelId, base) {
  return { ...base, id, channelId, verdict: "confirmed", action: "acquire", enactedAt: 1, effectiveAt: 2, amount: 2, failureDomain: "gain-domain", actor: "operator", authorityTrace: "signed" };
}

test("the runtime withholds capacity verification when provenance is reused", () => {
  const runtime = runtimeWithPendingGain();
  const reused = [
    runtimeReceipt("r1", "c1", { ...receipts[0], observerFailureDomain: "field-a" }),
    runtimeReceipt("r2", "c2", { ...receipts[1], observerFailureDomain: "field-b", sourceArtifactId: "inspection-a", sourceHash: "sha256:a" })
  ];
  runtime.processReceipts({ tick: 2, verificationReceipts: reused, repairReceipts: [] });
  assert.equal(runtime.state.verifiedCapacityGains.length, 0);
  assert.ok(runtime.trace.some((entry) => entry.event === "receipt_provenance_rejected"));
});

test("the runtime leaves a repair debt open when its provenance bundle is reused", () => {
  const runtime = new CctReceiptProvenanceRuntime();
  runtime.state.debts = [{ id: "debt-rights", axis: "droits", deadline: 3, restorationAction: "repair", responsibleActor: "operator", recourseChannel: "appeal", status: "open" }];
  const bundle = structuredClone(receipts);
  bundle[1].sourceArtifactId = "inspection-a";
  bundle[1].sourceHash = "sha256:a";
  runtime.processReceipts({ tick: 2, capacityReceipts: [], verificationReceipts: [], repairReceipts: [{
    id: "repair-1", confirmed: true, debtId: "debt-rights", axis: "droits", capacityRestored: true, recourseOpen: true,
    nonRepetition: true, remainingLoss: [], action: "repair", actor: "operator", recourseChannel: "appeal", authorityTrace: "signed",
    observerActor: "repair-auditor", provenanceBundle: bundle
  }] });
  assert.equal(runtime.state.debts[0].status, "open");
  assert.ok(runtime.trace.some((entry) => entry.event === "repair_receipt_provenance_rejected"));
});
