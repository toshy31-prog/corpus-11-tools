import test from "node:test";
import assert from "node:assert/strict";
import { traceDirection, createExplorationSession, augmentExplorationGraph } from "./exploration.mjs";
import { catalogueCandidates, exploreCatalogueBranch, discogsReleaseGraph } from "./catalogue.mjs";
import { buildArtistRegistryEntry, parseTrackCandidate, buildRecordingResolution } from "./identity.mjs";
import { graphFromResolution } from "./graph.mjs";
import { journeyGuidance } from "../public/journey-state.mjs";

function graph(...deltas) {
  const result = { entities: {}, edges: {} };
  for (const delta of deltas) {
    for (const node of delta.entities || []) result.entities[node.id] = node;
    for (const edge of delta.edges || []) result.edges[`${edge.from}:${edge.kind}:${edge.to}`] = edge;
  }
  return result;
}
const release = (id, artist) => discogsReleaseGraph({ id, title: `Release ${id}`, artists: [{ id: artist, name: `Artist ${artist}` }], labels: [{ id: 77, name: "Label 77" }], tracklist: [{ title: `Track ${id}`, position: "A1" }] });

test("Kosh → deux playlists → KAS:ST ne constitue jamais une branche label", () => {
  const state = augmentExplorationGraph(graph(release(1, 10), release(2, 20), { edges: [{ from: "video:youtube:nepal", to: "artist:discogs:10", kind: "probable_artist", status: "confirmed_user" }] }), [
    { id: "kosh", title: "Kosh - Black Noise [MTRON009]", playlistIds: ["owned"] },
    { id: "vril", title: "Vril - Vortekz", playlistIds: ["owned", "techno"] },
    { id: "nepal", title: "Nepal", playlistIds: ["techno"] }
  ]);
  for (const depth of [3, 6, 9]) assert.deepEqual(traceDirection(state, "video:youtube:kosh", "label", { depth }), []);
  assert.deepEqual(catalogueCandidates(state, "video:youtube:kosh", "label"), []);
  // A playlist explicitly chosen as the seed remains a valid collection of starts.
  assert.ok(catalogueCandidates(state, "playlist:youtube:techno", "label").some(item => item.artistIds.includes("artist:discogs:20")));
  const previous = { seed: { id: "video:youtube:kosh" }, branches: [{ direction: "label", status: "active", current: { signature: "old-false-path", target: { id: "track:discogs:2:A1" } } }] };
  assert.equal(createExplorationSession({ state, seed: previous.seed, directions: ["label"], depth: 9, previous }).branches[0].current, null);
});

test("le front et le catalogue partagent les mêmes preuves sur un vrai label", () => {
  const state = graph(release(1, 10), release(2, 20));
  const catalog = catalogueCandidates(state, "artist:discogs:10", "label");
  const front = traceDirection(state, "artist:discogs:10", "label", { depth: 6 });
  assert.ok(front.length);
  assert.deepEqual(front.map(item => item.target.id).sort(), catalog.map(item => item.id).sort());
  assert.ok(front.every(item => item.steps.filter(step => step.relation === "issued_by").length === 2));
});

test("aucune période ni scène documentée ne signifie pas source explorée", async () => {
  const state = graph({ entities: [{ id: "video:youtube:kosh", type: "video", title: "Kosh - Black Noise" }] });
  for (const direction of ["era", "scene"]) {
    const result = await exploreCatalogueBranch({ graph: state, seedId: "video:youtube:kosh", direction, request: () => assert.fail("Aucun identifiant exploitable") });
    assert.equal(result.coverage.complete, false);
    assert.equal(result.status, "needs_enrichment");
  }
});

test("des identifiants Wikidata cohérents pour Koshi Inaba ne confirment pas Kosh", () => {
  const identity = buildArtistRegistryEntry("Kosh", {
    musicBrainz: { artist: { id: "wrong-mbid", name: "稲葉浩志", aliases: ["Koshi Inaba"] } },
    wikidata: { id: "Q938749", name: "Koshi Inaba", musicBrainzId: "wrong-mbid", discogsId: "1740425" },
    discogs: { id: 1740425, name: "Koshi Inaba", match: "cross_id" }
  });
  assert.equal(identity.canonicalName, "Kosh");
  assert.equal(identity.resolution.status, "unresolved");
  assert.deepEqual(identity.externalIds, {});
});

