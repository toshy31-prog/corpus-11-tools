import assert from "node:assert/strict";
import test from "node:test";
import { compareDerivationRules, enumerateDerivationDependence } from "../scientific/compatible-derivation-dependence.mjs";

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
