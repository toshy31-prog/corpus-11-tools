import { readFileSync } from "node:fs";
import { assessDualChannelPathInventoryReconciliation } from "../sequenced-restoration-v10.25-dual-channel-path-inventory-reconciliation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessBlindedPathSentinelDetectability(args) {
  const prior = assessDualChannelPathInventoryReconciliation(args);
  if (prior.status !== "dual_channel_path_inventory_reconciliation_candidate") return prior;
  const trial = args.blindedPathSentinelTrial;
  const failures = [];
  const scannerRoots = new Set(args.executionPathDiscoveryReports.map((item) => item.scannerRootId));
  if (!trial || scannerRoots.has(trial.injectorRootId)) failures.push("sentinel_injector_not_independent");
  if ((trial?.sentinels?.length ?? 0) < SPEC.minimumSentinels || new Set(trial?.sentinels).size !== trial?.sentinels?.length) failures.push("sentinel_set_insufficient_or_duplicated");
  const latestScan = args.executionPathDiscoveryReports.map((item) => item.observedAt).sort().at(-1);
  if (!(trial?.injectedAt < latestScan && latestScan < trial?.revealedAt && trial?.revealedAt < args.executionPathInventory.frozenAt)) failures.push("sentinel_blinding_window_invalid");
  const expectedChannels = args.executionPathDiscoveryReports.map((item) => item.channel);
  if (JSON.stringify(trial?.channelDetections?.map((item) => item.channel)) !== JSON.stringify(expectedChannels)) failures.push("sentinel_detection_channel_mismatch");
  const detectionAudits = expectedChannels.map((channel) => {
    const report = trial?.channelDetections?.find((item) => item.channel === channel);
    const missedSentinels = (trial?.sentinels ?? []).filter((path) => !report?.detectedPaths.includes(path));
    return { channel, missedSentinels, allSentinelsDetected: missedSentinels.length === 0 };
  });
  if (detectionAudits.some((audit) => !audit.allSentinelsDetected)) failures.push("declared_channel_detectability_failed");
  if (failures.length) return { status: "not_established", failures, detectionAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "blinded_independent_injection_path_sentinels", detectionAudits, declaredChannelSentinelDetectabilityEstablished: true, unknownPathDetectabilityEstablished: false, absoluteInventoryExhaustivenessEstablished: false, notEstablished: SPEC.notEstablished };
}
