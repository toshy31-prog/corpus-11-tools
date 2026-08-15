import assert from "node:assert/strict";
import test from "node:test";
import { enumerateCompatibleOrders, maximalContexts, orderSignature } from "../scientific/compatible-constraint-order.mjs";

test("empty and complete compatibility graphs induce no strict implication", () => {
  assert.equal(orderSignature(4, 0).strictPairs, 0);
  assert.equal(orderSignature(4, 63).strictPairs, 0);
});

test("maximal contexts and derived order are exact on a four-vertex path", () => {
  const pathMask = (1 << 0) | (1 << 3) | (1 << 5);
  assert.deepEqual(maximalContexts(4, pathMask), [3, 6, 12]);
  assert.ok(orderSignature(4, pathMask).strictPairs > 0);
});

test("small exhaustive universe passes representation and extreme controls", () => {
  const result = enumerateCompatibleOrders(4, [2, 0, 3, 1]);
  assert.equal(result.graphCount, 64);
  assert.equal(result.representationMismatches, 0);
  assert.equal(result.extremeControlMismatches, 0);
});
