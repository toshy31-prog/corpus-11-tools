import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [historyPath, checkpointPath, checkpointPublicKeyPath, anchorStatePath, anchorPublicKeyPath] = process.argv.slice(2);
if (!anchorPublicKeyPath) { process.stderr.write("usage: node admit-artifact-history-state.mjs HISTORY CHECKPOINT CHECKPOINT_PUBLIC_KEY ANCHOR_STATE ANCHOR_PUBLIC_KEY\n"); process.exit(2); }
const digestText = text => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const digestObject = value => digestText(JSON.stringify(value));
const history = JSON.parse(readFileSync(historyPath, "utf8")), checkpointText = readFileSync(checkpointPath, "utf8"), checkpoint = JSON.parse(checkpointText), state = JSON.parse(readFileSync(anchorStatePath, "utf8")), receipt = state.receipt;
const historyBody = { schema: history.schema, generation: history.generation, records: history.records };
const checkpointBody = { schema: checkpoint.schema, registryStateDigest: checkpoint.registryStateDigest, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, previousCheckpointDigest: checkpoint.previousCheckpointDigest };
const receiptBody = receipt && { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
const receiptText = receipt && `${JSON.stringify(receipt)}\n`;
const checks = {
  historyIntegrity: history.schema === "cct-class-artifact-history/v1" && history.stateDigest === digestObject(historyBody),
  checkpointSchema: checkpoint.schema === "cct-class-artifact-history-checkpoint/v1",
  checkpointSignature: verify(null, Buffer.from(JSON.stringify(checkpointBody)), createPublicKey(readFileSync(checkpointPublicKeyPath)), Buffer.from(checkpoint.signatureBase64, "base64")),
  checkpointBindsHistory: checkpoint.registryStateDigest === history.stateDigest && checkpoint.generation === history.generation && checkpoint.totalRecords === history.records.length,
  anchorStateSchema: state.schema === "cct-monotonic-anchor-state/v2" && receipt?.schema === "cct-monotonic-anchor-receipt/v2",
  anchorReceiptSignature: Boolean(receipt) && verify(null, Buffer.from(JSON.stringify(receiptBody)), createPublicKey(readFileSync(anchorPublicKeyPath)), Buffer.from(receipt.signatureBase64, "base64")),
  anchorStateIntegrity: Boolean(receipt) && state.receiptDigest === digestText(receiptText) && state.generation === receipt.generation && state.checkpointSchema === receipt.checkpointSchema && state.registryKeyDigest === receipt.registryKeyDigest && state.recoveryPolicyDigest === receipt.recoveryPolicyDigest && state.checkpointDigest === receipt.checkpointDigest,
  anchorBindsCheckpoint: Boolean(receipt) && receipt.checkpointSchema === checkpoint.schema && receipt.checkpointDigest === digestText(checkpointText) && receipt.registryStateDigest === checkpoint.registryStateDigest && receipt.generation === checkpoint.generation && receipt.totalRecords === checkpoint.totalRecords,
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, generation: history.generation, trustedAnchorStateRequired: true })}\n`);
if (!ok) process.exitCode = 1;
