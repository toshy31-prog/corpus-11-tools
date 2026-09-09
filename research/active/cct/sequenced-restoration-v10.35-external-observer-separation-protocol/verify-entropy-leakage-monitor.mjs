import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [monitorRegistryPath, monitoringPlanPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node verify-entropy-leakage-monitor.mjs MONITOR_REGISTRY PLAN RECEIPTS\n"); process.exit(2); }
const monitors = new Map(JSON.parse(readFileSync(monitorRegistryPath, "utf8")).monitors.map(item => [item.monitorId, item]));
const plan = JSON.parse(readFileSync(monitoringPlanPath, "utf8"));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const planBody = { schema: plan.schema, commitmentDigests: plan.commitmentDigests, channelsCovered: plan.channelsCovered, campaignBeganAtTick: plan.campaignBeganAtTick, campaignEndedAtTick: plan.campaignEndedAtTick };
const computedPlanDigest = `sha256:${createHash("sha256").update(JSON.stringify(planBody)).digest("hex")}`;
const canonicalChannels = Array.isArray(plan.channelsCovered) && plan.channelsCovered.length > 0 && JSON.stringify(plan.channelsCovered) === JSON.stringify([...new Set(plan.channelsCovered)].sort());
const rows = receipts.map(receipt => {
  const monitor = monitors.get(receipt.monitorId);
  const body = { schema: receipt.schema, monitorId: receipt.monitorId, planDigest: receipt.planDigest, commitmentDigests: receipt.commitmentDigests, channelsCovered: receipt.channelsCovered, observedFromTick: receipt.observedFromTick, observedUntilTick: receipt.observedUntilTick, exposureMatched: receipt.exposureMatched, exposureEvidenceDigest: receipt.exposureEvidenceDigest };
  const structure = receipt.schema === "cct-entropy-leakage-monitor-receipt/v1" && JSON.stringify(receipt.commitmentDigests) === JSON.stringify(plan.commitmentDigests) && JSON.stringify(receipt.channelsCovered) === JSON.stringify(plan.channelsCovered) && receipt.observedFromTick <= plan.campaignBeganAtTick && receipt.observedUntilTick >= plan.campaignEndedAtTick && typeof receipt.exposureMatched === "boolean" && (receipt.exposureMatched ? /^sha256:[0-9a-f]{64}$/.test(receipt.exposureEvidenceDigest ?? "") : receipt.exposureEvidenceDigest === null);
  const valid = Boolean(monitor) && structure && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(monitor.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, monitor, valid };
});
const quorum = rows.length >= 2 && rows.every(row => row.valid) && new Set(rows.map(row => row.receipt.monitorId)).size >= 2 && new Set(rows.map(row => row.monitor?.controller)).size >= 2 && new Set(rows.map(row => row.monitor?.failureDomain)).size >= 2;
const leakageDetected = rows.some(row => row.valid && row.receipt.exposureMatched);
const planBound = plan.schema === "cct-entropy-leakage-monitoring-plan/v1" && canonicalChannels && plan.planDigest === computedPlanDigest && rows.every(row => row.receipt.planDigest === computedPlanDigest);
const ok = quorum && planBound && !leakageDetected;
process.stdout.write(`${JSON.stringify({ ok, quorum, planBound, leakageDetected, monitoredChannels: plan.channelsCovered, globalLeakageAbsenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
