import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCandidates, createCatalogueEligibility, discogsReleaseGraph, exploreCatalogueBranch } from "./catalogue.mjs";

const seedId = "artist:discogs:10";
const artist = id => ({ id, name: `Artist ${id}` });
const release = (id, artistIds, tracks = 1) => ({
  id, title: `Release ${id}`, artists: artistIds.map(artist), year: 2020,
  tracklist: Array.from({ length: tracks }, (_, position) => ({ title: `Track ${id}.${position}`, position: String(position + 1), type_: "track" }))
});
function merge(...deltas) {
  const graph = { entities: {}, edges: {} };
  for (const delta of deltas) {
    for (const node of Object.values(delta.entities || {})) graph.entities[node.id] = node;
    for (const edge of Object.values(delta.edges || {})) graph.edges[`${edge.from}:${edge.kind}:${edge.to}`] = edge;
  }
  return graph;
}
function fixture() {
  // The first album is a joint credit with the starting artist: valid evidence,
  // but intentionally hidden by "other artists". A solo album comes afterwards.
  const graph = merge(discogsReleaseGraph(release(100, [10, 20], 15)));
  const calls = [];
  const request = async (source, resource) => {
    calls.push(resource);
    assert.equal(source, "discogs");
    if (resource === "/artists/20") return artist(20);
    if (resource === "/artists/20/releases") return { releases: [{ id: 100, artist: "Artist 10 & Artist 20" }, { id: 200, artist: "Artist 20" }], pagination: { pages: 1 } };
    if (resource === "/releases/100") return release(100, [10, 20], 15);
    if (resource === "/releases/200") return release(200, [20], 6);
    throw new Error(`Unexpected request: ${resource}`);
  };
  return { graph, request, calls };
}
const options = graph => createCatalogueEligibility({ graph, seedId, seedArtist: "Artist 10", otherArtistsOnly: true });

test("three cached preparatory pages leave the remote budget for useful tracks", async () => {
  const { graph, request, calls } = fixture();
  const cache = new Map([
    ["/artists/20", artist(20)],
    ["/artists/20/releases", { releases: [{ id: 100 }, { id: 200 }], pagination: { pages: 1 } }],
    ["/releases/100", release(100, [10, 20], 15)]
  ]);
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request,
    readCached: (_source, resource) => cache.get(resource), configured: { discogs: true },
    candidateEligible: options(graph), minimumEligible: 6, requestBudget: 1 });
  assert.deepEqual(calls, ["/releases/200"]);
  assert.equal(result.coverage.cacheHits, 3);
  assert.equal(result.coverage.fetchedRequests, 1);
  assert.equal(result.coverage.selection.returnedEligible, 6);
  assert.equal(result.coverage.selection.stopReason, "target_reached");
});

test("a cache miss at zero budget is resumable and never a provider failure", async () => {
  const { graph, request, calls } = fixture();
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request,
    readCached: () => null, configured: { discogs: true }, candidateEligible: options(graph), requestBudget: 0 });
  assert.deepEqual(calls, []);
  assert.equal(result.coverage.selection.stopReason, "request_budget");
  assert.equal(result.coverage.sourceStates.discogs, "not_queried");
  assert.ok(result.coverage.nextCursor);
});

test("an alias search reads artist relations, not the seed discography, including old cursors", async () => {
  const graph = { entities: { [seedId]: { id: seedId, type: "artist", name: "Artist 10", externalIds: { discogs: 10 } } }, edges: {} };
  for (const cursor of ["", Buffer.from(JSON.stringify({ policy: 2, revision: "", seedId, direction: "alias", seen: [], done: [], queue: [{ source: "discogs", type: "artist_releases", id: "10", page: 1 }] })).toString("base64url")]) {
    const calls = [];
    const result = await exploreCatalogueBranch({ graph, seedId, direction: "alias", cursor, configured: { discogs: true }, request: async (_source, resource) => { calls.push(resource); return artist(10); } });
    assert.deepEqual(calls, ["/artists/10"]);
    assert.equal(result.coverage.complete, true);
    assert.equal(result.coverage.selection.stopReason, "documented_frontier_exhausted");
  }
});

