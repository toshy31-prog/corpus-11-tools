import { createHash, createPublicKey, verify } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [sourceRegistryPath, evidencePath, historyPath] = process.argv.slice(2);
if (!historyPath) {
  process.stderr.write("usage: node record-control-source-presence-evidence.mjs SOURCE_REGISTRY PRESENCE_EVIDENCE HISTORY\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registryText = readFileSync(sourceRegistryPath, "utf8");
const registry = JSON.parse(registryText);
const evidenceText = readFileSync(evidencePath, "utf8");
const evidence = JSON.parse(evidenceText);
const challengeText = Buffer.from(evidence.challengeTextBase64 ?? "", "base64").toString("utf8");
const challenge = JSON.parse(challengeText);
const body = value => ({ schema: value.schema, sourceId: value.sourceId, challengeDigest: value.challengeDigest, sourceRegistryDigest: value.sourceRegistryDigest, hostComparisonContextDigest: value.hostComparisonContextDigest, hostScopeDigest: value.hostScopeDigest, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain, observedAtMs: value.observedAtMs });
const expectedIds = registry.sources.map(value => value.sourceId).sort();
const valid = evidence.schema === "cct-control-source-presence-evidence/v1" && evidence.sourceRegistryDigest === digest(registryText) &&
  evidence.verifiedAtMs >= challenge.issuedAtMs && evidence.verifiedAtMs <= challenge.expiresAtMs &&
  JSON.stringify(evidence.attestations.map(value => value.sourceId).sort()) === JSON.stringify(expectedIds) &&
  new Set(evidence.attestations.map(value => value.hostScopeDigest)).size === evidence.attestations.length &&
  evidence.attestations.every(value => {
    const source = registry.sources.find(candidate => candidate.sourceId === value.sourceId);
    return source && value.networkOperatorId === source.networkOperatorId && value.networkFailureDomain === source.networkFailureDomain && value.challengeDigest === digest(challengeText) && value.sourceRegistryDigest === challenge.sourceRegistryDigest &&
      value.observedAtMs >= challenge.issuedAtMs && value.observedAtMs <= challenge.expiresAtMs &&
      verify(null, Buffer.from(JSON.stringify(body(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
  });
if (!valid) throw new Error("source presence evidence invalid");
const lockPath = `${historyPath}.lock`;
let lock;
try {
  lock = openSync(lockPath, "wx", 0o600);
  writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid })}\n`);
  let history = { schema: "cct-control-source-presence-history/v1", sourceRegistryDigest: digest(registryText), generation: 0, records: [], stateDigest: null };
  if (existsSync(historyPath)) history = JSON.parse(readFileSync(historyPath, "utf8"));
  const currentBody = { schema: history.schema, sourceRegistryDigest: history.sourceRegistryDigest, generation: history.generation, records: history.records };
  const initial = history.generation === 0 && history.records.length === 0 && history.stateDigest === null;
  if (history.schema !== "cct-control-source-presence-history/v1" || history.sourceRegistryDigest !== digest(registryText) || (!initial && history.stateDigest !== digest(JSON.stringify(currentBody)))) throw new Error("presence history integrity invalid");
  if (history.records.some(value => value.evidenceDigest === digest(evidenceText) || value.challengeNonce === challenge.nonce)) throw new Error("presence evidence replayed");
  if (history.records.length && challenge.issuedAtMs <= history.records.at(-1).challengeIssuedAtMs) throw new Error("presence challenge not newer");
  const records = [...history.records, { evidenceDigest: digest(evidenceText), challengeNonce: challenge.nonce, challengeIssuedAtMs: challenge.issuedAtMs, verifiedAtMs: evidence.verifiedAtMs, hostScopeCount: evidence.hostScopeCount }];
  const nextBody = { schema: history.schema, sourceRegistryDigest: history.sourceRegistryDigest, generation: history.generation + 1, records };
  atomicReplaceDurable(historyPath, `${JSON.stringify({ ...nextBody, stateDigest: digest(JSON.stringify(nextBody)) })}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, generation: nextBody.generation, verifiedAtMs: evidence.verifiedAtMs })}\n`);
} finally {
  if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
}
