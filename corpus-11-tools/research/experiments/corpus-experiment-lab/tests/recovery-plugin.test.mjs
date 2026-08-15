import assert from "node:assert/strict";
import test from "node:test";
import { runControl } from "../core/control-runner.mjs";
import { createEngine } from "../core/engine.mjs";
import { recoveryErasurePlugin as plugin } from "../plugins/recovery-erasure.mjs";

test("localized and broadcast historical costs survive migration", () => {
  const result = runControl(plugin, "localized_vs_broadcast").result;
  assert.equal(result.allMatched, true);
  assert.deepEqual(result.cases.at(-1).broadcast, { recoveryCost: 1, erasureCost: 8 });
});

test("matched graph controls preserve depth and residual remainders", () => {
  const depth = runControl(plugin, "matched_erasure_depth").result;
  assert.deepEqual([depth.shallowDepth, depth.deepDepth], [2, 3]);
  const residual = runControl(plugin, "single_edge_robustness").result;
  assert.deepEqual(residual.treeA.residualProfile, [4, 2, 1, 1, 1]);
  assert.deepEqual(residual.treeB.residualProfile, [4, 3, 1, 1, 1]);
});

test("observer/adversary class and hidden conventions are explicit", () => {
  assert.ok(plugin.manifest.observer.allowedOperations.includes("inspect_any_terminal_subset"));
  assert.match(plugin.manifest.conventions.historicalRecoveryCost, /any terminal subset/i);
  assert.match(plugin.manifest.conventions.historicalWaveDepth, /already been reset/i);
});

test("interactive observation cannot mutate live state", () => {
  const engine = createEngine(plugin, { topology: "line", size: 4, readPort: 0 });
  engine.operate("write_bit");
  assert.equal(engine.observe("network_read").found, true);
  assert.equal(engine.snapshot().state.lastRead, null);
});

test("closed width-7 exhaustive control finds no two-edge remainder", () => {
  const result = runControl(plugin, "two_edge_no_remainder", { width: 7 }).result;
  assert.deepEqual(result, { width: 7, searched: 16807, total: 16807, pairFound: false });
});
