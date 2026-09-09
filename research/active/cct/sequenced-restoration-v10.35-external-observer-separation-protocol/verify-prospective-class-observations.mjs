import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [oldClassesPath, newClassesPath, observerRegistryPath, receiptsPath, effectiveFromText] = process.argv.slice(2);
if (!effectiveFromText) { process.stderr.write("usage: node verify-prospective-class-observations.mjs OLD_CLASSES NEW_CLASSES OBSERVER_REGISTRY RECEIPTS EFFECTIVE_FROM_CAMPAIGN\n"); process.exit(2); }
const oldClasses = JSON.parse(readFileSync(oldClassesPath, "utf8")), newClasses = JSON.parse(readFileSync(newClassesPath, "utf8"));
const observers = new Map(JSON.parse(readFileSync(observerRegistryPath, "utf8")).observers.map(item => [item.observerId, item]));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8")), effectiveFromCampaign = Number(effectiveFromText);
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const oldIds = new Set(oldClasses.classes.map(item => item.classId));
const addedClassIds = newClasses.classes.filter(item => !oldIds.has(item.classId)).map(item => item.classId);
const rows = receipts.map(receipt => {
  const observer = observers.get(receipt.observerId);
  const body = { schema: receipt.schema, observerId: receipt.observerId, newClassRegistryDigest: receipt.newClassRegistryDigest, campaign: receipt.campaign, observedClassIds: receipt.observedClassIds, observations: receipt.observations };
  const valid = Boolean(observer) && receipt.schema === "cct-prospective-class-observation-receipt/v1" && receipt.newClassRegistryDigest === digest(newClasses) && Number.isSafeInteger(receipt.campaign) && receipt.campaign >= effectiveFromCampaign && JSON.stringify(receipt.observedClassIds) === JSON.stringify(addedClassIds) && Array.isArray(receipt.observations) && JSON.stringify(receipt.observations.map(item => item.classId)) === JSON.stringify(addedClassIds) && receipt.observations.every(item => /^sha256:[0-9a-f]{64}$/.test(item.probeArtifactDigest ?? "") && /^sha256:[0-9a-f]{64}$/.test(item.observationArtifactDigest ?? "") && item.sameHops === true && item.sameTransformations === true && item.sameEndpoint === true && item.sameSizeClass === true && item.timingDeltaWithinOneTick === true) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(observer.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, observer, valid };
});
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.observerId)).size >= 2 && new Set(rows.map(row => row.observer?.controller)).size >= 2 && new Set(rows.map(row => row.observer?.failureDomain)).size >= 2;
const observersAgree = new Set(rows.map(row => JSON.stringify({ campaign: row.receipt.campaign, observedClassIds: row.receipt.observedClassIds, observations: row.receipt.observations }))).size === 1;
const artifactsFreshWithinBatch = rows[0] ? new Set(rows[0].receipt.observations.flatMap(item => [item.probeArtifactDigest, item.observationArtifactDigest])).size === addedClassIds.length * 2 : false;
const ok = addedClassIds.length > 0 && Number.isSafeInteger(effectiveFromCampaign) && quorum && observersAgree && artifactsFreshWithinBatch;
process.stdout.write(`${JSON.stringify({ ok, effectiveFromCampaign, addedClassIds, quorum, observersAgree, artifactsFreshWithinBatch, sameBatchArtifactReuseExcluded: artifactsFreshWithinBatch, priorCampaignArtifactReuseExcluded: false })}\n`);
if (!ok) process.exitCode = 1;
