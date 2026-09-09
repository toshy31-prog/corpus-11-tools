import assert from "node:assert/strict";
import { assessDualChannelPathInventoryReconciliation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.executionPathDiscoveryReports[0].discoveredPaths = setup.executionPathDiscoveryReports[0].discoveredPaths.filter((path) => path !== "emergency");
const result = assessDualChannelPathInventoryReconciliation(setup);
assert.deepEqual(result.failures, ["execution_path_inventory_not_reconciled"]);
assert.deepEqual(result.channelAudits[0].missingFromChannel, ["emergency"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], divergentChannel: "configuration_graph" }));
