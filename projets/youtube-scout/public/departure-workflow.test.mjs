import test from "node:test";
import assert from "node:assert/strict";
import { artistSearchHint, catalogueArtistChoices, declaredDepartureArtist, departureArtistUpdate, hasExplicitDepartureArtist, MANUAL_DEPARTURE_EVIDENCE, departureWorkflow, typedDepartureModel, localDepartureMembers } from "./departure-workflow.mjs";

test("manual names persist on one video without creating catalogue identity or name joins", () => {
  const seed = { id: "video:A", type: "video" };
  const graph = { entities: { [seed.id]: seed }, edges: [] };
  const delta = departureArtistUpdate(graph, seed, "  Nexxor  ");
  assert.deepEqual(delta.edges, []);
  assert.equal(delta.entities.length, 1);
  assert.equal(declaredDepartureArtist({ entities: { [seed.id]: delta.entities[0] } }, seed.id), "Nexxor");
  assert.equal(declaredDepartureArtist(graph, seed.id), "");
  assert.equal(declaredDepartureArtist({ entities: { [seed.id]: delta.entities[0] } }, "video:B"), "");
  assert.equal(hasExplicitDepartureArtist({ edges: delta.edges }, seed.id), false);
  assert.throws(() => departureArtistUpdate(graph, seed, "  "), /nom/);
  assert.throws(() => departureArtistUpdate(graph, seed, "a".repeat(301)), /nom/);
  assert.equal(departureArtistUpdate(graph, seed, "X").entities[0].departureArtist.name, "X");
});

test("explicit artist replacement revokes old choices only for that departure", () => {
  const seed = { id: "video:A", type: "video" }, artist = { id: "artist:discogs:1", type: "artist", name: "Wrong" };
  const graph = { entities: { [seed.id]: seed, [artist.id]: artist }, edges: [
    { from: seed.id, to: artist.id, kind: "probable_artist", status: "confirmed_user" },
    { from: "video:B", to: artist.id, kind: "probable_artist", status: "confirmed_user" }
  ] };
  const delta = departureArtistUpdate(graph, seed, "Nexxor");
  assert.equal(delta.edges.length, 1);
  assert.equal(delta.edges[0].status, "rejected_user");
  assert.equal(delta.edges[0].from, seed.id);
  assert.ok(delta.edges[0].evidence.includes("user_rejection"));
});

test("linked MusicBrainz and Discogs cards group together, unlinked homonyms do not", () => {
  const mbid = "174ad015-820c-44ee-ac38-752e7871ad4c";
  const graph = { entities: [
    { id: `mbid:${mbid}`, type: "artist", name: "Nexxor", externalIds: { musicbrainz: mbid } },
    { id: `artist:musicbrainz:${mbid}`, type: "artist", name: "Nexxor", externalIds: { musicbrainz: mbid } },
    { id: "artist:discogs:3860526", type: "artist", name: "Nexxor", externalIds: { discogs: "3860526" } },
    { id: "artist:discogs:123", type: "artist", name: "Nexxor", externalIds: { discogs: "123" } }
  ], edges: [{ from: `artist:musicbrainz:${mbid}`, to: "artist:discogs:3860526", kind: "same_identity", status: "confirmed_cross_id" }] };
  const choices = catalogueArtistChoices(graph, "Nexxor");
  assert.equal(choices.length, 2);
  assert.equal(choices[0].id, "artist:discogs:3860526");
  assert.equal(choices[0].catalogues.length, 2);
  assert.ok(choices[0].equivalentIds.includes(`mbid:${mbid}`));
  graph.edges[0].status = "rejected_user";
  assert.equal(catalogueArtistChoices(graph, "Nexxor").length, 3);
  graph.entities.push({ id: "artist:local:nexxor", type: "artist", name: "Nexxor" });
  graph.edges.push(...[`mbid:${mbid}`, "artist:discogs:3860526"].map(from => ({ from, to: "artist:local:nexxor", kind: "same_identity", status: "confirmed_user" })));
  assert.equal(catalogueArtistChoices(graph, "Nexxor").length, 3, "a name-only local node is not an identity bridge");
});

