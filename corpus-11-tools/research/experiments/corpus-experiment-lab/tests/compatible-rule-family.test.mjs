import assert from "node:assert/strict";
import test from "node:test";
import { RULE_FAMILY, enumerateRuleFamily, evaluateRuleFamily } from "../scientific/compatible-rule-family.mjs";

test("simplicity selects all-maximal without results", () => {
  const selected = [...RULE_FAMILY].sort((a, b) => a.primitiveCount - b.primitiveCount || a.id.localeCompare(b.id))[0];
  assert.equal(selected.id, "all_maximal");
});

test("random controls match selected context counts", () => {
  let state = 5;
  const random = () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0);
  const result = evaluateRuleFamily(4, 21, random);
  assert.deepEqual(result.deterministic.map(({ count }) => count), result.controls.map(({ count }) => count));
  assert.equal(result.randomMatchingMismatches, 0);
});

test("small family universe passes controls", () => {
  const result = enumerateRuleFamily(4, [2, 0, 3, 1], 11);
  assert.equal(result.graphCount, 64);
  assert.equal(result.representationMismatches, 0);
  assert.equal(result.randomMatchingMismatches, 0);
  assert.equal(result.extremeControlMismatches, 0);
});
