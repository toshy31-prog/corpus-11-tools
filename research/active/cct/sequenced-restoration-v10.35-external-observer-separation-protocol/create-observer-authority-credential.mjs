import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [observerId, controllerId, failureDomain, observerPublicKeyPath, issuerId, issuerPrivateKeyPath, validFromText, validUntilText, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node create-observer-authority-credential.mjs OBSERVER_ID CONTROLLER_ID FAILURE_DOMAIN OBSERVER_PUBLIC_KEY ISSUER_ID ISSUER_PRIVATE_KEY VALID_FROM_MS VALID_UNTIL_MS OUTPUT\n");
  process.exit(2);
}
const key = createPublicKey(readFileSync(observerPublicKeyPath));
const observerKeyDigest = `sha256:${createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex")}`;
const body = {
  schema: "cct-observer-authority-credential/v1", issuerId, observerId,
  observerKeyDigest, controllerId, failureDomain,
  validFromMs: Number(validFromText), validUntilMs: Number(validUntilText)
};
if (!Number.isSafeInteger(body.validFromMs) || !Number.isSafeInteger(body.validUntilMs) || body.validFromMs >= body.validUntilMs) {
  throw new Error("invalid credential validity window");
}
const credential = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(issuerPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(credential)}\n`);
