import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [policyPath, historyPath, maxAgeText] = process.argv.slice(2);
if (!maxAgeText) {
  process.stderr.write("usage: node assess-control-source-presence-current.mjs POLICY HISTORY MAX_AGE_MS\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const maxAgeMs = Number(maxAgeText);
if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1) throw new Error("invalid maximum age");
const policy = JSON.parse(readFileSync(policyPath, "utf8"));
const history = JSON.parse(readFileSync(historyPath, "utf8"));
const historyBody = { schema: history.schema, sourceRegistryDigest: history.sourceRegistryDigest, generation: history.generation, records: history.records };
const latest = history.records.at(-1);
const checks = {
  policySchema: policy.schema === "cct-registry-recovery-policy/v1",
  historyIntegrity: history.schema === "cct-control-source-presence-history/v1" && history.stateDigest === digest(JSON.stringify(historyBody)),
  registryBinding: history.sourceRegistryDigest === policy.sourcePresenceEvidence?.sourceRegistryDigest,
  hasReobservation: history.generation >= 2 && history.records.length === history.generation,
  current: Boolean(latest) && Date.now() - latest.verifiedAtMs <= maxAgeMs,
  fullHostScopeCount: Boolean(latest) && latest.hostScopeCount === policy.controlRegistry?.sourceRegistry?.sources?.length
};
const recoveryControlPresenceCurrent = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ recoveryControlPresenceCurrent, checks, generation: history.generation, lastVerifiedAtMs: latest?.verifiedAtMs ?? null, continuousPresenceEstablished: false })}\n`);
if (!recoveryControlPresenceCurrent) process.exitCode = 1;
