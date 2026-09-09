import test from "node:test";
import assert from "node:assert/strict";
import { assessFrozenExecutionPathCoverage } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("establishes blockage only for every path in the frozen inventory", () => {
  const result = assessFrozenExecutionPathCoverage(fullSetup());
  assert.equal(result.status, "frozen_execution_path_coverage_candidate");
  assert.equal(result.inventoriedPaths, 4);
  assert.equal(result.allInventoriedPathsBlocked, true);
  assert.equal(result.allPossiblePathsBlocked, false);
});

test("a missing emergency-path probe blocks coverage", () => {
  const setup = fullSetup();
  setup.executionPathProbes = setup.executionPathProbes.filter((probe) => probe.path !== "emergency");
  const result = assessFrozenExecutionPathCoverage(setup);
  assert.ok(result.failures.includes("execution_path_probe_set_mismatch"));
  assert.ok(result.failures.includes("inventoried_path_coverage_failed"));
});

test("adding a path after freeze invalidates the inventory hash", () => {
  const setup = fullSetup();
  setup.executionPathInventory.paths.push("maintenance");
  const result = assessFrozenExecutionPathCoverage(setup);
  assert.ok(result.failures.includes("execution_path_inventory_hash_mismatch"));
});
