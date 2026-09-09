import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [checkpointPath, registryPublicKeyPath, receiptPath, anchorPublicKeyPath] = process.argv.slice(2);
if (!anchorPublicKeyPath) {
  process.stderr.write("usage: node verify-anchor-receipt.mjs CHECKPOINT REGISTRY_PUBLIC_KEY RECEIPT ANCHOR_PUBLIC_KEY\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const checkpointText = readFileSync(checkpointPath, "utf8");
const checkpoint = JSON.parse(checkpointText);
const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
const registryKeyDigest = digest(createPublicKey(readFileSync(registryPublicKeyPath)).export({ type: "spki", format: "der" }));
const body = { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
const checks = {
  schema: receipt.schema === "cct-monotonic-anchor-receipt/v2",
  checkpointSchema: receipt.checkpointSchema === checkpoint.schema,
  registryKeyBinding: receipt.registryKeyDigest === registryKeyDigest,
  signature: verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(readFileSync(anchorPublicKeyPath)), Buffer.from(receipt.signatureBase64, "base64")),
  checkpointDigest: receipt.checkpointDigest === digest(checkpointText),
  registryStateDigest: receipt.registryStateDigest === checkpoint.registryStateDigest,
  generation: receipt.generation === checkpoint.generation,
  totalRecords: receipt.totalRecords === checkpoint.totalRecords,
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, generation: receipt.generation })}\n`);
if (!ok) process.exitCode = 1;
