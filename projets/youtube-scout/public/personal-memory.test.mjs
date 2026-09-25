import test from "node:test";
import assert from "node:assert/strict";
import { personalGraph, personalBackup } from "./personal-memory.mjs";
import { createBackup, validateBackup } from "./library-state.mjs";
test("old backups cannot restore automatic identities, history, graph or session", () => {
  const original = createBackup({ library: [{ id: "example01", title: "Song" }], notebook: [],
    local: { artistCorrections: { example01: "Chosen" }, presented: { old: 1 }, seen: ["old"], activeDig: {}, explorationSettings: { synthPatch: {} } },
    indexed: { entities: [["old", { name: "EDGE" }]], events: [{ id: "event", targetId: "example01", kind: "opened" }], sync: [["youtube-active-dig", {}], ["youtube-library", { at: "now" }]] },
    graph: { entities: [{ id: "artist:old", type: "artist", name: "EDGE" }], edges: [], claims: [] } });
  const clean = personalBackup(validateBackup(original));
  assert.equal(clean.library.length, 1); assert.deepEqual(clean.local.artistCorrections, { example01: "Chosen" });
  assert.deepEqual(clean.graph, { entities: [], edges: [], claims: [] });
  assert.deepEqual(clean.indexed.entities, []); assert.equal(clean.local.activeDig, undefined);
  assert.deepEqual(clean.indexed.sync, [["youtube-library", { at: "now" }]]);
  assert.equal(original.indexed.entities.length, 1, "archive itself was not mutated");
  assert.doesNotThrow(() => validateBackup(clean));
});
test("personal projection drops inferred metadata and does not follow catalogue links", () => {
  const result = personalGraph({ entities: [{ id: "v", type: "video", title: "Song", departureArtist: { name: "Chosen", source: "user" }, artistInference: { name: "Wrong" }, tags: ["wrong"] }], edges: [] });
  assert.equal(result.entities[0].artistInference, undefined);
  assert.equal(result.entities[0].tags, undefined);
  assert.equal(result.entities[0].departureArtist.name, "Chosen");
});
test("backup retains deliberate navigation settings but not exploration state", () => {
  const result = personalBackup({ local: {}, indexed: {}, navigation: { maxDuration: 45, selectedPlaylistIds: ["playlist"], depth: 6, seed: { id: "old" }, history: ["old"] } });
  assert.deepEqual(result.navigation, { depth: 6, maxDuration: 45, selectedPlaylistIds: ["playlist"] });
});
