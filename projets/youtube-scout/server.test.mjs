import test from "node:test";
import { sessionFetch } from "./tests/session-fetch.mjs";
const fetch = sessionFetch();
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { discogsReleaseGraph } from "./lib/catalogue.mjs";

async function freePort() {
  const probe = http.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function startScout(t, environment = {}) {
  const port = await freePort();
  const dataFile = join(tmpdir(), `youtube-scout-test-${process.pid}-${port}.json`);
  const tokenFile = environment.DISCOGS_TOKEN_FILE || join(tmpdir(), `youtube-scout-token-${process.pid}-${port}`);
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: dataFile, DISCOGS_TOKEN: "", DISCOGS_TOKEN_FILE: tokenFile, ...environment },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => child.kill("SIGTERM"));
  t.after(() => rm(dataFile, { force: true }));
  if (!environment.DISCOGS_TOKEN_FILE) t.after(() => rm(tokenFile, { force: true }));
  await Promise.race([
    once(child.stdout, "data"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Le serveur n’a pas démarré.")), 3000))
  ]);
  return port;
}

test("strict artist choices remain read-only and direct references cannot select arbitrary hosts", async t => {
  const fixture = http.createServer((request,response) => {
    response.setHeader('content-type','application/json');
    response.end(JSON.stringify({ artists: [
      {id:'00000000-0000-4000-8000-000000000001',name:'The Black Tone'},
      {id:'00000000-0000-4000-8000-000000000002',name:'TH',disambiguation:'Fixture only'}
    ] }));
  });
  fixture.listen(0,'127.0.0.1'); await once(fixture,'listening'); t.after(()=>fixture.close());
  const port=await startScout(t,{MUSICBRAINZ_ROOT:`http://127.0.0.1:${fixture.address().port}`,MUSICBRAINZ_INTERVAL:'0'}), base=`http://localhost:${port}`;
  const before=await fetch(`${base}/api/graph`).then(r=>r.json());
  const data=await fetch(`${base}/api/music/artist-choices?name=TH`).then(r=>r.json());
  assert.deepEqual(data.candidates.map(c=>c.name),['TH']);
  assert.equal(data.sourceStates.discogs,'not_configured');
  assert.equal((await fetch(`${base}/api/music/artist-choices?reference=${encodeURIComponent('http://localhost:22')}`)).status,400);
  assert.deepEqual(await fetch(`${base}/api/graph`).then(r=>r.json()),before);
  assert.match(await fetch(`${base}/video-credits.mjs`).then(r=>r.text()),/export function videoArtistEvidence/);
});

