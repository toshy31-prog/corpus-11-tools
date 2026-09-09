import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [readyPath, attestationPath, observerPublicKeyPath] = process.argv.slice(2);
if (!observerPublicKeyPath) {
  process.stderr.write("usage: node verify-live-tcp-connection-attestation.mjs READY ATTESTATION OBSERVER_PUBLIC_KEY\n");
  process.exit(2);
}
const readyText = readFileSync(readyPath, "utf8");
const ready = JSON.parse(readyText);
const value = JSON.parse(readFileSync(attestationPath, "utf8"));
const body = { schema: value.schema, observerId: value.observerId, observerPid: value.observerPid, observerBootId: value.observerBootId, hostComparisonContextDigest: value.hostComparisonContextDigest, hostComparisonFreezeDigest: value.hostComparisonFreezeDigest, hostScopeDigest: value.hostScopeDigest, readyDigest: value.readyDigest, clientPid: value.clientPid, serverPid: value.serverPid, clientSocketInode: value.clientSocketInode, serverSocketInode: value.serverSocketInode, localPort: value.localPort, remotePort: value.remotePort, observedAtMs: value.observedAtMs };
const checks = {
  schema: value.schema === "cct-live-tcp-kernel-attestation/v1",
  signature: verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(readFileSync(observerPublicKeyPath)), Buffer.from(value.signatureBase64 ?? "", "base64")),
  scopedHostClaimPresent: typeof value.hostScopeDigest === "string" && value.hostScopeDigest.startsWith("hmac-sha256:"),
  hostComparisonContextPresent: typeof value.hostComparisonContextDigest === "string" && value.hostComparisonContextDigest.startsWith("sha256:"),
  hostComparisonFreezePresent: typeof value.hostComparisonFreezeDigest === "string" && value.hostComparisonFreezeDigest.startsWith("sha256:"),
  readyBinding: value.readyDigest === `sha256:${createHash("sha256").update(readyText).digest("hex")}` && value.clientPid === ready.clientPid && value.serverPid === ready.serverPid && value.localPort === ready.localPort && value.remotePort === ready.remotePort,
  externalObserverProcess: value.observerPid !== value.clientPid && value.observerPid !== value.serverPid,
  distinctSocketOwners: value.clientPid !== value.serverPid && value.clientSocketInode !== value.serverSocketInode
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, liveKernelTcpConnectionObservedBySigner: ok, remoteHostEstablished: false, observerIndependenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
