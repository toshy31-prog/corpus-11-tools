// SYNTHETIC CONTRACT FIXTURES. Grades are invented to test arithmetic only.
// They are not human judgments and establish no recommendation quality.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRanking } from "../scripts/offline-ranking-metrics.mjs";

const fixture = () => ({ rankedIds: ["a", "b", "c"], eligibleIds: ["a", "b", "c"], judgments: { a: 3, b: 1, c: 0 }, k: 2 });

test("ideal graded ranking has nDCG 1 and complete recall", () => {
  const result = evaluateRanking(fixture());
  assert.equal(result.ndcgAtK, 1);
  assert.equal(result.recallAtK, 1);
  assert.equal(result.catalogExposureAtK, 2 / 3);
});

test("wrong rank and cutoff have hand-computable graded gain and recall", () => {
  const result = evaluateRanking({ ...fixture(), rankedIds: ["c", "a", "b"] });
  assert.ok(Math.abs(result.ndcgAtK - (7 / Math.log2(3)) / (7 + 1 / Math.log2(3))) < 1e-12);
  assert.equal(result.recallAtK, 0.5);
});

test("missing labels are unknown, not irrelevant", () => {
  const result = evaluateRanking({ ...fixture(), judgments: { a: 3 } });
  assert.equal(result.ndcgAtK, null);
  assert.equal(result.recallAtK, null);
  assert.equal(result.judgmentCoverage, 1 / 3);
  assert.equal(result.topJudgmentCoverage, 0.5);
});

test("abstention is visible and scores zero only when relevant items exist", () => {
  const result = evaluateRanking({ ...fixture(), rankedIds: [] });
  assert.equal(result.abstained, true);
  assert.equal(result.ndcgAtK, 0);
  assert.equal(result.recallAtK, 0);
  assert.equal(result.topJudgmentCoverage, null);
  const none = evaluateRanking({ ...fixture(), judgments: { a: 0, b: 0, c: 0 } });
  assert.equal(none.ndcgAtK, null);
  assert.equal(none.recallAtK, null);
});

test("duplicate ranking IDs and out-of-catalogue items are rejected", () => {
  assert.throws(() => evaluateRanking({ ...fixture(), rankedIds: ["a", "a"] }), /distinct/);
  assert.throws(() => evaluateRanking({ ...fixture(), rankedIds: ["external"] }), /outside/);
  assert.throws(() => evaluateRanking({ ...fixture(), eligibleIds: ["a", "a"] }), /distinct/);
});

test("invalid cutoffs and labels cannot yield plausible metrics", () => {
  for (const k of [0, -1, 1.5, Infinity, NaN]) assert.throws(() => evaluateRanking({ ...fixture(), k }));
  for (const grade of [-1, 4, NaN, "3", null]) assert.throws(() => evaluateRanking({ ...fixture(), judgments: { a: grade } }));
  assert.throws(() => evaluateRanking({ ...fixture(), judgments: { outside: 2 } }));
});

test("artist coverage is separate from relevance and inputs remain unchanged", () => {
  const input = { ...fixture(), artistsById: { a: ["artist:1", "artist:2"], b: [] } };
  const before = structuredClone(input);
  const result = evaluateRanking(input);
  assert.equal(result.distinctArtistsAtK, 2);
  assert.equal(result.artistMetadataCoverageAtK, 0.5);
  assert.deepEqual(input, before);
});

test("an empty catalogue has undefined quality and exposure, not perfect scores", () => {
  const result = evaluateRanking({ rankedIds: [], eligibleIds: [], judgments: {} });
  assert.equal(result.ndcgAtK, null);
  assert.equal(result.recallAtK, null);
  assert.equal(result.catalogExposureAtK, null);
});

test("inherited artist metadata does not count and invalid maps fail explicitly", () => {
  const inherited = Object.create({ a: ["not-supplied"] });
  const result = evaluateRanking({ ...fixture(), artistsById: inherited });
  assert.equal(result.distinctArtistsAtK, 0);
  assert.equal(result.artistMetadataCoverageAtK, 0);
  for (const artistsById of [null, [], "invalid"]) {
    assert.throws(() => evaluateRanking({ ...fixture(), artistsById }), /artistsById must be an object/);
  }
});
