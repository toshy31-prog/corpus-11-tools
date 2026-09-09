import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [statePath, challengePath, responsePath, holderRegistryPath] = process.argv.slice(2);
if (!holderRegistryPath) { process.stderr.write("usage: node verify-remote-anchor-fetch.mjs STATE CHALLENGE RESPONSE HOLDER_REGISTRY\n"); process.exit(2); }
const stateText = readFileSync(statePath, "utf8"), state = JSON.parse(stateText), challenge = JSON.parse(readFileSync(challengePath, "utf8")), response = JSON.parse(readFileSync(responsePath, "utf8"));
const holders = new Map(JSON.parse(readFileSync(holderRegistryPath, "utf8")).holders.map(item => [item.holderId, item])), holder = holders.get(response.holderId);
const body = { schema: response.schema, holderId: response.holderId, challengeNonce: response.challengeNonce, stateDigest: response.stateDigest, generation: response.generation, servedAtMs: response.servedAtMs };
const checks = {
  schema: response.schema === "cct-remote-anchor-state-response/v1",
  holderRegistered: Boolean(holder),
  holderSeparated: Boolean(holder) && holder.controller !== challenge.requesterController && holder.failureDomain !== challenge.requesterFailureDomain,
  signature: Boolean(holder) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(holder.publicKeyPem), Buffer.from(response.signatureBase64, "base64")),
  nonceFresh: response.challengeNonce === challenge.nonce,
  stateBound: response.stateDigest === `sha256:${createHash("sha256").update(stateText).digest("hex")}` && response.generation === state.generation,
  generationCurrentEnough: state.generation >= challenge.minimumGeneration,
  responseWindow: Number.isSafeInteger(response.servedAtMs) && response.servedAtMs >= challenge.issuedAtMs && response.servedAtMs <= challenge.expiresAtMs,
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, holderId: response.holderId, generation: response.generation, remoteHostingEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
