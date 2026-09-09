import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const hash = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const unique = values => new Set(values).size === values.length;

export function verifyCampaign(runDirs) {
  const rows = runDirs.map(dir => {
    const packet = JSON.parse(readFileSync(`${dir}/final.json`, "utf8"));
    const payload = JSON.stringify({ nonce: packet.nonce, receiptHash: packet.receiptHash, attemptHash: packet.attemptHash, componentPid: packet.componentPid, componentInstanceId: packet.componentInstanceId, observerPid: packet.observerPid, observerInstanceId: packet.observerInstanceId });
    const checks = {
      distinctPids: packet.componentPid !== packet.observerPid,
      distinctInstanceIds: packet.componentInstanceId !== packet.observerInstanceId,
      distinctKeys: !createPublicKey(packet.componentPublicKeyPem).export({ type: "spki", format: "der" }).equals(createPublicKey(packet.observerPublicKeyPem).export({ type: "spki", format: "der" })),
      receiptBound: packet.receiptHash === hash(readFileSync(`${dir}/receipt.json`, "utf8")),
      attemptBound: packet.attemptHash === hash(readFileSync(`${dir}/attempt.json`, "utf8")),
      componentSignature: verify(null, Buffer.from(payload), packet.componentPublicKeyPem, Buffer.from(packet.componentSignatureBase64, "base64")),
      observerSignature: verify(null, Buffer.from(payload), packet.observerPublicKeyPem, Buffer.from(packet.observerSignatureBase64, "base64")),
      packetHash: packet.packetHash === hash(payload),
    };
    return { packet, valid: Object.values(checks).every(Boolean) };
  });
  const campaignChecks = {
    allRunsValid: rows.every(row => row.valid),
    uniqueNonces: unique(rows.map(row => row.packet.nonce)),
    uniquePacketHashes: unique(rows.map(row => row.packet.packetHash)),
    uniqueComponentInstanceIds: unique(rows.map(row => row.packet.componentInstanceId)),
    uniqueObserverInstanceIds: unique(rows.map(row => row.packet.observerInstanceId)),
    uniqueLivePids: unique(rows.flatMap(row => [row.packet.componentPid, row.packet.observerPid])),
  };
  const ok = rows.length >= 2 && Object.values(campaignChecks).every(Boolean);
  return { ok, runs: rows.length, campaignChecks, pids: rows.map(row => [row.packet.componentPid, row.packet.observerPid]), packets: rows.map(row => row.packet) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = verifyCampaign(process.argv.slice(2));
  const { packets, ...publicResult } = result;
  process.stdout.write(`${JSON.stringify(publicResult)}\n`);
  if (!result.ok) process.exitCode = 1;
}