test("les homonymes Discogs restent des choix séparés sans catalogue attribué", () => {
  const identity = buildArtistRegistryEntry("Kosh", { discogs: { id: 10, name: "Kosh", candidates: [{ id: 10, name: "Kosh" }, { id: 20, name: "Kosh (3)" }, { id: 30, name: "Koshi Inaba" }] } });
  const fragment = graphFromResolution({ id: "kosh", title: "Kosh - Black Noise" }, identity, null, { music: { artist: { id: "wrong" }, releases: [{ id: "wrong-release", title: "Wrong catalogue" }] } });
  const state = graph(fragment);
  assert.deepEqual(fragment.entities.filter(node => node.externalIds?.discogs).map(node => node.externalIds.discogs).sort(), ["10", "20"]);
  assert.equal(fragment.entities.some(node => node.title === "Wrong catalogue"), false);
  assert.ok(fragment.edges.filter(edge => edge.to.startsWith("artist:discogs:")).every(edge => edge.status === "candidate"));
  assert.equal(journeyGuidance({ seed: { id: "video:youtube:kosh" }, graph: state, groups: { label: { coverage: { state: "needs_enrichment" } } } }).candidates.length, 2);
});

test("un code catalogue est séparé du titre et une durée inconnue ne rejette pas le morceau", () => {
  const parsed = parseTrackCandidate("Kosh - Black Noise [MTRON009]");
  assert.equal(parsed.title, "Black Noise");
  assert.equal(parsed.catalogueCode, "MTRON009");
  const result = buildRecordingResolution(parsed, { durationMs: 0, musicBrainz: [{ id: "r", title: "Black Noise", artistCredits: [{ name: "Kosh" }], lengthMs: 300000, sourceScore: 100 }] });
  assert.equal(result.status, "resolved");
});

test("pendant l’identification on ne redemande pas d’identifier le même départ", () => {
  const guidance = journeyGuidance({ seed: { id: "video:kosh" }, dossier: { state: "loading" }, groups: { label: { coverage: { state: "not_checked" } } } });
  assert.equal(guidance.state, "loading");
  assert.match(guidance.title, /Identification/);
});

test("le crédit exact du morceau ouvre l’artiste sans confirmer un homonyme recherché", () => {
  const mbid = "423f5b9f-f9c9-4d57-936e-704b47cf19c3";
  const fragment = graphFromResolution({ id: "kosh", title: "Kosh - Black Noise" }, { id: "artist:wrong", canonicalName: "Koshi Inaba", externalIds: { musicbrainz: "wrong" }, resolution: { status: "single_source" } }, { resolved: { id: "recording-id", title: "Black Noise", artistCredits: [{ id: mbid, name: "Kosh" }] } });
  assert.equal(fragment.edges.some(edge => edge.from === "artist:wrong" && edge.kind === "credited_on"), false);
  const state = graph(fragment);
  const actualArtist = `artist:musicbrainz:${mbid}`;
  state.entities.partner = { id: "partner", type: "artist", name: "Partner" };
  state.entities.next = { id: "next", type: "release", title: "Next" };
  state.edges.alias = { from: actualArtist, to: "partner", kind: "alias_of", status: "observed" };
  state.edges.release = { from: "partner", to: "next", kind: "primary_artist", status: "observed" };
  assert.equal(catalogueCandidates(state, "video:youtube:kosh", "alias")[0]?.id, "next");
  const guidance = journeyGuidance({ seed: { id: "video:youtube:kosh" }, graph: state, groups: { alias: {} } });
  assert.equal(guidance.identityConfirmed, true);
  assert.equal(guidance.candidates.length, 0);
});

test("la période du morceau ne devient pas celle d’une autre sortie de l’artiste", () => {
  const nodes = [
    ["v", "video"], ["r", "recording"], ["a", "artist"], ["first", "release"], ["later", "release"], ["2010s", "era"], ["2020s", "era"], ["other-old", "release"], ["other-new", "release"], ["shared-label", "label"]
  ].map(([id, type]) => ({ id, type, title: id }));
  const links = [["v", "r", "embodies"], ["a", "r", "credited_on"], ["r", "first", "appears_on"], ["a", "later", "primary_artist"], ["first", "2010s", "released_in_era"], ["later", "2020s", "released_in_era"], ["other-old", "2010s", "released_in_era"], ["other-new", "2020s", "released_in_era"]].map(([from, to, kind]) => ({ from, to, kind, status: "observed" }));
  // Period alone no longer establishes a recommendation; both candidates
  // have an independent label relationship before their dates are compared.
  for (const from of ["first", "other-old", "other-new"]) links.push({ from, to: "shared-label", kind: "issued_by", status: "observed" });
  const candidates = catalogueCandidates(graph({ entities: nodes, edges: links }), "v", "era");
  assert.deepEqual(candidates.map(item => item.id), ["other-old"]);
});

test("les métadonnées nécessaires à la reprise de la vidéo restent dans le graphe", () => {
  const video = { id: "kosh", title: "Kosh - Black Noise", categoryId: "10", channelId: "channel", durationSeconds: 275, tags: ["electro"], thumbnail: "https://i.ytimg.com/vi/TFdkvDenM04/hqdefault.jpg" };
  for (const node of [graphFromResolution(video).entities[0], augmentExplorationGraph({}, [video]).entities["video:youtube:kosh"]]) {
    for (const key of ["categoryId", "channelId", "durationSeconds", "tags", "thumbnail"]) assert.deepEqual(node[key], video[key]);
  }
});