test("cross-site GET cannot inspect state or trigger catalogue and thumbnail work", async t => {
  let upstreamCalls = 0;
  const fixture = http.createServer((_request, response) => { upstreamCalls++; response.end('{}'); });
  fixture.listen(0, "127.0.0.1"); await once(fixture, "listening");
  t.after(() => fixture.close());
  const root = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", YOUTUBE_THUMBNAIL_ROOT: root });
  for (const path of ["/api/graph", "/api/exploration/session", "/api/music/artist?name=Fixture", "/api/music/artist-choices?name=TH", "/api/youtube/thumbnail/fixture001"]) {
    for (const headers of [{ origin: "https://outside.test" }, { origin: `http://localhost:${port + 1}` }, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
      assert.equal((await fetch(`http://localhost:${port}${path}`, { headers })).status, 403, path);
    }
  }
  assert.equal(upstreamCalls, 0);
  assert.equal((await fetch(`http://localhost:${port}/api/health`)).status, 200);
});

test("invalid graph evidence and cross-departure sessions are rejected atomically over HTTP", async t => {
  const port = await startScout(t);
  const base = `http://localhost:${port}`;
  const headers = { "content-type": "application/json" };
  const before = await fetch(`${base}/api/graph`).then(r => r.json());
  const invalid = { entities: [{ id: "new", type: "artist" }], edges: [{ from: "new", to: "other", kind: "same_identity", evidence: {} }] };
  assert.equal((await fetch(`${base}/api/graph/ingest`, { method: "POST", headers, body: JSON.stringify(invalid) })).status, 400);
  assert.deepEqual(await fetch(`${base}/api/graph`).then(r => r.json()), before);
  const session = { schemaVersion: 2, seed: { id: "A" }, front: { seed: { id: "B" }, branches: [] } };
  assert.equal((await fetch(`${base}/api/exploration/session`, { method: "PUT", headers, body: JSON.stringify({ session }) })).status, 400);
  assert.equal((await fetch(`${base}/api/exploration/session`).then(r => r.json())).session, null);
  // fetch may rewrite forbidden Host headers: use an actual raw HTTP header.
  const status = await new Promise((resolve, reject) => {
    http.get({ hostname: "127.0.0.1", port, path: "/api/graph", headers: { host: `attacker.test:${port}` } }, response => {
      response.resume(); response.on("end", () => resolve(response.statusCode));
    }).on("error", reject);
  });
  assert.equal(status, 403);
});

test("punctuation and non-Latin artist searches have separate identity caches", async t => {
  const names = ["C++", "C", "東京", "大阪"];
  const ids = names.map((_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`);
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    let data = {};
    if (url.pathname === "/artist") {
      const query = url.searchParams.get("query").replaceAll("\\", "");
      const name = names.find(name => query === `artist:"${name}"`);
      data = { artists: name ? [{ id: ids[names.indexOf(name)], name, score: 100 }] : [] };
    }
    response.setHeader("content-type", "application/json"); response.end(JSON.stringify(data));
  });
  fixture.listen(0, "127.0.0.1"); await once(fixture, "listening"); t.after(() => fixture.close());
  const root = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: `${root}/wiki` });
  for (const [i, name] of names.entries()) {
    const identity = await fetch(`http://localhost:${port}/api/music/identity?name=${encodeURIComponent(name)}`).then(r => r.json());
    assert.equal(identity.requestedName, name);
    assert.equal(identity.externalIds.musicbrainz, ids[i]);
  }
});

test("refuse écritures intersites, JSON invalide et clés réservées sans modifier le graphe", async t => {
  const port = await startScout(t);
  const url = `http://localhost:${port}`;
  for (const path of ["/api/events", "/api/graph/ingest", "/api/sync", "/api/exploration/session"]) {
    const response = await fetch(url + path, { method: path.includes("session") ? "PUT" : "POST", headers: { origin: "https://untrusted.example", "content-type": "application/json" }, body: '{}' });
    assert.equal(response.status, 403);
  }
  assert.equal((await fetch(url + "/api/exploration/session", { method: "DELETE", headers: { origin: "https://untrusted.example" } })).status, 403);
  assert.equal((await fetch(url + "/api/graph/ingest", { method: "POST", headers: { "content-type": "text/plain" }, body: '{}' })).status, 415);
  for (const body of ['{', 'null', '[]', '{"entities":{}}', '{"entities":[{"id":"__proto__","type":"artist"}]}']) {
    assert.equal((await fetch(url + "/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body })).status, 400);
  }
  assert.equal((await fetch(url + "/api/graph/summary").then(r => r.json())).entities, 0);
});

test("Kosh ne suit pas les identifiants de Koshi Inaba et conserve les choix Discogs", async (t) => {
  const requested = [];
  const mbid = "423f5b9f-f9c9-4d57-936e-704b47cf19c3";
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    requested.push(url.pathname);
    let data = {};
    if (url.pathname === "/artist") data = { artists: [{ id: mbid, name: "Kosh", score: 100 }] };
    if (url.searchParams.get("action") === "wbsearchentities") data = { search: [{ id: "Q938749", label: "Koshi Inaba", description: "Japanese musician" }] };
    if (url.searchParams.get("action") === "wbgetentities") data = { entities: { Q938749: { id: "Q938749", labels: { en: { value: "Koshi Inaba" } }, claims: { P434: [{ mainsnak: { datavalue: { value: "d05f99dc-7fe5-44a6-93b8-8947ef90d09b" } } }], P1953: [{ mainsnak: { datavalue: { value: "1740425" } } }] } } } };
    if (url.pathname === "/database/search") data = { results: [{ id: 5927130, type: "artist", title: "Kosh (7)" }, { id: 15790, type: "artist", title: "Kosh" }] };
    if (url.pathname === "/artists/5927130") data = { id: 5927130, name: "Kosh (7)", namevariations: ["Kosh"] };
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(data));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());
  const root = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: `${root}/wiki`, DISCOGS_ROOT: root, DISCOGS_TOKEN: "fixture-token" });
  const identity = await fetch(`http://localhost:${port}/api/music/identity?name=Kosh`).then(r => r.json());
  assert.equal(identity.canonicalName, "Kosh");
  assert.equal(identity.externalIds.musicbrainz, mbid);
  assert.equal(identity.externalIds.discogs, undefined);
  assert.equal(identity.resolution.status, "single_source");
  assert.equal(identity.discogs.candidates.length, 2);
  assert.equal(requested.includes("/artists/1740425"), false);
  assert.equal(requested.includes("/artist/d05f99dc-7fe5-44a6-93b8-8947ef90d09b"), false);
});

test("correction du départ : persistance, concurrence et rejet des enrichissements périmés", async (t) => {
  const port = await startScout(t), base = `http://localhost:${port}`;
  const post = (path, body) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify(body) });
  const id = "video:youtube:revised0001";
  const saved = await post("/api/departure/correction", { seedId: id, originalTitle: "Original", title: "Correct title", artist: "Correct artist", expectedRevision: "" });
  assert.equal(saved.status, 200);
  const { revision } = await saved.json();
  const stale = await post("/api/resolution", { video: { id: "revised0001", title: "Original" }, identity: { id: "wrong", canonicalName: "Wrong", resolution: { status: "confirmed_cross_id" } } });
  assert.equal(stale.status, 409);
  const collision = await post("/api/departure/correction", { seedId: id, title: "Stale edit", artist: "Stale", expectedRevision: "" });
  assert.equal(collision.status, 409);
  const fresh = await post("/api/resolution", { video: { id: "revised0001", title: "Correct title", departureRevision: revision }, recording: { resolved: { id: "right-recording", title: "Correct title", artistCredits: [] } } });
  assert.equal(fresh.status, 200);
  const graph = await fetch(`${base}/api/graph`).then(r => r.json());
  assert.equal(graph.entities[id].departureCorrection.artist, "Correct artist");
  assert.equal(graph.entities.wrong, undefined);
  assert.ok(Object.values(graph.edges).some(edge => edge.kind === "embodies" && edge.departureRevision === revision));
});

