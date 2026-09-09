import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [issuerId, issuerPrivateKeyPath, generationText, generatedAtText, validUntilText, outputPath, ...revokedCredentialPaths] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-authority-status.mjs ISSUER_ID ISSUER_PRIVATE_KEY GENERATION GENERATED_AT_MS VALID_UNTIL_MS OUTPUT [REVOKED_CREDENTIAL ...]\n");
  process.exit(2);
}
const credentialDigest = path => `sha256:${createHash("sha256").update(JSON.stringify(JSON.parse(readFileSync(path, "utf8")))).digest("hex")}`;
const body = {
  schema: "cct-observer-authority-status/v1", issuerId,
  generation: Number(generationText), generatedAtMs: Number(generatedAtText),
  validUntilMs: Number(validUntilText),
  revokedCredentialDigests: revokedCredentialPaths.map(credentialDigest).sort()
};
if (!Number.isSafeInteger(body.generation) || body.generation < 1 ||
    !Number.isSafeInteger(body.generatedAtMs) || !Number.isSafeInteger(body.validUntilMs) ||
    body.generatedAtMs >= body.validUntilMs) throw new Error("invalid authority status");
const status = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(issuerPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(status)}\n`);
