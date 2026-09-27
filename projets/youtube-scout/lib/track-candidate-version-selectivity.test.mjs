import test from "node:test";
import assert from "node:assert/strict";
import { decideTrackCandidate } from "./track-candidate-score.mjs";

const expected = { artists: ["Múm"], title: "Track", version: "Original Mix", durationMs: 240000, catalogueCode: "A1" };
const candidate = { ...expected, artists: ["Mum"], source: "musicbrainz", id: "synthetic" };

test("explicit conflicting versions cannot be compensated by catalogue and duration", () => {
  for (const version of ["Live", "Radio Edit", "Other Remix"]) {
    const result = decideTrackCandidate(expected, [{ ...candidate, version }]);
    assert.equal(result.decision, "suggested", version);
    assert.equal(result.reason, "explicit_version_requires_verification");
    assert.equal(result.best.candidate.id, "synthetic");
    assert.ok(result.best.score >= 0.9, "regression exercises the prior auto-accept branch");
  }
});

test("compatible versions and accented names preserve automatic coverage", () => {
  for (const version of ["Original Mix", "original-mix", "Óriginal Mix", ""]) {
    assert.equal(decideTrackCandidate(expected, [{ ...candidate, version }]).decision, "auto_accept", version);
  }
});

test("homonymous titles with wrong artist and close rival candidates remain guarded", () => {
  assert.notEqual(decideTrackCandidate(expected, [{ ...candidate, artists: ["Another Artist"] }]).decision, "auto_accept");
  assert.equal(decideTrackCandidate(expected, [candidate, { ...candidate, id: "rival" }]).decision, "ambiguous");
});