test("sert l’interface et le contrat du moteur", async (t) => {
  const port = await startScout(t);
  const redirect = await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get("location"), `http://localhost:${port}/`);
  const page = await fetch(`http://localhost:${port}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /accounts\.google\.com/);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  const pageText = await page.text();
  assert.match(pageText, /Réseau de collaborations/);
  assert.match(pageText, /id="bandcamp-import/);
  assert.doesNotMatch(pageText, /id="wish"/);
  assert.match(pageText, /id="max-duration"/);
  assert.match(pageText, /Où part-on ensuite/);
  assert.match(pageText, /id="save-client-id"/);
  const app = await fetch(`http://127.0.0.1:${port}/app.js`).then((response) => response.text());
  assert.match(app, /MAX_IMPORTED_VIDEOS = 5000/);
  assert.match(app, /localStorage\.setItem\(CLIENT_ID_KEY/);
  assert.match(app, /import \{ parseTrackCandidate, registryStorageKey \} from "\/identity\.js"/);
  assert.match(app, /rankDerivedCandidates/);
  const engine = await fetch(`http://127.0.0.1:${port}/scout.js`);
  assert.equal(engine.status, 200);
  assert.match(engine.headers.get("content-type"), /text\/javascript/);
  assert.match(await engine.text(), /composeProgramme/);
  const identityEngine = await fetch(`http://127.0.0.1:${port}/identity.js`);
  assert.equal(identityEngine.status, 200);
  assert.match(identityEngine.headers.get("content-type"), /text\/javascript/);
  assert.match(await identityEngine.text(), /buildArtistRegistryEntry/);
  const diggingEngine = await fetch(`http://127.0.0.1:${port}/digging.js`);
  assert.equal(diggingEngine.status, 200);
  assert.match(await diggingEngine.text(), /compileAvailability/);
  const explorationEngine = await fetch(`http://127.0.0.1:${port}/exploration.js`);
  assert.equal(explorationEngine.status, 200);
  assert.match(await explorationEngine.text(), /createExplorationSession/);
  const sharedGraph = await fetch(`http://localhost:${port}/catalogue-graph.mjs`);
  assert.equal(sharedGraph.status, 200);
  assert.match(await sharedGraph.text(), /export function catalogueCandidates/);
  const status = await fetch(`http://127.0.0.1:${port}/api/status`).then((response) => response.json());
  assert.equal(status.lenses.length, 7);
  assert.equal(status.roles.length, 4);
  assert.equal(status.oauthScope, "https://www.googleapis.com/auth/youtube.readonly");
  assert.equal(status.discogsConfigured, false);
  assert.equal(status.version, "0.20.1");
  assert.equal(status.discogsCredentialSource, "none");
  assert.equal(status.capabilities.listenbrainz, true);
  assert.equal(status.capabilities.bandcamp, "supplied_metadata_import");
});

test("relaie les miniatures YouTube et utilise un repli local", async (t) => {
  const fixture = http.createServer((request, response) => {
    if (request.url === "/vi/available-id/hqdefault.jpg") {
      response.writeHead(200, { "content-type": "image/jpeg" });
      return response.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    }
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("missing");
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());

  const port = await startScout(t, { YOUTUBE_THUMBNAIL_ROOT: `http://127.0.0.1:${fixture.address().port}` });
  const available = await fetch(`http://localhost:${port}/api/youtube/thumbnail/available-id`);
  assert.equal(available.status, 200);
  assert.equal(available.headers.get("content-type"), "image/jpeg");
  assert.deepEqual(Buffer.from(await available.arrayBuffer()), Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

  const missing = await fetch(`http://localhost:${port}/api/youtube/thumbnail/missing-id`);
  assert.equal(missing.status, 200);
  assert.match(missing.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(await missing.text(), /Miniature indisponible/);

  const invalid = await fetch(`http://localhost:${port}/api/youtube/thumbnail/%2e%2e`);
  assert.equal(invalid.status, 404);
});

test("catalogue branch returns exact local label discoveries and validates its cursor", async (t) => {
  const port = await startScout(t);
  for (const [id, artist] of [[1, 10], [2, 20]]) {
    const delta = discogsReleaseGraph({ id, title: `Release ${id}`, artists: [{ id: artist, name: `Artist ${artist}` }], labels: [{ id: 77, name: "Shared label" }], tracklist: [{ title: `Track ${id}`, position: "A1" }] });
    const response = await fetch(`http://localhost:${port}/api/graph/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) });
    assert.equal(response.status, 200);
  }
  const response = await fetch(`http://localhost:${port}/api/music/branch?seedId=artist:discogs:10&direction=label`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.candidates.map(({ title }) => title), ["Track 2"]);
  assert.equal(result.candidates[0].anchor.id, "label:discogs:77");
  assert.equal(result.coverage.fetchedRequests, 0);
  assert.equal((await fetch(`http://localhost:${port}/api/music/branch?seedId=artist:discogs:10&direction=label&cursor=invalid`)).status, 400);
  assert.equal((await fetch(`http://localhost:${port}/api/music/branch?seedId=unknown&direction=label`)).status, 404);
});

test("Bandcamp import persists supplied facts without requesting a remote page", async (t) => {
  const port = await startScout(t);
  const payload = { sourceUrl: "https://example.bandcamp.com/album/fixture", artist: "Fixture artist", title: "Fixture album", releaseDate: "2027-01-01", tracks: [{ title: "A track" }], label: "Fixture label" };
  const response = await fetch(`http://localhost:${port}/api/music/bandcamp/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.imported.tracks, 1);
  assert.ok(result.graphDelta.edges.every(({ source }) => source === "user_supplied"));
  const graph = await fetch(`http://localhost:${port}/api/graph`).then((value) => value.json());
  assert.ok(Object.values(graph.entities).some(({ title }) => title === "A track"));
  const rejected = await fetch(`http://localhost:${port}/api/music/bandcamp/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, sourceUrl: "https://attacker.test/album/fixture" }) });
  assert.equal(rejected.status, 400);
});

test("conserve, restitue et ferme le front de fouille", async (t) => {
  const port = await startScout(t);
  const session = {
    schemaVersion: 1,
    id: "front-1",
    seed: { id: "video:youtube:v1", type: "track", label: "Une graine" },
    directions: ["label"],
    depth: 2,
    branches: [],
    lineage: [],
    createdAt: "2026-09-11T00:00:00.000Z",
    updatedAt: "2026-09-11T00:00:00.000Z"
  };
  const saved = await fetch(`http://localhost:${port}/api/exploration/session`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ session }) });
  assert.equal(saved.status, 200);
  const restored = await fetch(`http://localhost:${port}/api/exploration/session`).then((response) => response.json());
  assert.equal(restored.session.seed.label, "Une graine");
  const activeDig = {
    schemaVersion: 2,
    id: "dig-2",
    seed: session.seed,
    front: { ...session, schemaVersion: 2, coverage: { label: { state: "complete", sources: ["musicbrainz"] } } },
    dossier: { state: "partial", sourceStates: { discogs: "candidate" } },
    derived: [],
    derivedIds: [],
    history: []
  };
  const savedActiveDig = await fetch(`http://localhost:${port}/api/exploration/session`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: activeDig }) });
  assert.equal(savedActiveDig.status, 200);
  const restoredActiveDig = await fetch(`http://localhost:${port}/api/exploration/session`).then((response) => response.json());
  assert.equal(restoredActiveDig.session.front.seed.label, "Une graine");
  assert.equal(restoredActiveDig.session.dossier.sourceStates.discogs, "candidate");
  const removed = await fetch(`http://localhost:${port}/api/exploration/session`, { method: "DELETE" }).then((response) => response.json());
  assert.equal(removed.removed, true);
  assert.equal((await fetch(`http://localhost:${port}/api/exploration/session`).then((response) => response.json())).session, null);
});

test("vérifie et persiste le jeton Discogs sans jamais le renvoyer", async (t) => {
  const token = "d".repeat(40);
  const tokenDirectory = join(tmpdir(), `youtube-scout-persistent-token-${process.pid}-${Date.now()}`);
  const tokenFile = join(tokenDirectory, "discogs-token");
  t.after(() => rm(tokenDirectory, { recursive: true, force: true }));
  let authorization = "";
  const fixture = http.createServer((request, response) => {
    authorization = request.headers.authorization || "";
    if (request.url === "/oauth/identity" && authorization !== `Discogs token=${token}`) {
      response.writeHead(401, { "content-type": "application/json" });
      return response.end(JSON.stringify({ message: "invalid token" }));
    }
    response.writeHead(200, { "content-type": "application/json" });
    if (request.url === "/oauth/identity") return response.end(JSON.stringify({ id: 42, username: "digger-test" }));
    if (request.url === "/releases/55") return response.end(JSON.stringify({ id: 55, title: "Test Pressing", artists: [], labels: [], formats: [], tracklist: [], extraartists: [] }));
    response.end(JSON.stringify({}));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());
  const environment = { DISCOGS_ROOT: `http://127.0.0.1:${fixture.address().port}`, DISCOGS_TOKEN_FILE: tokenFile };

  const firstPort = await startScout(t, environment);
  const crossSite = await fetch(`http://localhost:${firstPort}/api/settings/discogs`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.org" },
    body: JSON.stringify({ token })
  });
  assert.equal(crossSite.status, 403);
  const refused = await fetch(`http://localhost:${firstPort}/api/settings/discogs`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: `http://localhost:${firstPort}` },
    body: JSON.stringify({ token: "x".repeat(40) })
  });
  assert.equal(refused.status, 401);
  await assert.rejects(readFile(tokenFile, "utf8"), { code: "ENOENT" });
  const savedResponse = await fetch(`http://localhost:${firstPort}/api/settings/discogs`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: `http://localhost:${firstPort}` },
    body: JSON.stringify({ token })
  });
  const savedText = await savedResponse.text();
  assert.equal(savedResponse.status, 201, savedText);
  const saved = JSON.parse(savedText);
  assert.deepEqual(saved.account, { username: "digger-test", id: 42 });
  assert.equal(authorization, `Discogs token=${token}`);
  assert.equal((await readFile(tokenFile, "utf8")).trim(), token);
  assert.equal((await stat(tokenFile)).mode & 0o777, 0o600);
  const firstStatusText = await fetch(`http://localhost:${firstPort}/api/status`).then((response) => response.text());
  assert.doesNotMatch(firstStatusText, new RegExp(token));
  assert.equal(JSON.parse(firstStatusText).discogsCredentialSource, "local_file");

  const secondPort = await startScout(t, environment);
  const restartedStatus = await fetch(`http://localhost:${secondPort}/api/status`).then((response) => response.json());
  assert.equal(restartedStatus.discogsConfigured, true);
  assert.equal(restartedStatus.discogsCredentialSource, "local_file");
  const release = await fetch(`http://localhost:${secondPort}/api/music/discogs/release?id=55`);
  assert.equal(release.status, 200);
  assert.equal(authorization, `Discogs token=${token}`);

  const removed = await fetch(`http://localhost:${secondPort}/api/settings/discogs`, {
    method: "DELETE",
    headers: { "content-type": "application/json", origin: `http://localhost:${secondPort}` },
    body: "{}"
  });
  assert.equal(removed.status, 200);
  const finalStatus = await fetch(`http://localhost:${secondPort}/api/status`).then((response) => response.json());
  assert.equal(finalStatus.discogsConfigured, false);
  assert.equal(finalStatus.discogsCredentialSource, "none");
});

test("persiste les gestes et sert des voisins ListenBrainz traçables", async (t) => {
  const fixture = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify([{ recording_mbid: "f3bba4cd-8018-468b-902e-bc8f029593e5", recording_name: "Teardrop", artist_credit_name: "Massive Attack", release_name: "Mezzanine", score: 244 }]));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());
  const port = await startScout(t, { LISTENBRAINZ_ROOT: `http://127.0.0.1:${fixture.address().port}` });
  const discovery = await fetch(`http://localhost:${port}/api/music/discover?recording=8a49dba0-253a-4535-b87f-78bb035336ce`).then((response) => response.json());
  assert.equal(discovery.candidates[0].artist, "Massive Attack");
  assert.equal(discovery.candidates[0].release, "Mezzanine");
  assert.equal(discovery.candidates[0].sourceRank, 244);
  const saved = await fetch(`http://localhost:${port}/api/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "too_obvious", targetId: "f3bba4cd-8018-468b-902e-bc8f029593e5" }) });
  assert.equal(saved.status, 201);
  const graph = await fetch(`http://localhost:${port}/api/graph`).then((response) => response.json());
  assert.ok(Array.isArray(graph.events), JSON.stringify(graph));
  assert.equal(graph.events.length, 1);
});

