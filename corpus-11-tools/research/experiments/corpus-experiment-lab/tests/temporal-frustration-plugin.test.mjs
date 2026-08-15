import assert from "node:assert/strict";
import test from "node:test";
import { runControl } from "../core/control-runner.mjs";
import { createEngine } from "../core/engine.mjs";
import { temporalFrustrationPlugin as plugin } from "../plugins/temporal-frustration.mjs";

test("second plugin reproduces the locally matched global remainder", () => {
  const result = runControl(plugin, "exhaustive_matched_local_remainder").result;
  assert.equal(result.totalTournaments, 32768);
  assert.equal(result.matchedKeysWithMultipleFrustrations, 5);
  assert.deepEqual(result.selected.masks, [8, 10]);
  assert.deepEqual(result.selected.minimumBackwardEdges, [1, 2]);
  assert.deepEqual(result.selected.fractions, ["1/15", "2/15"]);
});

test("F_T does not consume a supplied candidate or engine command order", () => {
  const engine = createEngine(plugin, { width: 6 });
  engine.operate("load_tournament", { mask: 8 });
  engine.operate("set_candidate_order", { order: [0, 1, 2, 3, 4, 5] });
  const candidate = engine.observe("candidate_order_score");
  const optimum = engine.observe("minimum_frustration");
  assert.ok(candidate.violations > optimum.minimumViolations);
  assert.equal(optimum.minimumViolations, 1);
  assert.equal(engine.snapshot().journal.filter((entry) => entry.kind === "observers").every((entry) => !entry.mutated), true);
});

test("renaming and global reversal preserve exact frustration", () => {
  const result = runControl(plugin, "representation_and_method_audit").result;
  assert.deepEqual(result.checks, {
    candidateDoesNotDefineMinimum: true,
    relabellingPreservesLocalSummary: true,
    relabellingPreservesMinimum: true,
    reversalPreservesMinimum: true,
  });
});

test("module declares why the engine execution order is not physical time", () => {
  assert.match(plugin.manifest.conventions.commandOrder, /provenance/i);
  assert.match(plugin.manifest.conventions.localInput, /without a preferred scalar order/i);
});
