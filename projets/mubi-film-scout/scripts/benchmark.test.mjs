import test from "node:test";
import assert from "node:assert/strict";
import { runBenchmark } from "./benchmark.mjs";
test("792 compositions : contraintes, renouvellement et différences observables", () => {
  const result = runBenchmark();
  assert.equal(result.combinations, 792);
  assert.ok(result.uniqueProgrammes > 100);
  assert.equal(result.maxRenewed, 4);
  assert.ok(result.minRenewed >= 0); // A narrow intent pool may not have four unseen substitutes.
  assert.ok(new Set(Object.values(result.effectHeads)).size >= 5);
  assert.ok(Object.values(result.lensChanges).every((n) => n > 0), "Une lentille devenue inerte doit être réexaminée.");
});