test("résout un recording exact et conserve les candidats Discogs séparés", async (t) => {
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    response.writeHead(200, { "content-type": "application/json" });
    if (url.pathname === "/recording") {
      response.end(JSON.stringify({ recordings: [{
        id: "recording-dot",
        title: "Substance (Felix da Housecat Remix)",
        score: 83,
        "first-release-date": "2002-01-01",
        "artist-credit": [{ artist: { id: "artist-dot", name: "Dot Allison" } }],
        releases: [{ id: "release-dot", title: "Substance", date: "2002-01-01", country: "GB", status: "Official" }],
        isrcs: ["GBABC0200001"]
      }] }));
      return;
    }
    if (url.pathname === "/database/search") {
      response.end(JSON.stringify({ results: [{ id: 77, type: "release", title: "Dot Allison - Substance", year: 2002, label: ["Mantra"], format: ["12\""], catno: "MNT 77", uri: "/release/77" }] }));
      return;
    }
    response.end(JSON.stringify({}));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());
  const fixtureRoot = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: fixtureRoot, MUSICBRAINZ_INTERVAL: "0", DISCOGS_ROOT: fixtureRoot, DISCOGS_TOKEN: "fixture-token" });
  const response = await fetch(`http://localhost:${port}/api/music/recording?title=${encodeURIComponent("Dot Allison - Substance (Felix da Housecat Remix)")}&artist=Dot%20Allison`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, "resolved");
  assert.equal(data.resolved.id, "recording-dot");
  assert.equal(data.parsed.mix, "Felix da Housecat Remix");
  assert.equal(data.discogsCandidates[0].catalogueNumber, "MNT 77");
  assert.equal(data.discogsCandidates[0].baseCorroborates, true);
  assert.equal(data.discogsCandidates[0].corroborates, false);
  assert.equal(data.corroboration.musicbrainz, "resolved");
  assert.equal(data.corroboration.discogs, "base_catalogue_match");
});

