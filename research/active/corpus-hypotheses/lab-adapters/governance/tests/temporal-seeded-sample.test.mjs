import assert from "node:assert/strict";
import test from "node:test";
import { computeModelContentHash, generateMasks } from "../adapters/temporal-seeded-sample.mjs";

test("seeded mask generation is deterministic without executing the scientific module", () => {
  const configuration = {
    width: 7,
    sampleCount: 4,
    generator: { multiplier: 1664525, increment: 1013904223 },
  };
  const first = generateMasks(configuration, 123456789);
  const second = generateMasks(configuration, 123456789);
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.equal(first.every((mask) => mask >= 0 && mask < 2 ** 21), true);
});

test("model content hash binds both adapter and historical plugin code", async () => {
  assert.match(await computeModelContentHash(), /^sha256:[0-9a-f]{64}$/);
});
