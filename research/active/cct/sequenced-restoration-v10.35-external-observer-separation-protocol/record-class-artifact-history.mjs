import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, createPublicKey, verify } from "node:crypto";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [historyPath, observerRegistryPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node record-class-artifact-history.mjs HISTORY OBSERVER_REGISTRY RECEIPTS\n"); process.exit(2); }
const observers = new Map(JSON.parse(readFileSync(observerRegistryPath, "utf8")).observers.map(item => [item.observerId, item]));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const rows = receipts.map(receipt => {
  const observer = observers.get(receipt.observerId);
  const body = { schema: receipt.schema, observerId: receipt.observerId, newClassRegistryDigest: receipt.newClassRegistryDigest, campaign: receipt.campaign, observedClassIds: receipt.observedClassIds, observations: receipt.observations };
  return { receipt, observer, valid: Boolean(observer) && receipt.schema === "cct-prospective-class-observation-receipt/v1" && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(observer.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64")) };
});
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.observerId)).size >= 2 && new Set(rows.map(row => row.observer.controller)).size >= 2 && new Set(rows.map(row => row.observer.failureDomain)).size >= 2 && new Set(rows.map(row => JSON.stringify({ campaign: row.receipt.campaign, registry: row.receipt.newClassRegistryDigest, observations: row.receipt.observations }))).size === 1;
if (!quorum) { process.stderr.write(`${JSON.stringify({ ok: false, failure: "observation_quorum_invalid" })}\n`); process.exit(1); }
const sample = rows[0].receipt;
const records = sample.observations.flatMap(item => [{ artifactDigest: item.probeArtifactDigest, kind: "probe", classId: item.classId, campaign: sample.campaign }, { artifactDigest: item.observationArtifactDigest, kind: "observation", classId: item.classId, campaign: sample.campaign }]);
const lockPath = `${historyPath}.lock`;
let lock;
try { lock = openSync(lockPath, "wx", 0o600); writeFileSync(lock, `${JSON.stringify({ pid: process.pid })}\n`); }
catch { process.stderr.write(`${JSON.stringify({ ok: false, failure: "history_locked" })}\n`); process.exit(1); }
try {
  const historyExists = existsSync(historyPath);
  const history = historyExists ? JSON.parse(readFileSync(historyPath, "utf8")) : { schema: "cct-class-artifact-history/v1", generation: 0, records: [], stateDigest: null };
  const body = { schema: history.schema, generation: history.generation, records: history.records };
  const stateDigest = `sha256:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}`;
  if (historyExists && history.stateDigest !== stateDigest) { process.stderr.write(`${JSON.stringify({ ok: false, failure: "history_integrity_invalid" })}\n`); process.exitCode = 1; }
  else {
    const prior = new Set(history.records.map(item => item.artifactDigest));
    const reused = records.filter(item => prior.has(item.artifactDigest)).map(item => item.artifactDigest);
    if (new Set(records.map(item => item.artifactDigest)).size !== records.length) { process.stderr.write(`${JSON.stringify({ ok: false, failure: "same_campaign_artifact_reuse" })}\n`); process.exitCode = 1; }
    else if (reused.length) { process.stderr.write(`${JSON.stringify({ ok: false, failure: "prior_campaign_artifact_reuse", reused: [...new Set(reused)] })}\n`); process.exitCode = 1; }
    else { const nextBody = { schema: history.schema, generation: history.generation + 1, records: [...history.records, ...records] }; const next = { ...nextBody, stateDigest: `sha256:${createHash("sha256").update(JSON.stringify(nextBody)).digest("hex")}` }; atomicReplaceDurable(historyPath, `${JSON.stringify(next)}\n`); process.stdout.write(`${JSON.stringify({ ok: true, generation: next.generation, recordedArtifacts: records.length })}\n`); }
  }
} finally { closeSync(lock); unlinkSync(lockPath); }
