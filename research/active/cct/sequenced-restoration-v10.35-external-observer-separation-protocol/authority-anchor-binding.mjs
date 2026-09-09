import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function verifyAuthorityAnchorBinding(statusPath, checkpointPath, receiptPath, anchorStatePath, authorityPublicKeyPath, anchorPublicKeyPath) {
  const statusText = readFileSync(statusPath, "utf8");
  const status = JSON.parse(statusText);
  const checkpointText = readFileSync(checkpointPath, "utf8");
  const checkpoint = JSON.parse(checkpointText);
  const receiptText = readFileSync(receiptPath, "utf8");
  const receipt = JSON.parse(receiptText);
  const state = JSON.parse(readFileSync(anchorStatePath, "utf8"));
  const checkpointBody = { schema: checkpoint.schema, registryStateDigest: checkpoint.registryStateDigest, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, previousCheckpointDigest: checkpoint.previousCheckpointDigest };
  const receiptBody = { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
  const checks = {
    checkpointSchema: checkpoint.schema === "cct-authority-status-checkpoint/v1",
    checkpointSignature: verify(null, Buffer.from(JSON.stringify(checkpointBody)), createPublicKey(readFileSync(authorityPublicKeyPath)), Buffer.from(checkpoint.signatureBase64, "base64")),
    statusBinding: checkpoint.registryStateDigest === digest(statusText) && checkpoint.generation === status.generation && checkpoint.totalRecords === status.revokedCredentialDigests.length,
    receiptSignature: verify(null, Buffer.from(JSON.stringify(receiptBody)), createPublicKey(readFileSync(anchorPublicKeyPath)), Buffer.from(receipt.signatureBase64, "base64")),
    receiptBinding: receipt.schema === "cct-monotonic-anchor-receipt/v2" && receipt.checkpointSchema === checkpoint.schema && receipt.checkpointDigest === digest(checkpointText) && receipt.registryStateDigest === checkpoint.registryStateDigest && receipt.generation === checkpoint.generation && receipt.totalRecords === checkpoint.totalRecords,
    currentAnchorState: state.schema === "cct-monotonic-anchor-state/v2" && state.checkpointSchema === receipt.checkpointSchema && state.registryKeyDigest === receipt.registryKeyDigest && state.recoveryPolicyDigest === receipt.recoveryPolicyDigest && state.generation === receipt.generation && state.checkpointDigest === receipt.checkpointDigest && state.receiptDigest === digest(receiptText) && JSON.stringify(state.receipt) === JSON.stringify(receipt)
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}
