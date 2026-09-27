import test from "node:test";
import assert from "node:assert/strict";
import { decideTrackCandidate } from "./track-candidate-score.mjs";

const expected = { artists: ["Alpha", "Beta"], title: "Shared track", durationMs: 180000 };
const candidate = { source: "musicbrainz", sourceId: "recording-1", artists: ["Alpha"], title: "Shared track", durationMs: 180000 };

test("one exact participant cannot automatically establish a multi-artist recording", () => {
  const result = decideTrackCandidate(expected, [candidate]);
  assert.equal(result.decision, "suggested");
  assert.equal(result.reason, "expected_artist_credits_missing");
  assert.deepEqual(result.missingArtists, ["Beta"]);
  assert.equal(result.best.candidate, candidate);
});

test("complete credits remain eligible regardless of ordering", () => {
  const result = decideTrackCandidate(expected, [{ ...candidate, artists: ["Beta", "Alpha"] }]);
  assert.equal(result.decision, "auto_accept");
});

test("single artist and accent normalization retain prior behavior", () => {
  const result = decideTrackCandidate({ ...expected, artists: ["Béta"] }, [{ ...candidate, artists: ["Beta"] }]);
  assert.equal(result.decision, "auto_accept");
});

test("incomplete credits cannot bypass a rival candidate ambiguity", () => {
  const result = decideTrackCandidate(expected, [candidate, { ...candidate, sourceId: "recording-2" }]);
  assert.equal(result.decision, "ambiguous");
});
