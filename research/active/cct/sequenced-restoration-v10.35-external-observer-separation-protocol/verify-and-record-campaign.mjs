import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { verifyCampaign } from "./verify-separated-campaign.mjs";

const [registryPath, ...runDirs] = process.argv.slice(2);
if (!registryPath || runDirs.length < 2) {
  process.stderr.write("usage: node verify-and-record-campaign.mjs REGISTRY RUN_DIR RUN_DIR [...]\n");
  process.exit(2);
}

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const canonical = value => JSON.stringify(value);
const campaign = verifyCampaign(runDirs);
if (!campaign.ok) {
  const { packets: omitted, ...publicResult } = campaign;
  process.stdout.write(`${canonical(publicResult)}\n`);
  process.exit(1);
}
const packets = campaign.packets;
const records = packets.map(packet => ({
  nonce: packet.nonce,
  packetHash: packet.packetHash,
  componentInstanceId: packet.componentInstanceId,
  observerInstanceId: packet.observerInstanceId,
}));
const lockPath = `${registryPath}.lock`;
let lock;
try {
  lock = openSync(lockPath, "wx", 0o600);
  const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
  const startTicks = readFileSync("/proc/self/stat", "utf8").trim().split(/\s+/)[21];
  writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid, bootId, startTicks })}\n`);
} catch (error) {
  process.stderr.write(`${canonical({ ok: false, failure: "registry_locked", code: error.code })}\n`);
  process.exit(1);
}

try {
  let registry = { schema: "cct-persistent-replay-registry/v1", generation: 0, records: [], stateDigest: null };
  if (existsSync(registryPath)) {
    registry = JSON.parse(readFileSync(registryPath, "utf8"));
    const body = { schema: registry.schema, generation: registry.generation, records: registry.records };
    if (registry.schema !== "cct-persistent-replay-registry/v1" ||
        !Number.isSafeInteger(registry.generation) || registry.generation < 0 ||
        !Array.isArray(registry.records) || registry.stateDigest !== digest(canonical(body))) {
      process.stderr.write(`${canonical({ ok: false, failure: "registry_integrity_invalid" })}\n`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    const fields = ["nonce", "packetHash", "componentInstanceId", "observerInstanceId"];
    const conflicts = fields.flatMap(field => {
      const seen = new Set(registry.records.map(record => record[field]));
      return records.filter(record => seen.has(record[field])).map(record => ({ field, value: record[field] }));
    });
    if (conflicts.length) {
      process.stderr.write(`${canonical({ ok: false, failure: "historical_replay_detected", conflicts })}\n`);
      process.exitCode = 1;
    } else {
      const body = {
        schema: registry.schema,
        generation: registry.generation + 1,
        records: [...registry.records, ...records],
      };
      const next = { ...body, stateDigest: digest(canonical(body)) };
      atomicReplaceDurable(registryPath, `${canonical(next)}\n`);
      const { packets: omitted, ...publicCampaign } = campaign;
      process.stdout.write(`${canonical({ ok: true, campaign: publicCampaign, generation: next.generation, totalRecords: next.records.length, stateDigest: next.stateDigest })}\n`);
    }
  }
} finally {
  closeSync(lock);
  unlinkSync(lockPath);
}
