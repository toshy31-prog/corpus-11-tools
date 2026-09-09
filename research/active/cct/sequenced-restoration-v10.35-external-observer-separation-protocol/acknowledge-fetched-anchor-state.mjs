import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [challengePath, responsePath, statePath, transcriptPath, networkReadyPath, networkAttestationPath, networkObserverPublicKeyPath, sourcePublicKeyPath, mirrorId, controllerId, failureDomain, mirrorPrivateKeyPath, receiptPath] = process.argv.slice(2);
if (!receiptPath) {
  process.stderr.write("usage: node acknowledge-fetched-anchor-state.mjs CHALLENGE RESPONSE STATE TRANSCRIPT NETWORK_READY NETWORK_ATTESTATION NETWORK_OBSERVER_PUBLIC_KEY SOURCE_PUBLIC_KEY MIRROR_ID CONTROLLER_ID FAILURE_DOMAIN MIRROR_PRIVATE_KEY RECEIPT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const challenge = JSON.parse(readFileSync(challengePath, "utf8"));
const responseText = readFileSync(responsePath, "utf8");
const response = JSON.parse(responseText);
const stateText = readFileSync(statePath, "utf8");
const state = JSON.parse(stateText);
const transcriptText = readFileSync(transcriptPath, "utf8");
const transcript = JSON.parse(transcriptText);
const networkReadyText = readFileSync(networkReadyPath, "utf8");
const networkReady = JSON.parse(networkReadyText);
const networkAttestationText = readFileSync(networkAttestationPath, "utf8");
const networkAttestation = JSON.parse(networkAttestationText);
const networkBody = { schema: networkAttestation.schema, observerId: networkAttestation.observerId, observerPid: networkAttestation.observerPid, observerBootId: networkAttestation.observerBootId, hostComparisonContextDigest: networkAttestation.hostComparisonContextDigest, hostComparisonFreezeDigest: networkAttestation.hostComparisonFreezeDigest, hostScopeDigest: networkAttestation.hostScopeDigest, readyDigest: networkAttestation.readyDigest, clientPid: networkAttestation.clientPid, serverPid: networkAttestation.serverPid, clientSocketInode: networkAttestation.clientSocketInode, serverSocketInode: networkAttestation.serverSocketInode, localPort: networkAttestation.localPort, remotePort: networkAttestation.remotePort, observedAtMs: networkAttestation.observedAtMs };
const responseBody = {
  schema: response.schema, holderId: response.holderId, requesterId: response.requesterId,
  requesterPid: response.requesterPid, challengeDigest: response.challengeDigest,
  stateDigest: response.stateDigest, generation: response.generation,
  serverPid: response.serverPid, serverBootId: response.serverBootId, servedAtMs: response.servedAtMs
};
if (!verify(null, Buffer.from(JSON.stringify(responseBody)), createPublicKey(readFileSync(sourcePublicKeyPath)), Buffer.from(response.signatureBase64 ?? "", "base64")) ||
    response.challengeDigest !== digest(JSON.stringify({ schema: challenge.schema, requesterId: challenge.requesterId, requesterPid: challenge.requesterPid, requesterBootId: challenge.requesterBootId, nonce: challenge.nonce, issuedAtMs: challenge.issuedAtMs, expiresAtMs: challenge.expiresAtMs })) ||
    response.stateDigest !== digest(stateText) || response.generation !== state.generation ||
    transcript.schema !== "cct-anchor-tcp-transcript/v2" ||
    transcript.clientPid !== challenge.requesterPid || transcript.serverPid !== response.serverPid ||
    !verify(null, Buffer.from(JSON.stringify(networkBody)), createPublicKey(readFileSync(networkObserverPublicKeyPath)), Buffer.from(networkAttestation.signatureBase64 ?? "", "base64")) ||
    networkAttestation.readyDigest !== digest(networkReadyText) ||
    networkReady.clientPid !== transcript.clientPid || networkReady.serverPid !== transcript.serverPid ||
    networkReady.localPort !== transcript.localPort || networkReady.remotePort !== transcript.remotePort) {
  throw new Error("fetched anchor evidence invalid");
}
const body = {
  schema: "cct-anchor-mirror-receipt/v1", mirrorId, controllerId, failureDomain,
  sourceHolderId: response.holderId, anchorStateDigest: digest(stateText),
  sourceResponseDigest: digest(responseText), transportDigest: digest(transcriptText),
  networkAttestationDigest: digest(networkAttestationText), networkObserverId: networkAttestation.observerId,
  hostComparisonContextDigest: networkAttestation.hostComparisonContextDigest,
  hostComparisonFreezeDigest: networkAttestation.hostComparisonFreezeDigest,
  networkHostScopeDigest: networkAttestation.hostScopeDigest,
  localAddress: transcript.localAddress, localPort: transcript.localPort,
  remoteAddress: transcript.remoteAddress, remotePort: transcript.remotePort,
  generation: state.generation, receivedAtMs: Date.now()
};
const receipt = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(mirrorPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(receiptPath, `${JSON.stringify(receipt)}\n`);