test("a documented artist without a scene is not an unidentified departure", async () => {
  const graph = { entities: { [seedId]: { id: seedId, type: "artist", name: "Artist 10", externalIds: { discogs: 10 } } }, edges: {} };
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "scene", request: () => assert.fail("no network") });
  assert.equal(result.status, "not_documented");
  assert.equal(result.coverage.scope, "local_graph");
  assert.equal(result.coverage.complete, true);
  assert.equal(result.candidates.length, 0);
});

test("cached pagination is bounded and resumes without starting the same pages again", async () => {
  const graph = { entities: { [seedId]: { id: seedId, type: "artist", name: "Artist 10", externalIds: { discogs: 10 } } }, edges: {} };
  const pages = [];
  const readCached = (_source, resource, parameters) => {
    if (resource === "/artists/10") return artist(10);
    assert.equal(resource, "/artists/10/releases");
    pages.push(parameters.page);
    return { releases: [], pagination: { pages: 200 } };
  };
  const request = () => assert.fail("all responses are cached");
  const first = await exploreCatalogueBranch({ graph, seedId, direction: "remix", request, readCached, configured: { discogs: true } });
  assert.equal(first.coverage.processedTasks, 80);
  assert.equal(first.coverage.fetchedRequests, 0);
  assert.equal(first.coverage.selection.stopReason, "processing_budget");
  const last = pages.at(-1), count = pages.length;
  const next = await exploreCatalogueBranch({ graph: merge(graph, first.graphDelta), seedId, direction: "remix", cursor: first.coverage.nextCursor, request, readCached, configured: { discogs: true } });
  assert.equal(pages[count], last + 1);
  assert.equal(next.coverage.processedTasks, 80);
  assert.equal(next.coverage.fetchedRequests, 0);
});

test("filtered cached first album does not stop bounded discovery of another artist", async () => {
  const { graph, request, calls } = fixture(), before = structuredClone(graph);
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: true }, candidateEligible: options(graph), minimumEligible: 6, requestBudget: 4, limit: 12 });
  assert.deepEqual(calls, ["/artists/20", "/artists/20/releases", "/releases/100", "/releases/200"]);
  assert.equal(result.coverage.fetchedRequests, 4);
  assert.deepEqual(result.coverage.selection, { applied: true, eligible: 6, returnedEligible: 6, target: 6, targetReached: true, hidden: 15, stopReason: "target_reached" });
  assert.ok(result.candidates.slice(0, 6).every(item => item.artistIds.length === 1 && item.artistIds[0] === "artist:discogs:20"));
  assert.ok(result.candidates.some(item => item.artistIds.includes(seedId)), "raw hidden candidates are still returned for reversible view changes");
  assert.ok(result.graphDelta.entities.some(item => item.id === "track:discogs:100:14"), "all fetched evidence survives the result-page limit");
  assert.ok(result.coverage.hasMore);
  assert.deepEqual(graph, before, "collection never mutates the caller's graph");
});

test("legacy caller keeps zero-network local-cache behavior", async () => {
  const { graph, request, calls } = fixture();
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: true } });
  assert.deepEqual(calls, []);
  assert.equal(result.coverage.selection.applied, false);
  assert.equal(result.candidates.length, 12);
});

test("budget exhaustion is explicit and resumes the pending page without re-fetching completed tasks", async () => {
  const { graph, request, calls } = fixture();
  const first = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: true }, candidateEligible: options(graph), minimumEligible: 6, requestBudget: 2 });
  assert.equal(first.coverage.fetchedRequests, 2);
  assert.equal(first.coverage.selection.stopReason, "request_budget");
  assert.equal(first.coverage.selection.targetReached, false);
  assert.equal(first.coverage.complete, false);
  assert.ok(first.coverage.nextCursor);
  const resumedGraph = merge(graph, first.graphDelta);
  const second = await exploreCatalogueBranch({ graph: resumedGraph, seedId, direction: "featuring", cursor: first.coverage.nextCursor, request, configured: { discogs: true }, candidateEligible: options(resumedGraph), minimumEligible: 6, requestBudget: 2 });
  assert.equal(second.coverage.selection.returnedEligible, 6);
  assert.equal(second.coverage.selection.targetReached, true);
  assert.deepEqual(calls, ["/artists/20", "/artists/20/releases", "/releases/100", "/releases/200"]);
});

