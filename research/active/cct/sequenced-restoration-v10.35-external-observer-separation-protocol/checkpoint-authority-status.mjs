import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [statusPath, authorityPrivateKeyPath, previousCheckpointPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node checkpoint-authority-status.mjs STATUS AUTHORITY_PRIVATE_KEY PREVIOUS_CHECKPOINT_OR_DASH OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const statusText = readFileSync(statusPath, "utf8");
const status = JSON.parse(statusText);
const statusBody = {
  schema: status.schema, issuerId: status.issuerId, generation: status.generation,
  generatedAtMs: status.generatedAtMs, validUntilMs: status.validUntilMs,
  revokedCredentialDigests: status.revokedCredentialDigests
};
const privateKey = createPrivateKey(readFileSync(authorityPrivateKeyPath));
if (status.schema !== "cct-observer-authority-status/v1" ||
    !verify(null, Buffer.from(JSON.stringify(statusBody)), createPublicKey(privateKey), Buffer.from(status.signatureBase64, "base64"))) {
  throw new Error("authority status signature invalid");
}
const previousCheckpointDigest = previousCheckpointPath === "-" ? null : digest(readFileSync(previousCheckpointPath, "utf8"));
const body = {
  schema: "cct-authority-status-checkpoint/v1",
  registryStateDigest: digest(statusText),
  generation: status.generation,
  totalRecords: status.revokedCredentialDigests.length,
  previousCheckpointDigest
};
const checkpoint = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), privateKey).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(checkpoint)}\n`);
