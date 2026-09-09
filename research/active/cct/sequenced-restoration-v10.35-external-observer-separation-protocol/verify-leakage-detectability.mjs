import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [monitorRegistryPath, probePlanPath, receiptsPath] = process.argv.slice(2);
if (!receiptsPath) { process.stderr.write("usage: node verify-leakage-detectability.mjs MONITOR_REGISTRY PROBE_PLAN RECEIPTS\n"); process.exit(2); }
const monitors = new Map(JSON.parse(readFileSync(monitorRegistryPath, "utf8")).monitors.map(item => [item.monitorId, item]));
const plan = JSON.parse(readFileSync(probePlanPath, "utf8"));
const receipts = JSON.parse(readFileSync(receiptsPath, "utf8"));
const digest = value => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
const probesCanonical = Array.isArray(plan.probes) && plan.probes.length > 0 && new Set(plan.probes.map(item => item.channel)).size === plan.probes.length && JSON.stringify(plan.probes) === JSON.stringify([...plan.probes].sort((a, b) => a.channel.localeCompare(b.channel)));
const planBody = { schema: plan.schema, probes: plan.probes, maximumDetectionLatencyTicks: plan.maximumDetectionLatencyTicks, committedAtTick: plan.committedAtTick };
const planDigest = digest(planBody);
const rows = receipts.map(receipt => {
  const monitor = monitors.get(receipt.monitorId);
  const body = { schema: receipt.schema, receiptId: receipt.receiptId, monitorId: receipt.monitorId, planDigest: receipt.planDigest, detections: receipt.detections };
  const detectionsCanonical = Array.isArray(receipt.detections) && JSON.stringify(receipt.detections) === JSON.stringify([...receipt.detections].sort((a, b) => a.channel.localeCompare(b.channel)));
  const valid = Boolean(monitor) && receipt.schema === "cct-leakage-detectability-receipt/v1" && receipt.planDigest === planDigest && detectionsCanonical && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(monitor.publicKeyPem), Buffer.from(receipt.signatureBase64, "base64"));
  return { receipt, monitor, valid };
});
const channelAudits = (plan.probes ?? []).map(probe => {
  const detections = rows.flatMap(row => row.valid ? row.receipt.detections.filter(item => item.channel === probe.channel && item.canaryDigest === probe.canaryDigest && Number.isSafeInteger(item.detectedAtTick) && item.detectedAtTick >= probe.injectedAtTick && item.detectedAtTick - probe.injectedAtTick <= plan.maximumDetectionLatencyTicks).map(item => ({ ...item, monitorId: row.receipt.monitorId, controller: row.monitor.controller, failureDomain: row.monitor.failureDomain })) : []);
  const detectable = detections.length >= 2 && new Set(detections.map(item => item.monitorId)).size >= 2 && new Set(detections.map(item => item.controller)).size >= 2 && new Set(detections.map(item => item.failureDomain)).size >= 2;
  return { channel: probe.channel, detectable, detections: detections.length };
});
const ok = plan.schema === "cct-leakage-detectability-plan/v1" && probesCanonical && Number.isSafeInteger(plan.maximumDetectionLatencyTicks) && plan.maximumDetectionLatencyTicks >= 0 && rows.length >= 2 && rows.every(row => row.valid) && channelAudits.every(item => item.detectable);
process.stdout.write(`${JSON.stringify({ ok, planDigest, channelAudits, transportEquivalenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