test("failed source remains partial and retryable, not an empty exhausted catalogue", async () => {
  const { graph } = fixture();
  let calls = 0;
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request: async () => { calls++; throw new Error("429 quota"); }, configured: { discogs: true }, candidateEligible: options(graph), minimumEligible: 6, requestBudget: 4 });
  assert.equal(calls, 1);
  assert.equal(result.status, "source_unavailable");
  assert.equal(result.coverage.selection.stopReason, "source_unavailable");
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.sourceStates.discogs, "rate_limited");
  assert.ok(result.coverage.nextCursor);
  assert.ok(result.candidates.length, "source failure does not discard usable local evidence");
});

test("zero budget permits no supplier call and keeps a continuation", async () => {
  const { graph, request, calls } = fixture();
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: true }, candidateEligible: options(graph), requestBudget: 0 });
  assert.deepEqual(calls, []);
  assert.equal(result.coverage.selection.stopReason, "request_budget");
  assert.ok(result.coverage.nextCursor);
});

test("a missing supplier configuration is not reported as exhausted documented evidence", async () => {
  const { graph, request, calls } = fixture();
  const result = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: false }, candidateEligible: options(graph) });
  assert.deepEqual(calls, []);
  assert.equal(result.coverage.selection.stopReason, "source_not_configured");
  assert.equal(result.coverage.selection.targetReached, false);
  assert.equal(result.coverage.complete, false);
  assert.ok(result.coverage.nextCursor);
  const resumed = await exploreCatalogueBranch({ graph, seedId, direction: "featuring", request, configured: { discogs: true }, candidateEligible: options(graph), cursor: result.coverage.nextCursor, requestBudget: 4 });
  assert.equal(resumed.coverage.selection.targetReached, true);
  assert.deepEqual(calls, ["/artists/20", "/artists/20/releases", "/releases/100", "/releases/200"]);
});

test("eligibility shares scope rules, including known IDs, exclusions, distant exceptions and inapplicable artist scope", () => {
  const { graph } = fixture();
  const policy = createCatalogueEligibility({ graph, seedId, seedArtist: "Artist 10", otherArtistsOnly: true, includeDistant: false, excludeIds: ["seen"], directLinkedIds: ["direct"] });
  const candidate = { id: "fresh", artist: "Artist 20", artistIds: ["artist:discogs:20"] };
  assert.equal(policy(candidate), true);
  assert.equal(policy({ ...candidate, id: "seen" }), false);
  assert.equal(policy({ ...candidate, artistIds: [seedId] }), false);
  assert.equal(policy({ id: "unknown" }), false);
  assert.equal(policy({ ...candidate, relationship: { distant: true } }), false);
  assert.equal(policy({ ...candidate, id: "direct", relationship: { distant: true } }), true);
  const labelPolicy = createCatalogueEligibility({ seedId: "label:discogs:77", otherArtistsOnly: true, includeDistant: false });
  assert.equal(labelPolicy({ ...candidate, relationship: { distant: true }, anchor: { id: "label:discogs:77" } }), true);
  const aliasPolicy = createCatalogueEligibility({ graph, seedId, otherArtistsOnly: true });
  assert.equal(aliasPolicy({ id: "punctum-track", artist: "Punctum", artistIds: ["artist:discogs:30"], direction: "alias" }), true, "another project is not blanket-excluded");
});

test("owned videos do not satisfy a discovery target, without excluding similarly named recordings", () => {
  const graph = merge({ entities: [
    { id: "playlist:p", type: "playlist", name: "My playlist" },
    { id: "video:owned", type: "video", title: "Same title" },
    { id: "video:unknown", type: "video", title: "Same title" },
    { id: "recording:fresh", type: "recording", title: "Same title" }
  ], edges: [
    { from: "video:owned", to: "playlist:p", kind: "included_in", status: "observed" },
    { from: "video:unknown", to: "playlist:p", kind: "included_in", status: "rejected_user" }
  ] });
  const policy = createCatalogueEligibility({ graph, excludeLibraryVideos: true });
  assert.equal(policy({ id: "video:owned" }), false);
  assert.equal(policy({ id: "video:unknown" }), true);
  assert.equal(policy({ id: "recording:fresh" }), true);
  assert.equal(createCatalogueEligibility({ graph })({ id: "video:owned" }), true, "legacy callers do not acquire a hidden new filter");
});

