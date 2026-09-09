import { createHash, createHmac, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [challengePath, sourceRegistryPath, sourceId, sourcePrivateKeyPath, hostComparisonSalt, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node attest-control-evidence-source-presence.mjs CHALLENGE SOURCE_REGISTRY SOURCE_ID SOURCE_PRIVATE_KEY HOST_COMPARISON_SALT OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const challengeText = readFileSync(challengePath, "utf8");
const challenge = JSON.parse(challengeText);
const registryText = readFileSync(sourceRegistryPath, "utf8");
const registry = JSON.parse(registryText);
const source = registry.sources?.find(value => value.sourceId === sourceId);
if (!source?.networkOperatorId || !source?.networkFailureDomain) throw new Error("source network identity absent from registry");
const now = Date.now();
if (challenge.schema !== "cct-control-source-presence-challenge/v1" || challenge.sourceRegistryDigest !== digest(registryText) ||
    challenge.hostComparisonContextDigest !== digest(hostComparisonSalt) || now > challenge.expiresAtMs) throw new Error("presence challenge invalid");
const body = {
  schema: "cct-control-source-presence-attestation/v1", sourceId, challengeDigest: digest(challengeText),
  sourceRegistryDigest: challenge.sourceRegistryDigest, hostComparisonContextDigest: challenge.hostComparisonContextDigest,
  hostScopeDigest: `hmac-sha256:${createHmac("sha256", hostComparisonSalt).update(readFileSync("/etc/machine-id", "utf8").trim()).digest("hex")}`,
  networkOperatorId: source.networkOperatorId, networkFailureDomain: source.networkFailureDomain,
  observedAtMs: now
};
const value = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(sourcePrivateKeyPath))).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(value)}\n`);
