import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [challengePath, responsePath, statePath, transcriptPath, holderPublicKeyPath, requesterPublicKeyPath] = process.argv.slice(2);
if (!requesterPublicKeyPath) {
  process.stderr.write("usage: node verify-anchor-tcp-fetch.mjs CHALLENGE RESPONSE STATE TRANSCRIPT HOLDER_PUBLIC_KEY REQUESTER_PUBLIC_KEY\n");
  process.exit(2);
}
const challenge = JSON.parse(readFileSync(challengePath, "utf8"));
const response = JSON.parse(readFileSync(responsePath, "utf8"));
const stateText = readFileSync(statePath, "utf8");
const state = JSON.parse(stateText);
const transcript = JSON.parse(readFileSync(transcriptPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const challengeBody = {
  schema: challenge.schema, requesterId: challenge.requesterId,
  requesterPid: challenge.requesterPid, requesterBootId: challenge.requesterBootId,
  nonce: challenge.nonce, issuedAtMs: challenge.issuedAtMs, expiresAtMs: challenge.expiresAtMs
};
const responseBody = {
  schema: response.schema, holderId: response.holderId,
  requesterId: response.requesterId, requesterPid: response.requesterPid,
  challengeDigest: response.challengeDigest, stateDigest: response.stateDigest,
  generation: response.generation, serverPid: response.serverPid,
  serverBootId: response.serverBootId, servedAtMs: response.servedAtMs
};
const checks = {
  schemas: challenge.schema === "cct-anchor-state-tcp-challenge/v2" && response.schema === "cct-anchor-state-tcp-response/v2" && transcript.schema === "cct-anchor-tcp-transcript/v2",
  requesterSignature: verify(null, Buffer.from(JSON.stringify(challengeBody)), createPublicKey(readFileSync(requesterPublicKeyPath)), Buffer.from(challenge.signatureBase64, "base64")),
  holderSignature: verify(null, Buffer.from(JSON.stringify(responseBody)), createPublicKey(readFileSync(holderPublicKeyPath)), Buffer.from(response.signatureBase64, "base64")),
  challengeBound: response.challengeDigest === digest(JSON.stringify(challengeBody)) && response.requesterId === challenge.requesterId && response.requesterPid === challenge.requesterPid,
  stateBound: response.stateDigest === digest(stateText) && response.generation === state.generation,
  window: response.servedAtMs >= challenge.issuedAtMs && response.servedAtMs <= challenge.expiresAtMs,
  transcriptConsistent: transcript.clientPid === challenge.requesterPid && transcript.serverPid === response.serverPid,
  distinctSignedPidClaims: challenge.requesterPid !== response.serverPid,
  tcpLoopbackObserved: transcript.localAddress === "127.0.0.1" && transcript.remoteAddress === "127.0.0.1"
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, mutualKeyAuthentication: checks.requesterSignature && checks.holderSignature && checks.challengeBound, distinctProcessesEstablished: false, distinctHostEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
