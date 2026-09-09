import { createHash, createHmac, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync, readdirSync, readlinkSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [readyPath, observerId, observerPrivateKeyPath, attestationPath, releasePath, hostComparisonSalt, freezePath, firstFreezerPublicKeyPath, secondFreezerPublicKeyPath] = process.argv.slice(2);
if (!secondFreezerPublicKeyPath) {
  process.stderr.write("usage: node attest-live-tcp-connection.mjs READY OBSERVER_ID OBSERVER_PRIVATE_KEY ATTESTATION RELEASE HOST_COMPARISON_SALT FREEZE FIRST_FREEZER_PUBLIC_KEY SECOND_FREEZER_PUBLIC_KEY\n");
  process.exit(2);
}
const readyText = readFileSync(readyPath, "utf8");
const ready = JSON.parse(readyText);
const freezeText = readFileSync(freezePath, "utf8");
const freeze = JSON.parse(freezeText);
const freezeBody = { schema: freeze.schema, campaignId: freeze.campaignId, freezerIds: freeze.freezerIds, freezerKeyDigests: freeze.freezerKeyDigests, contextDigest: freeze.contextDigest, frozenAtMs: freeze.frozenAtMs, validFromMs: freeze.validFromMs, validUntilMs: freeze.validUntilMs };
const now = Date.now();
const expectedContextDigest = `sha256:${createHash("sha256").update(hostComparisonSalt).digest("hex")}`;
const freezerKeys = [createPublicKey(readFileSync(firstFreezerPublicKeyPath)), createPublicKey(readFileSync(secondFreezerPublicKeyPath))];
const freezerKeyDigests = freezerKeys.map(key => `sha256:${createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex")}`);
const freezeSignaturesValid = freezerKeys.every((key, index) => verify(null, Buffer.from(JSON.stringify(freezeBody)), key, Buffer.from(freeze.signaturesBase64?.[index] ?? "", "base64")));
if (freeze.schema !== "cct-host-comparison-context-freeze/v2" || freeze.contextDigest !== expectedContextDigest || now < freeze.validFromMs || now > freeze.validUntilMs || freeze.freezerIds?.[0] === freeze.freezerIds?.[1] || freezerKeyDigests[0] === freezerKeyDigests[1] || JSON.stringify(freezerKeyDigests) !== JSON.stringify(freeze.freezerKeyDigests) || !freezeSignaturesValid) throw new Error("host comparison context freeze invalid");
const rows = readFileSync("/proc/net/tcp", "utf8").trim().split("\n").slice(1).map(line => {
  const fields = line.trim().split(/\s+/);
  const port = endpoint => Number.parseInt(endpoint.split(":")[1], 16);
  return { localPort: port(fields[1]), remotePort: port(fields[2]), state: fields[3], inode: fields[9] };
});
const client = rows.find(row => row.localPort === ready.localPort && row.remotePort === ready.remotePort && row.state === "01");
const server = rows.find(row => row.localPort === ready.remotePort && row.remotePort === ready.localPort && row.state === "01");
const owns = (pid, inode) => readdirSync(`/proc/${pid}/fd`).some(fd => {
  try { return readlinkSync(`/proc/${pid}/fd/${fd}`) === `socket:[${inode}]`; } catch { return false; }
});
if (!client || !server || !owns(ready.clientPid, client.inode) || !owns(ready.serverPid, server.inode)) {
  throw new Error("live TCP ownership not observed");
}
const body = {
  schema: "cct-live-tcp-kernel-attestation/v1", observerId, observerPid: process.pid,
  observerBootId: readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
  hostComparisonContextDigest: expectedContextDigest,
  hostComparisonFreezeDigest: `sha256:${createHash("sha256").update(freezeText).digest("hex")}`,
  hostScopeDigest: `hmac-sha256:${createHmac("sha256", hostComparisonSalt).update(readFileSync("/etc/machine-id", "utf8").trim()).digest("hex")}`,
  readyDigest: `sha256:${createHash("sha256").update(readyText).digest("hex")}`,
  clientPid: ready.clientPid, serverPid: ready.serverPid,
  clientSocketInode: client.inode, serverSocketInode: server.inode,
  localPort: ready.localPort, remotePort: ready.remotePort, observedAtMs: Date.now()
};
const attestation = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(observerPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(attestationPath, `${JSON.stringify(attestation)}\n`);
atomicReplaceDurable(releasePath, `${JSON.stringify({ schema: "cct-live-tcp-release/v1", attestationDigest: `sha256:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}` })}\n`);