test("HTTP hydrates Discogs tracks, preserves their graph credits and isolates duration decisions", async t => {
  const requests = [];
  const release = { id: 77, title: "Fixture EP", artists: [{ id: 30, name: "Dot Allison" }], labels: [{ id: 22, name: "Fixture Records", catno: "FIX77" }],
    tracklist: [{ position: "A1", title: "Substance (Felix da Housecat Remix)", duration: "6:00", extraartists: [{ id: 31, name: "Felix da Housecat", role: "Remix" }] }] };
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture"); requests.push(url.pathname);
    response.setHeader("content-type", "application/json");
    if (url.pathname === "/database/search") return response.end(JSON.stringify({ results: [{ id: 77, title: "Dot Allison - Fixture EP", type: "release" }] }));
    if (url.pathname === "/releases/77") return response.end(JSON.stringify(release));
    response.end(JSON.stringify({ recordings: [] }));
  });
  fixture.listen(0, "127.0.0.1"); await once(fixture, "listening"); t.after(() => fixture.close());
  const root = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", DISCOGS_ROOT: root, DISCOGS_TOKEN: "fixture-token" });
  const query = new URLSearchParams({ title: "Dot Allison - Substance (Felix da Housecat Remix)", artist: "Dot Allison", duration: "360" });
  const url = `http://localhost:${port}`;
  const resolved = await fetch(`${url}/api/music/recording?${query}`).then(r => r.json());
  assert.equal(resolved.status, "resolved_track");
  assert.equal(resolved.resolved, null);
  assert.equal(resolved.resolvedDiscogsTrack.id, "77:A1");
  assert.equal(resolved.discogsTrackCoverage.loaded, 1);
  assert.ok(requests.includes("/releases/77"));
  const stored = await fetch(`${url}/api/resolution`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video: { id: "fixturevideo", title: query.get("title") }, recording: resolved }) });
  assert.equal(stored.status, 200);
  const graph = await fetch(`${url}/api/graph`).then(r => r.json());
  assert.ok(Object.values(graph.edges || graph.graph?.edges || {}).some(edge => edge.kind === "remixed_by" && edge.to === "artist:discogs:31"));
  query.set("duration", "120");
  const other = await fetch(`${url}/api/music/recording?${query}`).then(r => r.json());
  assert.equal(other.resolvedDiscogsTrack, null, "A different duration must not reuse the previous accepted identity");
});

