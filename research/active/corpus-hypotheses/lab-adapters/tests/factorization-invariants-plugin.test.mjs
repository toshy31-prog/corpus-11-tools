import assert from "node:assert/strict";
import test from "node:test";
import { createEngine } from "../../../../../corpus-11-tools/labs/experiment-lab/core/engine.mjs";
import { runControl } from "../../../../../corpus-11-tools/labs/experiment-lab/core/control-runner.mjs";
import { factorizationInvariantsPlugin as plugin } from "../plugins/factorization-invariants.mjs";

test("third module reproduces an exact higher-order remainder", () => {
  const result = runControl(plugin, "exhaustive_higher_order_remainder").result;
  assert.equal(result.catalogSize, 48);
  assert.equal(result.tripletsSearched, 17296);
  assert.equal(result.matchedKeysWithMultipleTripleDimensions, 1);
  assert.deepEqual(result.selected.indices, [[3, 5, 15], [3, 5, 17]]);
  assert.deepEqual(result.selected.lowerOrder, { marginal: [2, 2, 2], pairwise: [1, 1, 1] });
  assert.deepEqual(result.selected.tripleDimensions, [0, 1]);
});

test("basis and label presentation do not create the invariant", () => {
  const result = runControl(plugin, "representation_audit").result;
  assert.deepEqual(result.checks, {
    reorderingPreservesProfile: true,
    basisChangePreservesProfile: true,
    observationsDoNotMutateState: true,
  });
});

test("observer reports total fixed dimension without mutating matrices", () => {
  const engine = createEngine(plugin, { dimension: 3 });
  engine.operate("load_transports", { indices: [3, 5, 17] });
  const before = engine.snapshot().stateHash;
  assert.deepEqual(engine.observe("common_fixed_dimension"), { dimension: 1 });
  assert.equal(engine.snapshot().stateHash, before);
});

test("manifest explicitly compiles the scientific contract", () => {
  assert.match(plugin.manifest.system, /vector space/i);
  assert.ok(plugin.manifest.operationsDescription.length > 0);
  assert.ok(plugin.manifest.observablesDescription.length > 0);
  assert.ok(plugin.manifest.controlsDescription.length > 0);
  assert.ok(plugin.manifest.reversalConditions.length > 0);
  assert.match(plugin.manifest.conventions.arithmetic, /no floating tolerance/i);
});
