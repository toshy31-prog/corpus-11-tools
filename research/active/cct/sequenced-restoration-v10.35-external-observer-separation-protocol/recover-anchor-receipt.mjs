import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [statePath, anchorPublicKeyPath, receiptPath] = process.argv.slice(2);
if (!receiptPath) {
  process.stderr.write("usage: node recover-anchor-receipt.mjs ANCHOR_STATE ANCHOR_PUBLIC_KEY RECEIPT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const state = JSON.parse(readFileSync(statePath, "utf8"));
const receipt = state.receipt;
const body = receipt && { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
const receiptText = receipt && `${JSON.stringify(receipt)}\n`;
const checks = {
  stateSchema: state.schema === "cct-monotonic-anchor-state/v2",
  receiptSchema: receipt?.schema === "cct-monotonic-anchor-receipt/v2",
  authorityBinding: state.checkpointSchema === receipt?.checkpointSchema && state.registryKeyDigest === receipt?.registryKeyDigest && state.recoveryPolicyDigest === receipt?.recoveryPolicyDigest,
  generation: state.generation === receipt?.generation,
  checkpointDigest: state.checkpointDigest === receipt?.checkpointDigest,
  receiptDigest: state.receiptDigest === digest(receiptText ?? ""),
  signature: Boolean(receipt) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(readFileSync(anchorPublicKeyPath)), Buffer.from(receipt.signatureBase64, "base64")),
};
if (!Object.values(checks).every(Boolean)) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_state_integrity_invalid", checks })}\n`);
  process.exit(1);
}
atomicReplaceDurable(receiptPath, receiptText);
process.stdout.write(`${JSON.stringify({ ok: true, generation: state.generation, receiptDigest: state.receiptDigest })}\n`);
