import test from "node:test";
import assert from "node:assert/strict";
import { seedPickerChoices } from "./seed-picker-model.mjs";

const catalog = {
  track: [{ id: "video:youtube:a", type: "track", label: "Été bleu" }, { id: "video:youtube:b", type: "track", label: "Même titre" }],
  artist: [{ id: "artist:1", type: "artist", label: "Nexxor" }, { id: "artist:2", type: "artist", label: "Nexxor" }],
  label: [{ id: "label:1", type: "label", label: "Statik Travel" }],
  playlist: [{ id: "playlist:1", type: "playlist", label: "Mes vinyles" }]
};
const options = { library: [{ id: "a", title: "Été bleu", channelTitle: "Chaîne test", playlistIds: ["p"] }], playlists: [{ id: "p", title: "Collection techno" }], graph: { entities: { "video:youtube:a": { departureArtist: { name: "Nexxor", source: "user" } } } } };

test("picker searches all types by default and explicit filters narrow them", () => {
  assert.equal(seedPickerChoices(catalog).length, 6);
  for (const type of Object.keys(catalog)) assert.ok(seedPickerChoices(catalog, { type }).every(seed => seed.type === type));
  assert.equal(seedPickerChoices(catalog, { query: "Statik" })[0].type, "label");
  assert.equal(seedPickerChoices(catalog, { query: "Statik", type: "artist" }).length, 0);
});
test("picker searches accents, declared artist, channel and playlist without parsing an artist from a title", () => {
  for (const query of ["ete", " NEXXOR bleu ", "chaine", "techno"]) assert.equal(seedPickerChoices(catalog, { ...options, type: "track", query })[0].id, "video:youtube:a");
  assert.match(seedPickerChoices(catalog, options).find(s => s.id.endsWith(":a")).subtitle, /Artiste renseigné : Nexxor/);
  assert.equal(seedPickerChoices(catalog, { query: "Nexxor", type: "track" }).length, 0);
});
test("homonyms keep distinct IDs and neither relation count nor old metrics drive ranking", () => {
  assert.deepEqual(seedPickerChoices(catalog, { query: "Nexxor" }).map(s => s.id), ["artist:1", "artist:2"]);
  const before = JSON.stringify(catalog);
  seedPickerChoices(catalog, options);
  assert.equal(JSON.stringify(catalog), before);
});
test("empty catalogs and unknown queries return no invented options", () => {
  assert.deepEqual(seedPickerChoices(), []);
  assert.deepEqual(seedPickerChoices(catalog, { query: "unknown" }), []);
});

test("documented credits make tracks searchable but rejected and guessed artists do not", () => {
  const graph = { entities: { "artist:1": { type: "artist", name: "Nexxor" } }, edges: [
    { from: "artist:1", to: "recording:1", kind: "credited_on", status: "observed" },
    { from: "video:youtube:a", to: "recording:1", kind: "embodies", status: "confirmed_cross_id" },
    { from: "video:youtube:b", to: "artist:1", kind: "probable_artist", status: "candidate" }
  ] };
  assert.deepEqual(seedPickerChoices(catalog, { graph, query: "Nexxor", type: "track" }).map(s => s.id), ["video:youtube:a"]);
  graph.edges[0].status = "rejected_user";
  assert.equal(seedPickerChoices(catalog, { graph, query: "Nexxor", type: "track" }).length, 0);
});
