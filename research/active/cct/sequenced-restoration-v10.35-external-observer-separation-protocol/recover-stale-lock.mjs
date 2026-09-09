import { existsSync, readFileSync, unlinkSync } from "node:fs";

const lockPath = process.argv[2];
if (!lockPath) {
  process.stderr.write("usage: node recover-stale-lock.mjs LOCK_PATH\n");
  process.exit(2);
}
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const currentBootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
if (lock.schema !== "cct-process-lock/v1" || !Number.isSafeInteger(lock.pid) || !lock.startTicks || lock.bootId !== currentBootId) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "lock_ownership_not_safely_resolvable" })}\n`);
  process.exit(1);
}
const statPath = `/proc/${lock.pid}/stat`;
if (existsSync(statPath)) {
  const liveStartTicks = readFileSync(statPath, "utf8").trim().split(/\s+/)[21];
  if (liveStartTicks === lock.startTicks) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "lock_owner_still_live", pid: lock.pid })}\n`);
    process.exit(1);
  }
}
unlinkSync(lockPath);
process.stdout.write(`${JSON.stringify({ ok: true, recovered: "stale_lock", formerPid: lock.pid })}\n`);