test("already displayed other-artist candidates do not satisfy the next collection objective", async () => {
  const { graph, request } = fixture();
  const cached = merge(graph, discogsReleaseGraph(release(300, [20])));
  const eligible = createCatalogueEligibility({ graph: cached, seedId, otherArtistsOnly: true, excludeIds: ["track:discogs:300:0"] });
  const result = await exploreCatalogueBranch({ graph: cached, seedId, direction: "featuring", request, configured: { discogs: true }, candidateEligible: eligible, minimumEligible: 6, requestBudget: 4 });
  assert.equal(result.coverage.fetchedRequests, 4);
  assert.equal(result.coverage.selection.returnedEligible, 6);
  assert.ok(result.candidates.some(item => item.id === "track:discogs:300:0"), "presentation exclusion does not erase evidence");
});

test("a bounded label collection samples different artists and releases before a second edition of the same album", async () => {
  const labelId = "label:discogs:77";
  const graph = { entities: { [labelId]: { id: labelId, type: "label", name: "Small label", externalIds: { discogs: "77" } } }, edges: {} };
  const calls = [];
  const result = await exploreCatalogueBranch({ graph, seedId: labelId, direction: "label", configured: { discogs: true }, candidateEligible: createCatalogueEligibility({ graph, seedId: labelId }), minimumEligible: 6, requestBudget: 4, request: async (source, resource) => {
    calls.push(resource);
    if (resource === "/labels/77/releases") return { releases: [{ id: 1, title: "Album", artist: "A" }, { id: 2, title: "Album", artist: "A" }, { id: 3, title: "Next", artist: "B" }, { id: 4, title: "Other", artist: "C" }], pagination: { pages: 1, items: 4 } };
    const id = Number(resource.match(/^\/releases\/(\d+)$/)?.[1]);
    assert.ok([1, 3, 4].includes(id), "another album should precede edition 2");
    return { ...release(id, [id * 10], 6), labels: [{ id: 77, name: "Small label" }] };
  } });
  assert.deepEqual(calls, ["/labels/77/releases", "/releases/1", "/releases/3", "/releases/4"]);
  assert.equal(new Set(result.candidates.slice(0, 3).map(item => item.artistIds[0])).size, 3);
  assert.equal(new Set(result.candidates.slice(0, 3).map(item => item.releaseId)).size, 3);
  const pending = JSON.parse(Buffer.from(result.coverage.nextCursor, "base64url").toString("utf8"));
  assert.ok(pending.queue.some(task => task.id === "2"), "the later edition remains resumable rather than merged away");
});

test("a reverse remix path does not describe the original artist as the remixer", () => {
  const remixed = release(100, [20]);
  remixed.tracklist[0].extraartists = [{ id: 10, name: "Artist 10", role: "Remix" }];
  const graph = merge(discogsReleaseGraph(remixed), discogsReleaseGraph(release(200, [20])), discogsReleaseGraph(release(300, [10])));
  const reverse = catalogueCandidates(graph, seedId, "remix").find(item => item.id === "track:discogs:200:0");
  assert.match(reverse.explanation, /^Via un morceau remixé par Artist 10 : Artist 20$/);
  const remixStep = reverse.path.find(step => step.relation === "remixed_by");
  assert.equal(remixStep.reversed, true);
  assert.equal(remixStep.relationLabel, "Remixe");
  assert.equal(remixStep.edgeTo, seedId);
  const forward = catalogueCandidates(graph, "artist:discogs:20", "remix").find(item => item.id === "track:discogs:300:0");
  assert.equal(forward.explanation, "Par ce remixeur : Artist 10");
  assert.equal(forward.path.find(step => step.relation === "remixed_by").relationLabel, "Remixé par");
});

test("producer credits remain distinct from remixer credits in the explanation", () => {
  const produced = release(100, [10]);
  produced.tracklist[0].extraartists = [{ id: 20, name: "Artist 20", role: "Producer" }];
  const graph = merge(discogsReleaseGraph(produced), discogsReleaseGraph(release(200, [20])));
  const candidate = catalogueCandidates(graph, seedId, "remix").find(item => item.id === "track:discogs:200:0");
  assert.equal(candidate.explanation, "Par ce producteur : Artist 20");
});
