import assert from "node:assert/strict";
import test from "node:test";
import {
  captureCompatibleOrderDescriptor,
  computeCompatibleOrderModelHash,
  enumerateCompatibleOrders,
  executeCompatibleOrder,
  maximalContexts,
  orderSignature,
} from "../scientific/compatible-constraint-order.mjs";
import { verifyClosedCompatibleRun } from "./closed-compatible-fixture.mjs";

test("the execution descriptor resolves Corpus governance outside research", async () => {
  const descriptor = await captureCompatibleOrderDescriptor();
  assert.deepEqual(descriptor.engine.files.map(({ id }) => id), [
    "corpus/governance/execution-closure.mjs",
    "corpus/governance/execution-lock.mjs",
    "corpus/governance/protocol-lock.mjs",
  ]);
  assert.deepEqual(descriptor.module.files.map(({ id }) => id), [
    "research/scientific/compatible-constraint-order.mjs",
  ]);
});

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

test("closed compatible-order execution preserves archived science and uses Corpus closure", async () => {
  const result = await verifyClosedCompatibleRun({
    prospectiveDirectory: "compatible-constraint-order-001",
    sourceUrl: new URL("../scientific/compatible-constraint-order.mjs", import.meta.url),
    computeModelHash: computeCompatibleOrderModelHash,
    captureDescriptor: captureCompatibleOrderDescriptor,
    execute: executeCompatibleOrder,
  });
  assert.equal(result.raw.observables.nontrivial_order_graphs, 30668);
  assert.equal(result.raw.observables.discriminating_matched_classes, 8);
  assert.equal(result.classification.status, "not_triggered");
});
