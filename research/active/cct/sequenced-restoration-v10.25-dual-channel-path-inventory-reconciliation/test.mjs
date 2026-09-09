import test from "node:test";
import assert from "node:assert/strict";
import { assessDualChannelPathInventoryReconciliation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("reconciles the frozen inventory against two distinct discovery roots", () => {
  const result = assessDualChannelPathInventoryReconciliation(fullSetup());
  assert.equal(result.status, "dual_channel_path_inventory_reconciliation_candidate");
  assert.equal(result.inventoryReconciledAcrossDeclaredChannels, true);
  assert.equal(result.absoluteInventoryExhaustivenessEstablished, false);
});

test("a runtime-only maintenance path invalidates reconciliation", () => {
  const setup = fullSetup();
  setup.executionPathDiscoveryReports[1].discoveredPaths.push("maintenance");
  const result = assessDualChannelPathInventoryReconciliation(setup);
  assert.deepEqual(result.failures, ["execution_path_inventory_not_reconciled"]);
  assert.deepEqual(result.channelAudits[1].missingFromInventory, ["maintenance"]);
});

test("two reports from one scanner root are not independent discovery channels", () => {
  const setup = fullSetup();
  setup.executionPathDiscoveryReports[1].scannerRootId = setup.executionPathDiscoveryReports[0].scannerRootId;
  const result = assessDualChannelPathInventoryReconciliation(setup);
  assert.ok(result.failures.includes("discovery_channels_share_scanner_root"));
});