test("compare les catalogues par territoire sans déclarer une exclusivité", async (t) => {
  let spotifyMarket = "";
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    response.writeHead(200, { "content-type": "application/json" });
    if (url.pathname === "/v1/search") {
      spotifyMarket = url.searchParams.get("market") || "";
      return response.end(JSON.stringify({ tracks: { items: [{ name: "Track", artists: [{ name: "Artist" }], external_urls: { spotify: "https://open.spotify.com/track/1" }, available_markets: ["FR"] }] } }));
    }
    response.end(JSON.stringify({ data: [] }));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());
  const root = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, { APPLE_MUSIC_ROOT: root, SPOTIFY_ROOT: root, APPLE_MUSIC_TOKEN: "apple", SPOTIFY_TOKEN: "spotify" });
  const data = await fetch(`http://localhost:${port}/api/platform/availability?isrc=GBABC0200001&territory=FR&video=abcdefghijk`).then((response) => response.json());
  assert.equal(spotifyMarket, "FR");
  assert.equal(data.differential.status, "candidate");
  assert.deepEqual(data.differential.notFoundOn, ["applemusic"]);
  assert.equal(data.exclusivity.status, "not_established");
});

test("persiste et résume le graphe artiste, label, sortie et featuring", async (t) => {
  const port = await startScout(t);
  const saved = await fetch(`http://localhost:${port}/api/resolution`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      video: { id: "abcdefghijk", title: "A feat. B - Track" },
      identity: { id: "mbid:a", canonicalName: "A", externalIds: { musicbrainz: "a" }, claims: [] },
      recording: { resolved: { id: "recording-a", title: "Track", artistCredits: [{ id: "a", name: "A" }] } },
      context: {
        music: { artist: { id: "a" }, releases: [{ id: "release-group-a", title: "Album", labels: ["Label A"] }] },
        collaborations: [{ artist: "B", kind: "featuring" }],
        bandcamp: { url: "https://a.bandcamp.com/", source: "user_confirmed", status: "confirmed" }
      }
    })
  });
  assert.equal(saved.status, 200);
  const summary = await fetch(`http://localhost:${port}/api/graph/summary`).then((response) => response.json());
  assert.equal(summary.byType.label, 1);
  assert.equal(summary.byType.release_group, 1);
  assert.equal(summary.byRelation.featured_with, 1);
  assert.equal("score" in summary, false);
});

