import { readFileSync } from "node:fs";
import { assessFrozenExecutionPathCoverage } from "../sequenced-restoration-v10.24-frozen-execution-path-coverage/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessDualChannelPathInventoryReconciliation(args) {
  const prior = assessFrozenExecutionPathCoverage(args);
  if (prior.status !== "frozen_execution_path_coverage_candidate") return prior;
  const reports = args.executionPathDiscoveryReports ?? [];
  const failures = [];
  if (JSON.stringify(reports.map((item) => item.channel)) !== JSON.stringify(SPEC.requiredChannels)) failures.push("discovery_channel_set_mismatch");
  if (new Set(reports.map((item) => item.scannerRootId)).size !== reports.length) failures.push("discovery_channels_share_scanner_root");
  const inventory = args.executionPathInventory.paths;
  const channelAudits = reports.map((report) => {
    const missingFromInventory = report.discoveredPaths.filter((path) => !inventory.includes(path));
    const missingFromChannel = inventory.filter((path) => !report.discoveredPaths.includes(path));
    return { channel: report.channel, missingFromInventory, missingFromChannel, matches: missingFromInventory.length === 0 && missingFromChannel.length === 0 };
  });
  if (channelAudits.some((audit) => !audit.matches)) failures.push("execution_path_inventory_not_reconciled");
  if (reports.some((report) => !(report.observedAt < args.executionPathInventory.frozenAt))) failures.push("discovery_report_not_before_inventory_freeze");
  if (failures.length) return { status: "not_established", failures, channelAudits };
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "two_root_pre_freeze_path_reconciliation", channelAudits, inventoryReconciledAcrossDeclaredChannels: true, absoluteInventoryExhaustivenessEstablished: false, notEstablished: SPEC.notEstablished };
}