test("quoted track titles supply a search hint, not an identity", () => {
  assert.equal(artistSearchHint('"Space Travel" - Nexxor - Statik Travel 21'), "Nexxor");
  assert.equal(artistSearchHint("Kosh - Black Noise"), "Kosh");
});
test("local artist choices deduplicate exact catalogue IDs but preserve homonyms", () => {
  const graph = { entities: [
    { id: "a", type: "artist", name: "Nexxor", externalIds: { discogs: "3860526" } },
    { id: "duplicate", type: "artist", name: "Nexxor", externalIds: { discogs: "3860526" } },
    { id: "homonym", type: "artist", name: "Nexxor", externalIds: { discogs: "456" } },
    { id: "bad", type: "artist", name: "Nexxor", externalIds: { discogs: "javascript:bad" } },
    { id: "video", type: "video", name: "Nexxor", externalIds: { discogs: "12" } }
  ] };
  const before = structuredClone(graph);
  assert.deepEqual(catalogueArtistChoices(graph, "nexxor").map(c => c.id), ["a", "homonym"]);
  assert.deepEqual(catalogueArtistChoices(graph, ""), []);
  assert.deepEqual(graph, before);
});
test("catalogue name claims remain explicit choices, even when unresolved", () => {
  const registry = { claims: [{ field: "name", value: "Nexxor", source: "discogs", sourceId: "3860526", status: "candidate" }] };
  assert.equal(catalogueArtistChoices({}, "Nexxor", registry)[0].id, "artist:discogs:3860526");
});
test("old memories cannot bypass recording identification; a new scoped choice can", () => {
  const edge = { from: "video:A", to: "artist:1", kind: "probable_artist", status: "confirmed_user", evidence: ["user_confirmation"] };
  assert.equal(hasExplicitDepartureArtist({ edges: [edge] }, "video:A"), false);
  edge.evidence.push(MANUAL_DEPARTURE_EVIDENCE);
  assert.equal(hasExplicitDepartureArtist({ edges: [edge] }, "video:A"), true);
  assert.equal(hasExplicitDepartureArtist({ edges: [edge] }, "video:B"), false);
  edge.status = "rejected_user";
  assert.equal(hasExplicitDepartureArtist({ edges: [edge] }, "video:A"), false);
});
test("blocked, pending and useful results have distinct workflow states", () => {
  const state = { seed: { id: "A" }, dossier: { suppressWeakIdentityCandidates: true }, guidance: { identityConfirmed: false } };
  assert.equal(departureWorkflow({}), "choose");
  assert.equal(departureWorkflow(state), "identify");
  assert.equal(departureWorkflow({ ...state, busy: true }), "loading");
  assert.equal(departureWorkflow({ ...state, items: [{ id: "channel-track" }] }), "results");
  assert.equal(departureWorkflow({ ...state, guidance: { identityConfirmed: true } }), "search");
});
test("the first unidentified departure cannot expose tuning beside its correction form", () => {
  const guidance = { state: "needs_enrichment", identityConfirmed: false };
  assert.equal(departureWorkflow({ seed: { id: "A", type: "track" }, guidance }), "identify");
  assert.equal(departureWorkflow({ seed: { id: "A", type: "label" }, guidance }), "search");
  assert.equal(departureWorkflow({ seed: { id: "A", type: "playlist" }, guidance }), "search");
  assert.equal(departureWorkflow({ seed: { id: "A", type: "track" }, guidance, items: [{ id: "known" }] }), "results");
});

test("typed departure never asks a playlist, label or channel for a song artist", () => {
  for (const type of ["playlist", "label", "channel"]) {
    const seed = { id: `${type}:local:x`, type, label: "Archive - Collection" };
    const model = typedDepartureModel({ seed, suggestion: { name: "Wrong artist", confidence: 1 } });
    assert.equal(model.identityForm, "none");
    assert.equal(model.initialArtistName, "");
    for (const state of ["needs_confirmation", "needs_enrichment", "source_unavailable"]) {
      assert.equal(departureWorkflow({ seed, guidance: { state, identityConfirmed: false }, dossier: { suppressWeakIdentityCandidates: true } }), "search");
    }
  }
});

test("artist departure prefills its own name, including short names and hyphens", () => {
  for (const name of ["6SISS", "3arbi", "X", "Jean-Michel Jarre"]) {
    const model = typedDepartureModel({ seed: { id: "artist:local:chosen", type: "artist", label: name }, suggestion: { name: "Unrelated", confidence: 1 } });
    assert.equal(model.identityForm, "artist");
    assert.equal(model.initialArtistName, name);
    assert.equal(model.catalogueKnown, false);
  }
  assert.equal(typedDepartureModel({ seed: { id: "artist:discogs:60", type: "artist", label: "6SISS" } }).catalogueKnown, true);
  assert.equal(typedDepartureModel({ seed: { id: "artist:local:60", type: "artist", externalIds: { discogs: "60" } } }).catalogueKnown, true);
  assert.equal(typedDepartureModel({ seed: { id: "artist:discogs:no", type: "artist" } }).catalogueKnown, false);
});

test("playlist members use exact membership, not identical playlist names", () => {
  const seed = { id: "playlist:youtube:PLone", type: "playlist", label: "Same title" };
  const library = [
    { id: "one", title: "One", playlistIds: ["PLone"] },
    { id: "two", title: "Two", playlistIds: ["PLtwo"], playlistNames: ["Same title"] }
  ];
  const before = structuredClone(library);
  const graph = { entities: [{ id: "video:youtube:one", type: "video", title: "Old One" }], edges: [{ from: seed.id, to: "video:youtube:one", kind: "included_in", status: "observed" }] };
  const result = localDepartureMembers({ seed, library, graph });
  assert.deepEqual(result.map(item => [item.id, item.label]), [["video:youtube:one", "One"]]);
  assert.deepEqual(library, before);
});

test("label membership follows documented edition credits, retaining exact track IDs", () => {
  const seed = { id: "label:discogs:7", type: "label" };
  const graph = { entities: [
    { id: "track:discogs:1:0", type: "track", title: "Known" },
    { id: "track:discogs:2:0", type: "track", title: "Rejected" }
  ], edges: [
    { from: "release:discogs:1", to: seed.id, kind: "issued_by", status: "observed" },
    { from: "release:discogs:2", to: seed.id, kind: "issued_by", status: "rejected_user" },
    { from: "track:discogs:1:0", to: "release:discogs:1", kind: "appears_on", status: "observed" },
    { from: "track:discogs:2:0", to: "release:discogs:2", kind: "appears_on", status: "observed" }
  ] };
  assert.deepEqual(localDepartureMembers({ seed, graph }).map(item => item.id), ["track:discogs:1:0"]);
  assert.deepEqual(localDepartureMembers({ seed: { ...seed, id: "label:discogs:8" }, graph }), []);
});
