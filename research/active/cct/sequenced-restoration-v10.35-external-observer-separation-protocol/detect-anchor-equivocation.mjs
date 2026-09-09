import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [leftPath, rightPath, anchorPublicKeyPath] = process.argv.slice(2);
if (!anchorPublicKeyPath) {
  process.stderr.write("usage: node detect-anchor-equivocation.mjs RECEIPT_A RECEIPT_B ANCHOR_PUBLIC_KEY\n");
  process.exit(2);
}
const key = createPublicKey(readFileSync(anchorPublicKeyPath));
const load = path => {
  const receipt = JSON.parse(readFileSync(path, "utf8"));
  const body = { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
  const signatureValid = receipt.schema === "cct-monotonic-anchor-receipt/v2" &&
    verify(null, Buffer.from(JSON.stringify(body)), key, Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, signatureValid };
};
const left = load(leftPath);
const right = load(rightPath);
const sameGeneration = left.receipt.generation === right.receipt.generation;
const divergentState = left.receipt.checkpointDigest !== right.receipt.checkpointDigest ||
  left.receipt.checkpointSchema !== right.receipt.checkpointSchema ||
  left.receipt.registryKeyDigest !== right.receipt.registryKeyDigest ||
  left.receipt.recoveryPolicyDigest !== right.receipt.recoveryPolicyDigest ||
  left.receipt.authorityTransitionDigest !== right.receipt.authorityTransitionDigest ||
  left.receipt.emergencyRatificationDigest !== right.receipt.emergencyRatificationDigest ||
  left.receipt.registryStateDigest !== right.receipt.registryStateDigest ||
  left.receipt.totalRecords !== right.receipt.totalRecords;
const equivocationEstablished = left.signatureValid && right.signatureValid && sameGeneration && divergentState;
const checks = { leftSignature: left.signatureValid, rightSignature: right.signatureValid, sameGeneration, divergentState };
process.stdout.write(`${JSON.stringify({ equivocationEstablished, checks, generation: sameGeneration ? left.receipt.generation : null })}\n`);
if (!left.signatureValid || !right.signatureValid) process.exitCode = 2;
else if (equivocationEstablished) process.exitCode = 1;
