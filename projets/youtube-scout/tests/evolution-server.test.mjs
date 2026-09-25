import test from "node:test";
import { sessionFetch } from "./session-fetch.mjs";
const fetch = sessionFetch();
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discogsReleaseGraph } from "../lib/catalogue.mjs";

async function listen(server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server.address().port;
}

async function isolatedScout(t, handler) {
  const requests = [];
  const fixture = http.createServer((request, response) => {
    requests.push(new URL(request.url, "http://fixture").pathname);
    response.setHeader("content-type", "application/json");
    const payload = handler?.(request.url) || {};
    response.end(JSON.stringify(payload));
  });
  const fixturePort = await listen(fixture);
  const probe = http.createServer(), port = await listen(probe);
  await new Promise(resolve => probe.close(resolve));
  const directory = await mkdtemp(join(tmpdir(), "scout-view-scope-test-"));
  const root = `http://127.0.0.1:${fixturePort}`;
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(directory, "graph.json"),
      DISCOGS_TOKEN: "synthetic-private-token", DISCOGS_TOKEN_FILE: join(directory, "discogs-token"),
      SCOUT_GOOGLE_CLIENT_ID: "", SCOUT_GOOGLE_CLIENT_SECRET: "", SCOUT_GOOGLE_TOKEN_FILE: join(directory, "google-token"),
      APPLE_MUSIC_TOKEN: "", SPOTIFY_TOKEN: "", SOUNDCLOUD_TOKEN: "",
      MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: root, DISCOGS_ROOT: root,
      LISTENBRAINZ_ROOT: root, APPLE_MUSIC_ROOT: root, SPOTIFY_ROOT: root, YOUTUBE_THUMBNAIL_ROOT: root },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(async () => {
    const stopped = child.exitCode === null ? once(child, "exit") : Promise.resolve();
    child.kill("SIGTERM");
    await stopped;
    fixture.closeAllConnections?.();
    await new Promise(resolve => fixture.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  let timer;
  await Promise.race([
    once(child.stdout, "data"),
    once(child, "exit").then(() => { throw new Error("Isolated Scout exited before readiness"); }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Isolated Scout did not start")), 5000); })
  ]).finally(() => clearTimeout(timer));
  return { base: `http://localhost:${port}`, requests };
}

const scope = (extra = {}) => ({ otherArtistsOnly: false, includeDistant: true, seedArtist: "", seedArtistIds: [], excludeIds: [], directLinkedIds: [], ...extra });
const branchUrl = (base, seedId, direction, viewScope) => `${base}/api/music/branch?${new URLSearchParams({ seedId, direction, ...(viewScope === undefined ? {} : { viewScope: typeof viewScope === "string" ? viewScope : JSON.stringify(viewScope) }) })}`;
async function ingest(base, delta) {
  const response = await fetch(`${base}/api/graph/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) });
  assert.equal(response.status, 200);
}

for (const source of ["discogs", "musicbrainz"]) test(`HTTP ${source}: a profile cached by another direction does not spend the next remote budget`, async t => {
  const id = source === "discogs" ? "10" : "11111111-1111-4111-8111-111111111111";
  const profilePath = source === "discogs" ? `/artists/${id}` : `/artist/${id}`;
  const cataloguePath = source === "discogs" ? `/artists/${id}/releases` : "/release";
  const { base, requests } = await isolatedScout(t, path => {
    const url = new URL(path, "http://fixture");
    if (url.pathname === profilePath) return { id, name: "Synthetic Artist", relations: [] };
    if (url.pathname === cataloguePath) return { releases: [], pagination: { pages: 1 }, "release-count": 0 };
    return {};
  });
  const seedId = `artist:${source}:${id}`;
  await ingest(base, { entities: [{ id: seedId, type: "artist", name: "Synthetic Artist", externalIds: { [source]: id } }], edges: [] });
  const warm = await fetch(branchUrl(base, seedId, "alias", scope())).then(response => response.json());
  assert.equal(warm.coverage.fetchedRequests, 1);
  assert.deepEqual(requests, [profilePath]);
  const next = await fetch(branchUrl(base, seedId, "remix", scope())).then(response => response.json());
  assert.deepEqual(requests, [profilePath, cataloguePath]);
  assert.equal(next.coverage.cacheHits, 1);
  assert.equal(next.coverage.fetchedRequests, 1);
  assert.equal(next.coverage.complete, true);
});

test("viewScope validates atomically and rejects cross-site catalogue access without supplier calls", async t => {
  const { base, requests } = await isolatedScout(t);
  const seed = { id: "artist:discogs:10", type: "artist", name: "Source", externalIds: { discogs: "10" } };
  await ingest(base, { entities: [seed], edges: [] });
  const before = await fetch(`${base}/api/graph`).then(response => response.json());
  const invalid = ["{", "null", "[]", {}, scope({ otherArtistsOnly: "true" }), scope({ includeDistant: 1 }), scope({ excludeLibraryVideos: "true" }),
    scope({ includeUnknownArtists: "true" }), scope({ includeCollaborations: 1 }),
    scope({ seedArtist: "x".repeat(501) }), scope({ seedArtistIds: "id" }), scope({ excludeIds: Array(101).fill("id") }),
    scope({ directLinkedIds: ["x".repeat(241)] }), scope({ excludeIds: [null] }), scope({ extra: "x".repeat(8001) })];
  for (const value of invalid) {
    const response = await fetch(branchUrl(base, seed.id, "label", value));
    assert.equal(response.status, 400, JSON.stringify(value).slice(0, 100));
    assert.deepEqual(await response.json(), { message: "Périmètre d’affichage invalide." });
  }
  const forbidden = await fetch(branchUrl(base, seed.id, "label", scope()), { headers: { origin: "https://outside.test" } });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(requests, []);
  assert.deepEqual(await fetch(`${base}/api/graph`).then(response => response.json()), before);
});

test("legacy scope remains optional; library exclusion changes the objective without deleting local candidates", async t => {
  const { base, requests } = await isolatedScout(t);
  const seedId = "video:youtube:source";
  const entities = [
    { id: seedId, type: "video", title: "Source" }, { id: "channel:youtube:UCfixture", type: "channel", name: "Uploader" },
    { id: "playlist:youtube:owned", type: "playlist", name: "Library" },
    { id: "video:youtube:owned", type: "video", title: "Owned" }, { id: "video:youtube:new", type: "video", title: "New" }
  ];
  const edges = [seedId, "video:youtube:owned", "video:youtube:new"].map(id => ({ from: id, to: "channel:youtube:UCfixture", kind: "published_by", status: "observed" }));
  edges.push({ from: "video:youtube:owned", to: "playlist:youtube:owned", kind: "included_in", status: "observed" });
  await ingest(base, { entities, edges });
  const legacyResponse = await fetch(branchUrl(base, seedId, "curator"));
  assert.equal(legacyResponse.status, 200);
  const legacy = await legacyResponse.json();
  assert.equal(legacy.coverage.selection.applied, false);
  assert.equal(legacy.candidates.length, 2);
  assert.equal(legacy.coverage.fetchedRequests, 0);
  const legacyScope = await fetch(branchUrl(base, seedId, "curator", scope())).then(response => response.json());
  assert.equal(legacyScope.coverage.selection.eligible, 2, "the new optional flag defaults to false");
  const strictArtists = scope({ otherArtistsOnly: true, seedArtist: "Known artist" });
  const strict = await fetch(branchUrl(base, seedId, "curator", strictArtists)).then(response => response.json());
  assert.equal(strict.coverage.selection.eligible, 0);
  const unknownAllowed = await fetch(branchUrl(base, seedId, "curator", { ...strictArtists, includeUnknownArtists: true, includeCollaborations: false })).then(response => response.json());
  assert.equal(unknownAllowed.coverage.selection.eligible, 2);
  assert.equal(unknownAllowed.coverage.fetchedRequests, 0);
  assert.deepEqual(new Set(unknownAllowed.candidates.map(item => item.id)), new Set(legacy.candidates.map(item => item.id)));
  const filteredResponse = await fetch(branchUrl(base, seedId, "curator", scope({ excludeLibraryVideos: true })));
  assert.equal(filteredResponse.status, 200);
  const filtered = await filteredResponse.json();
  assert.equal(filtered.coverage.selection.applied, true);
  assert.equal(filtered.coverage.selection.eligible, 1);
  assert.equal(filtered.coverage.selection.returnedEligible, 1);
  assert.equal(filtered.coverage.selection.hidden, 1);
  assert.equal(filtered.candidates[0].id, "video:youtube:new");
  assert.deepEqual(new Set(filtered.candidates.map(item => item.id)), new Set(legacy.candidates.map(item => item.id)));
  assert.equal(filteredResponse.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(JSON.stringify(filtered), /synthetic-private-token|refreshToken|accessToken|clientSecret/);
  assert.deepEqual(requests, []);
});

test("HTTP branch scope reaches other-artist tracks after a cached hidden album within the default request budget", async t => {
  const release = (id, artistIds, tracks = 1) => ({ id, title: `Album ${id}`, artists: artistIds.map(id => ({ id, name: `Artist ${id}` })), tracklist: Array.from({ length: tracks }, (_, index) => ({ title: `Track ${id}.${index}`, position: String(index + 1), type_: "track" })) });
  const { base, requests } = await isolatedScout(t, path => {
    const url = new URL(path, "http://fixture");
    if (url.pathname === "/artists/20") return { id: 20, name: "Artist 20" };
    if (url.pathname === "/artists/20/releases") return { releases: [{ id: 100 }, { id: 200 }], pagination: { pages: 1 } };
    if (url.pathname === "/releases/100") return release(100, [10, 20], 15);
    if (url.pathname === "/releases/200") return release(200, [20], 6);
    return {};
  });
  const delta = discogsReleaseGraph(release(100, [10, 20], 15));
  await ingest(base, delta);
  const response = await fetch(branchUrl(base, "artist:discogs:10", "featuring", scope({ otherArtistsOnly: true, seedArtist: "Artist 10", seedArtistIds: ["artist:discogs:10"] })));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(requests, ["/artists/20", "/artists/20/releases", "/releases/100", "/releases/200"]);
  assert.equal(result.coverage.fetchedRequests, 4);
  assert.equal(result.coverage.requestBudget, 5);
  assert.equal(result.coverage.selection.returnedEligible, 6);
  assert.equal(result.coverage.selection.targetReached, true);
  assert.ok(result.candidates.slice(0, 6).every(item => item.artistIds.length === 1 && item.artistIds[0] === "artist:discogs:20"));
  assert.match(result.coverage.nextCursor, /^branch\./, "only an opaque server cursor leaves the API");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private-token|refreshToken|accessToken|clientSecret/);
  const graph = await fetch(`${base}/api/graph`).then(response => response.json());
  assert.ok(graph.entities["track:discogs:100:14"], "cached hidden track evidence persists");
  assert.ok(graph.entities["track:discogs:200:5"], "new useful evidence is persisted in the isolated graph");
});
