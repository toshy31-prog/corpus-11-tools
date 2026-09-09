import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [observerRegistryPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node verify-leakage-transport-equivalence.mjs OBSERVER_REGISTRY RECEIPTS\n"); process.exit(2); }
const observers = new Map(JSON.parse(readFileSync(observerRegistryPath, "utf8")).observers.map(item => [item.observerId, item]));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const uniqueSequence = value => Array.isArray(value) && value.length > 0 && new Set(value).size === value.length;
const rows = receipts.map(receipt => {
  const observer = observers.get(receipt.observerId);
  const body = { schema: receipt.schema, observerId: receipt.observerId, pairCommitDigest: receipt.pairCommitDigest, labelsRevealedAtTick: receipt.labelsRevealedAtTick, campaignEndedAtTick: receipt.campaignEndedAtTick, canary: receipt.canary, shadowLeak: receipt.shadowLeak };
  const probeValid = probe => probe && uniqueSequence(probe.hopDigests) && uniqueSequence(probe.transformationDigests) && typeof probe.sizeClass === "string" && Number.isSafeInteger(probe.enteredAtTick) && Number.isSafeInteger(probe.observedAtTick) && probe.observedAtTick >= probe.enteredAtTick;
  const valid = Boolean(observer) && receipt.schema === "cct-leakage-transport-equivalence-receipt/v1" && receipt.labelsRevealedAtTick > receipt.campaignEndedAtTick && probeValid(receipt.canary) && probeValid(receipt.shadowLeak) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(observer.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, observer, valid };
});
const observation = receipt => ({ pairCommitDigest: receipt.pairCommitDigest, canary: receipt.canary, shadowLeak: receipt.shadowLeak });
const observersAgree = new Set(rows.map(row => JSON.stringify(observation(row.receipt)))).size === 1;
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.observerId)).size >= 2 && new Set(rows.map(row => row.observer?.controller)).size >= 2 && new Set(rows.map(row => row.observer?.failureDomain)).size >= 2;
const sample = rows[0]?.receipt;
const checks = sample ? {
  sameHops: JSON.stringify(sample.canary.hopDigests) === JSON.stringify(sample.shadowLeak.hopDigests),
  sameTransformations: JSON.stringify(sample.canary.transformationDigests) === JSON.stringify(sample.shadowLeak.transformationDigests),
  sameEndpoint: sample.canary.endpointDigest === sample.shadowLeak.endpointDigest,
  sameSizeClass: sample.canary.sizeClass === sample.shadowLeak.sizeClass,
  timingDeltaWithinOneTick: Math.abs((sample.canary.observedAtTick - sample.canary.enteredAtTick) - (sample.shadowLeak.observedAtTick - sample.shadowLeak.enteredAtTick)) <= 1,
} : {};
const transportEquivalent = quorum && observersAgree && Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok: transportEquivalent, quorum, observersAgree, checks, shadowProbeTransportEquivalent: transportEquivalent, realLeakageTransportEquivalent: false })}\n`);
if (!transportEquivalent) process.exitCode = 1;
