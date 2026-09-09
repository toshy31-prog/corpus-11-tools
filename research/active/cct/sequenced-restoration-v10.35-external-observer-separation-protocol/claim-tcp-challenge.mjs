import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function claimTcpChallenge(registryPath, record) {
  const lockPath = `${registryPath}.lock`;
  let lock;
  try {
    lock = openSync(lockPath, "wx", 0o600);
    const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
    const startTicks = readFileSync("/proc/self/stat", "utf8").trim().split(/\s+/)[21];
    writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid, bootId, startTicks })}\n`);
  } catch (error) {
    throw new Error(`challenge registry unavailable: ${error.code}`);
  }
  try {
    let registry = { schema: "cct-tcp-challenge-registry/v1", generation: 0, records: [], stateDigest: null };
    if (existsSync(registryPath)) registry = JSON.parse(readFileSync(registryPath, "utf8"));
    const body = { schema: registry.schema, generation: registry.generation, records: registry.records };
    const initial = registry.generation === 0 && registry.records.length === 0 && registry.stateDigest === null;
    if (registry.schema !== "cct-tcp-challenge-registry/v1" || !Number.isSafeInteger(registry.generation) ||
        !Array.isArray(registry.records) || (!initial && registry.stateDigest !== digest(JSON.stringify(body)))) {
      throw new Error("challenge registry integrity invalid");
    }
    if (registry.records.some(previous => previous.nonce === record.nonce || previous.challengeDigest === record.challengeDigest)) {
      throw new Error("challenge replay detected");
    }
    const nextBody = { schema: registry.schema, generation: registry.generation + 1, records: [...registry.records, record] };
    atomicReplaceDurable(registryPath, `${JSON.stringify({ ...nextBody, stateDigest: digest(JSON.stringify(nextBody)) })}\n`);
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}
