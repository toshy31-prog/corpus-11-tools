import test from "node:test";
import assert from "node:assert/strict";
import { QUALITY_WISH_CASES, evaluateProgramme, verifyWishCase } from "./quality.mjs";

test("exécute vingt envies de référence sans masquer les limites du parseur", () => {
  assert.equal(QUALITY_WISH_CASES.length, 20);
  const results = QUALITY_WISH_CASES.map((testCase) => verifyWishCase(testCase, 2026));
  assert.deepEqual(results.filter(({ passed }) => !passed), []);
});

test("audite le programme par invariants sans produire de score global", () => {
  const filters = { maxRuntime: 120, hideSeen: true, seen: [99] };
  const programme = [1, 2, 3, 4].map((id) => ({ id, runtime: 90, offerLink: `https://example.test/${id}` }));
  const checks = evaluateProgramme(programme, filters);
  assert.equal(checks.every(({ passed }) => passed), true);
  assert.equal("score" in checks, false);
});
