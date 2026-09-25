import test from "node:test";
import assert from "node:assert/strict";
import { departureRoutingGraph, departureRoutingSnapshot, correctionDelta, reviewedVideo } from "./departure-integrity.mjs";
import { graphFromResolution } from "../lib/graph.mjs";
import { graphIndex } from "../lib/catalogue-graph.mjs";
import { departureArtistIds } from "./music-sorting.mjs";
import { PersistentStore } from "../lib/persistent-store.mjs";

const video = { id: "testvideo01", title: "A real track", artist: "Artist", channelTitle: "Release - Topic" };
const identity = { id: "artist:registry:wrong", canonicalName: "Artist", externalIds: { musicbrainz: "wrong-id" }, resolution: { status: "confirmed_cross_id" } };
const recording = { resolved: { id: "recording-id", title: video.title, artistCredits: [{ id: "right-id", name: "Artist" }] } };
const mapGraph = delta => ({ entities: Object.fromEntries(delta.entities.map(e => [e.id, e])), edges: Object.fromEntries(delta.edges.map((e,i) => [e.id || String(i), e])) });
test("immutable read snapshots reuse the integrity projection and index, never mutable graphs", () => {
  const graph = mapGraph(graphFromResolution(video, identity, recording));
  graph.version = "preserved";
  const snapshot = departureRoutingSnapshot(graph);
  assert.equal(snapshot.version, "preserved");
  assert.equal(departureRoutingGraph(snapshot), snapshot);
  assert.equal(departureRoutingSnapshot(snapshot), snapshot);
  assert.equal(graphIndex(snapshot), graphIndex(snapshot));
  assert.notEqual(graphIndex(graph), graphIndex(graph));
  assert.throws(() => { snapshot.entities[identity.id].externalIds.musicbrainz = "different"; }, TypeError);
  graph.entities["video:youtube:testvideo01"].departureCorrection = { revision: "new" };
  const corrected = departureRoutingSnapshot(graph);
  assert.notEqual(graphIndex(corrected), graphIndex(snapshot));
  assert.deepEqual(departureArtistIds(corrected, "video:youtube:testvideo01"), []);
  assert.deepEqual(departureArtistIds(snapshot, "video:youtube:testvideo01"), ["artist:musicbrainz:right-id"]);
});
test("a cross-catalogue homonym cannot become this video's performer", () => {
  const graph = mapGraph(graphFromResolution(video, identity, recording));
  assert.equal(Object.values(graph.edges).find(e => e.kind === "probable_artist").status, "candidate");
  assert.deepEqual(departureArtistIds(graph, "video:youtube:testvideo01"), ["artist:musicbrainz:right-id"]);
  assert.ok(!graphIndex(graph).adjacency.get("video:youtube:testvideo01").some(e => e.to === identity.id));
});
test("legacy promoted edges are quarantined without destroying source data", () => {
  const graph = mapGraph(graphFromResolution(video, identity, null));
  const edge = Object.values(graph.edges).find(e => e.kind === "probable_artist"); edge.status = "confirmed_cross_id";
  const before = structuredClone(graph), projected = departureRoutingGraph(graph);
  assert.equal(Object.values(projected.edges).find(e => e.kind === "probable_artist").integrityReason, "performer_not_established");
  assert.deepEqual(graph, before);
});
test("exact recording credit retains a supported artist bridge, never a name join", () => {
  const graph = mapGraph(graphFromResolution(video, { ...identity, externalIds: { musicbrainz: "right-id" } }, recording));
  assert.equal(Object.values(departureRoutingGraph(graph).edges).find(e => e.kind === "probable_artist").status, "corroborated");
});
test("correction invalidates old recording and artist edges but preserves originals", () => {
  const graph = mapGraph(graphFromResolution(video, identity, recording));
  const delta = correctionDelta(graph, { id: "video:youtube:testvideo01" }, { title: "Correct title", artist: "Correct performer", revision: "revision-2" });
  graph.entities[delta.entities[0].id] = delta.entities[0];
  const projected = departureRoutingGraph(graph);
  assert.ok(Object.values(projected.edges).filter(e => ["probable_artist", "embodies"].includes(e.kind)).every(e => e.status === "candidate"));
  const corrected = reviewedVideo(video, delta.entities[0]);
  assert.equal(corrected.title, "Correct title"); assert.equal(corrected.artist, "Correct performer");
  assert.equal(delta.entities[0].title, "A real track"); assert.equal(video.title, "A real track");
});
test("a new resolution belongs to its correction revision", () => {
  const graph = mapGraph(graphFromResolution({ ...video, departureRevision: "r2" }, identity, recording));
  graph.entities["video:youtube:testvideo01"].departureCorrection = { revision: "r2" };
  assert.equal(Object.values(departureRoutingGraph(graph).edges).find(e => e.kind === "embodies").status, "resolved");
});
test("a failed correction write does not leak into the next save", async () => {
  const store = new PersistentStore("unused"); store.loaded = true;
  store.state.entities.v = { id: "v", type: "video", title: "Original" };
  const delta = correctionDelta(store.snapshot(), { id: "v" }, { title: "Correction", artist: "Artist", revision: "r2" });
  store.persist = async () => { throw new Error("disk full"); };
  await assert.rejects(store.saveDepartureCorrection(delta), /disk full/);
  assert.deepEqual(store.state.entities.v, { id: "v", type: "video", title: "Original" });
});
test("explicit selection remains scoped and local name hubs cannot relay automatic authority", () => {
  const graph = mapGraph(graphFromResolution(video, identity, null));
  Object.values(graph.edges).find(e => e.kind === "probable_artist").status = "confirmed_user";
  graph.entities["artist:local:artist"] = { id: "artist:local:artist", type: "artist", name: "Artist" };
  graph.edges.hub = { from: identity.id, to: "artist:local:artist", kind: "same_identity", status: "corroborated" };
  const projected = departureRoutingGraph(graph);
  assert.equal(projected.edges.hub.status, "candidate");
  assert.deepEqual(departureArtistIds(graph, "video:youtube:testvideo01"), [identity.id]);
});