test("retourne les sorties récentes et leurs labels depuis MusicBrainz", async (t) => {
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    response.writeHead(200, { "content-type": "application/json" });
    if (url.pathname === "/artist") {
      response.end(JSON.stringify({ artists: [{ id: "artist-1", name: "Björk", score: 100, country: "IS", disambiguation: "Icelandic musician" }] }));
      return;
    }
    if (url.pathname === "/release-group") {
      response.end(JSON.stringify({
        "release-group-count": 2,
        "release-groups": [
          { id: "group-old", title: "Debut", "first-release-date": "1993-07-05", "primary-type": "Album" },
          { id: "group-new", title: "Cornucopia Live", "first-release-date": "2025-01-24", "primary-type": "Album", "secondary-types": ["Live"] }
        ]
      }));
      return;
    }
    const groupId = url.searchParams.get("release-group");
    response.end(JSON.stringify({
      "release-count": groupId === "group-new" ? 2 : 1,
      releases: groupId === "group-new" ? [
        { id: "release-new", "label-info": [{ label: { name: "OLI" } }] },
        { id: "release-new-2", "label-info": [{ label: { name: "Nonesuch" } }] }
      ] : [{ id: "release-old", "label-info": [{ label: { name: "One Little Independent" } }] }]
    }));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());

  const fixturePort = fixture.address().port;
  const port = await startScout(t, { MUSICBRAINZ_ROOT: `http://127.0.0.1:${fixturePort}`, MUSICBRAINZ_INTERVAL: "0" });
  const response = await fetch(`http://localhost:${port}/api/music/artist?name=${encodeURIComponent("Björk")}`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.artist.name, "Björk");
  assert.equal(data.releases.length, 2);
  assert.equal(data.releases[0].title, "Cornucopia Live");
  assert.deepEqual(data.releases[0].secondaryTypes, ["Live"]);

  const labelResponse = await fetch(`http://localhost:${port}/api/music/labels?releaseGroup=group-new`);
  assert.equal(labelResponse.status, 200);
  const labels = await labelResponse.json();
  assert.deepEqual(labels.labels, ["OLI", "Nonesuch"]);

  const invalid = await fetch(`http://localhost:${port}/api/music/artist?name=`);
  assert.equal(invalid.status, 400);
});

test("complète un artiste avec Wikidata, Wikipédia et Bandcamp", async (t) => {
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    const action = url.searchParams.get("action");
    response.writeHead(200, { "content-type": "application/json" });
    if (action === "wbsearchentities") {
      response.end(JSON.stringify({ search: [{ id: "Q1", label: "Dot Allison", description: "chanteuse et compositrice britannique" }] }));
      return;
    }
    const ids = url.searchParams.get("ids");
    if (ids === "Q2") {
      response.end(JSON.stringify({ entities: { Q2: { id: "Q2", labels: { en: { value: "Sonic Cathedral Recordings" } } } } }));
      return;
    }
    response.end(JSON.stringify({ entities: { Q1: {
      id: "Q1",
      labels: { en: { value: "Dot Allison" } },
      descriptions: { fr: { value: "chanteuse et compositrice britannique" } },
      sitelinks: { frwiki: { title: "Dot Allison" } },
      claims: {
        P264: [{ mainsnak: { datavalue: { value: { id: "Q2" } } } }],
        P3283: [{ mainsnak: { datavalue: { value: "dotallison" } } }],
        P434: [{ mainsnak: { datavalue: { value: "artist-mbid" } } }]
      }
    } } }));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());

  const fixturePort = fixture.address().port;
  const port = await startScout(t, { WIKIDATA_ROOT: `http://127.0.0.1:${fixturePort}/w/api.php` });
  const response = await fetch(`http://localhost:${port}/api/music/context?name=DOT%20Allison`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.name, "Dot Allison");
  assert.equal(data.wikipediaUrl, "https://fr.wikipedia.org/wiki/Dot_Allison");
  assert.equal(data.bandcampUrl, "https://dotallison.bandcamp.com/");
  assert.deepEqual(data.labels, ["Sonic Cathedral Recordings"]);
  assert.equal(data.musicBrainzId, "artist-mbid");
});

