import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [observerRegistryPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node verify-assessment-safeguard-adaptation.mjs OBSERVER_REGISTRY RECEIPTS\n"); process.exit(2); }
const observers = new Map(JSON.parse(readFileSync(observerRegistryPath, "utf8")).observers.map(item => [item.observerId, item]));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const rows = receipts.map(receipt => {
  const observer = observers.get(receipt.observerId);
  const body = { schema: receipt.schema, observerId: receipt.observerId, assignmentCommitDigest: receipt.assignmentCommitDigest, assignmentSchedule: receipt.assignmentSchedule, announcedAssessments: receipt.announcedAssessments, announcedSafeguardFailures: receipt.announcedSafeguardFailures, blindedAssessments: receipt.blindedAssessments, blindedSafeguardFailures: receipt.blindedSafeguardFailures, campaignEndedAtTick: receipt.campaignEndedAtTick, assignmentRevealedAtTick: receipt.assignmentRevealedAtTick };
  const countsValid = [receipt.announcedAssessments, receipt.announcedSafeguardFailures, receipt.blindedAssessments, receipt.blindedSafeguardFailures].every(Number.isSafeInteger) && receipt.announcedAssessments > 0 && receipt.blindedAssessments > 0 && receipt.announcedSafeguardFailures >= 0 && receipt.blindedSafeguardFailures >= 0 && receipt.announcedSafeguardFailures <= receipt.announcedAssessments && receipt.blindedSafeguardFailures <= receipt.blindedAssessments;
  const valid = Boolean(observer) && receipt.schema === "cct-assessment-safeguard-adaptation-receipt/v1" && Array.isArray(receipt.assignmentSchedule) && receipt.assignmentCommitDigest === digest(receipt.assignmentSchedule) && receipt.assignmentRevealedAtTick > receipt.campaignEndedAtTick && countsValid && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(observer.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, observer, valid };
});
const sameObservation = new Set(rows.map(row => JSON.stringify({ assignmentCommitDigest: row.receipt.assignmentCommitDigest, assignmentSchedule: row.receipt.assignmentSchedule, announcedAssessments: row.receipt.announcedAssessments, announcedSafeguardFailures: row.receipt.announcedSafeguardFailures, blindedAssessments: row.receipt.blindedAssessments, blindedSafeguardFailures: row.receipt.blindedSafeguardFailures }))).size === 1;
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.observerId)).size >= 2 && new Set(rows.map(row => row.observer?.controller)).size >= 2 && new Set(rows.map(row => row.observer?.failureDomain)).size >= 2;
const sample = rows[0]?.receipt;
const announcedRate = sample ? sample.announcedSafeguardFailures / sample.announcedAssessments : null;
const blindedRate = sample ? sample.blindedSafeguardFailures / sample.blindedAssessments : null;
const adaptationDetected = quorum && sameObservation && (blindedRate > announcedRate || blindedRate > 0);
const ok = quorum && sameObservation && !adaptationDetected;
process.stdout.write(`${JSON.stringify({ ok, quorum, sameObservation, announcedFailureRate: announcedRate, blindedFailureRate: blindedRate, adaptationDetected })}\n`);
if (!ok) process.exitCode = 1;
