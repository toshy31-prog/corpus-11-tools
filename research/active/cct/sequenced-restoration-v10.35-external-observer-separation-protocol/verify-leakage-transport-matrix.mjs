import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [classRegistryPath, observerRegistryPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node verify-leakage-transport-matrix.mjs CLASS_REGISTRY OBSERVER_REGISTRY RECEIPTS\n"); process.exit(2); }
const classes = JSON.parse(readFileSync(classRegistryPath, "utf8"));
const observers = new Map(JSON.parse(readFileSync(observerRegistryPath, "utf8")).observers.map(item => [item.observerId, item]));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const classBody = { schema: classes.schema, classes: classes.classes };
const classRegistryDigest = digest(classBody);
const expectedClassIds = classes.classes?.map(item => item.classId) ?? [];
const pairChecks = pair => ({
  sameHops: JSON.stringify(pair.canary.hopDigests) === JSON.stringify(pair.shadowLeak.hopDigests),
  sameTransformations: JSON.stringify(pair.canary.transformationDigests) === JSON.stringify(pair.shadowLeak.transformationDigests),
  sameEndpoint: pair.canary.endpointDigest === pair.shadowLeak.endpointDigest,
  sameSizeClass: pair.canary.sizeClass === pair.shadowLeak.sizeClass,
  timingDeltaWithinOneTick: Math.abs(pair.canary.latencyTicks - pair.shadowLeak.latencyTicks) <= 1,
});
const rows = receipts.map(receipt => {
  const observer = observers.get(receipt.observerId);
  const body = { schema: receipt.schema, observerId: receipt.observerId, classRegistryDigest: receipt.classRegistryDigest, campaignEndedAtTick: receipt.campaignEndedAtTick, labelsRevealedAtTick: receipt.labelsRevealedAtTick, pairs: receipt.pairs };
  const coverage = Array.isArray(receipt.pairs) && JSON.stringify(receipt.pairs.map(pair => pair.classId)) === JSON.stringify(expectedClassIds);
  const valid = Boolean(observer) && receipt.schema === "cct-leakage-transport-matrix-receipt/v1" && receipt.classRegistryDigest === classRegistryDigest && coverage && receipt.labelsRevealedAtTick > receipt.campaignEndedAtTick && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(observer.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, observer, valid };
});
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.observerId)).size >= 2 && new Set(rows.map(row => row.observer?.controller)).size >= 2 && new Set(rows.map(row => row.observer?.failureDomain)).size >= 2;
const observersAgree = new Set(rows.map(row => JSON.stringify(row.receipt.pairs))).size === 1;
const audits = (rows[0]?.receipt.pairs ?? []).map(pair => {
  const definition = classes.classes.find(item => item.classId === pair.classId);
  const checks = { classMatches: Boolean(definition) && pair.canary.sizeClass === definition.sizeClass && pair.canary.hopDigests.length === definition.hopCount && pair.canary.transformationDigests.length === definition.transformationCount, ...pairChecks(pair) };
  return { classId: pair.classId, checks, equivalent: Object.values(checks).every(Boolean) };
});
const ok = classes.schema === "cct-leakage-probe-class-registry/v1" && new Set(expectedClassIds).size === expectedClassIds.length && expectedClassIds.length >= 3 && quorum && observersAgree && audits.every(item => item.equivalent);
process.stdout.write(`${JSON.stringify({ ok, classRegistryDigest, exactClassCoverage: audits.length === expectedClassIds.length, quorum, observersAgree, audits, universalTransportEquivalenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