test("résout une identité sourcée avec Discogs sans fusionner les scores", async (t) => {
  let discogsAuthorization = "";
  const fixture = http.createServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    response.writeHead(200, { "content-type": "application/json" });
    if (url.pathname === "/artist") {
      response.end(JSON.stringify({ artists: [{ id: "mb-dot", name: "Dot Allison", score: 100, country: "GB" }] }));
      return;
    }
    if (url.pathname === "/release-group") {
      response.end(JSON.stringify({ "release-group-count": 0, "release-groups": [] }));
      return;
    }
    if (url.pathname === "/database/search") {
      discogsAuthorization = request.headers.authorization || "";
      response.end(JSON.stringify({ results: [{ id: 123, type: "artist", title: "Dot Allison", uri: "/artist/123-Dot-Allison", resource_url: "http://fixture/artists/123" }] }));
      return;
    }
    if (url.pathname === "/artists/123") {
      response.end(JSON.stringify({ id: 123, name: "Dot Allison", realname: "Dorothy Elliot Allison", profile: "British musician", uri: "https://www.discogs.com/artist/123-Dot-Allison", namevariations: ["D. Allison"], urls: ["https://dotallison.com"] }));
      return;
    }
    if (url.pathname === "/artists/123/releases") {
      response.end(JSON.stringify({ releases: [{ id: 77, title: "Consciousology", type: "master", main_release: 78, year: 2023, label: "Sonic Cathedral Recordings", format: "Album", role: "Main" }] }));
      return;
    }
    const action = url.searchParams.get("action");
    if (action === "wbsearchentities") {
      response.end(JSON.stringify({ search: [{ id: "Q-dot", label: "Dot Allison", description: "British musician" }] }));
      return;
    }
    response.end(JSON.stringify({ entities: { "Q-dot": {
      id: "Q-dot",
      labels: { en: { value: "Dot Allison" } },
      descriptions: { en: { value: "British musician" } },
      claims: {}
    } } }));
  });
  fixture.listen(0, "127.0.0.1");
  await once(fixture, "listening");
  t.after(() => fixture.close());

  const fixtureRoot = `http://127.0.0.1:${fixture.address().port}`;
  const port = await startScout(t, {
    MUSICBRAINZ_ROOT: fixtureRoot,
    MUSICBRAINZ_INTERVAL: "0",
    WIKIDATA_ROOT: `${fixtureRoot}/w/api.php`,
    DISCOGS_ROOT: fixtureRoot,
    DISCOGS_TOKEN: "fixture-token"
  });
  const status = await fetch(`http://localhost:${port}/api/status`).then((response) => response.json());
  assert.equal(status.discogsConfigured, true);

  const response = await fetch(`http://localhost:${port}/api/music/identity?name=Dot%20Allison`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.id, "mbid:mb-dot");
  assert.equal(data.canonicalName, "Dot Allison");
  assert.equal(data.agreement.status, "multi_source");
  assert.deepEqual(data.externalIds, { musicbrainz: "mb-dot", wikidata: "Q-dot" });
  assert.equal(data.discogs.status, "matched");
  assert.equal(data.sourceStates.discogs, "candidate");
  assert.equal(data.discogs.discogsUrl, "https://www.discogs.com/artist/123-Dot-Allison");
  assert.equal("score" in data, false);
  assert.equal(discogsAuthorization, "Discogs token=fixture-token");

  const confirmedResponse = await fetch(`http://localhost:${port}/api/music/identity?name=Dot%20Allison&discogsId=123`);
  assert.equal(confirmedResponse.status, 200);
  const confirmed = await confirmedResponse.json();
  assert.equal(confirmed.resolution.status, "confirmed_user", JSON.stringify(confirmed));
  assert.equal(confirmed.externalIds.discogs, "123");

  const profileResponse = await fetch(`http://localhost:${port}/api/music/discogs/artist?id=123`);
  assert.equal(profileResponse.status, 200);
  const profile = await profileResponse.json();
  assert.equal(profile.realName, "Dorothy Elliot Allison");
  assert.equal(profile.releases[0].title, "Consciousology");
  assert.equal(profile.releases[0].discogsUrl, "https://www.discogs.com/release/78");
});

test("ne sert jamais les fichiers situés hors du répertoire public", async (t) => {
  const port = await startScout(t);
  const root = `http://localhost:${port}`;

  const attempts = [
    "/..%2Fpackage.json",
    "/%2e%2e/package.json",
    "/..%2F.data%2Fscout-store.json",
    "/%2e%2e%2F.data%2Fdiscogs-token"
  ];

  for (const path of attempts) {
    const response = await fetch(root + path);
    assert.equal(
      response.status,
      404,
      `${path} ne doit jamais permettre de sortir de public/`
    );
  }
});
