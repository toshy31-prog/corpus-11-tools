import assert from "node:assert/strict";
import test from "node:test";
import {
  captureDerivationDescriptor,
  compareDerivationRules,
  computeDerivationModelHash,
  enumerateDerivationDependence,
  executeDerivationDependence,
} from "../scientific/compatible-derivation-dependence.mjs";
import { verifyClosedCompatibleRun } from "./closed-compatible-fixture.mjs";

test("the derivation descriptor separates Corpus governance from research modules", async () => {
  const descriptor = await captureDerivationDescriptor();
  assert.deepEqual(descriptor.engine.files.map(({ id }) => id), [
    "corpus/governance/execution-closure.mjs",
    "corpus/governance/execution-lock.mjs",
    "corpus/governance/protocol-lock.mjs",
  ]);
  assert.deepEqual(descriptor.module.files.map(({ id }) => id), [
    "research/scientific/compatible-constraint-order.mjs",
    "research/scientific/compatible-derivation-dependence.mjs",
  ]);
});

test("empty and complete controls remain unordered under both rules", () => {
  for (const mask of [0, 63]) {
    const result = compareDerivationRules(4, mask);
    assert.equal(result.original.strictPairs, 0);
    assert.equal(result.variant.strictPairs, 0);
  }
});

test("small exhaustive comparison is representation invariant", () => {
  const result = enumerateDerivationDependence(4, [2, 0, 3, 1]);
  assert.equal(result.graphCount, 64);
  assert.equal(result.representationMismatches, 0);
  assert.equal(result.extremeControlMismatches, 0);
  assert.equal(result.exactPersistence + result.changed, 64);
});

test("closed derivation execution preserves archived science and uses Corpus closure", async () => {
  const result = await verifyClosedCompatibleRun({
    prospectiveDirectory: "compatible-derivation-dependence-001",
    sourceUrl: new URL("../scientific/compatible-derivation-dependence.mjs", import.meta.url),
    computeModelHash: computeDerivationModelHash,
    captureDescriptor: captureDerivationDescriptor,
    execute: executeDerivationDependence,
  });
  assert.equal(result.raw.observables.rule_changed_graphs, 22350);
  assert.equal(result.raw.observables.order_disappearance_graphs, 10380);
  assert.deepEqual(result.classification.outcomes, ["order_depends_on_derivation_rule"]);
});
