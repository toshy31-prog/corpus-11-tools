import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PersistentStore } from "./persistent-store.mjs";
import { SourceRuntime } from "./source-runtime.mjs";
import { catalogueCandidates } from "./catalogue-graph.mjs";
import { graphFromResolution } from "./graph.mjs";
import { augmentExplorationGraph } from "./exploration.mjs";

async function storeFor(t) {
  const directory = await mkdtemp(join(tmpdir(), "scout-adversarial-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return new PersistentStore(join(directory, "store.json")).load();
}

test("distinct exact IDs and their references survive persistence without lossy merging", async t => {
  const store = await storeFor(t);
  const ids = ["artist:fixture:a/b", "artist:fixture:a?b", "artist:fixture:a_b", `artist:${"a".repeat(245)}1`, `artist:${"a".repeat(245)}2`];
  await store.ingestGraph({ entities: ids.map(id => ({ id, type: "artist" })) });
  assert.deepEqual(Object.keys(store.snapshot().entities), ids);
  await store.putEdge({ from: ids[0], to: ids[1], kind: "alias_of", status: "observed" });
  const reloaded = await new PersistentStore(store.pathname).load();
  for (const edge of Object.values(reloaded.snapshot().edges)) {
    assert.ok(reloaded.snapshot().entities[edge.from]);
    assert.ok(reloaded.snapshot().entities[edge.to]);
  }
});

test("malformed evidence cannot partially insert a graph batch", async t => {
  const store = await storeFor(t);
  const edge = { id: "decision", from: "v", to: "a", kind: "probable_artist", status: "confirmed_user", evidence: ["user_confirmation"] };
  await store.ingestGraph({ edges: [edge] });
  const before = store.snapshot();
  await assert.rejects(store.ingestGraph({ entities: [{ id: "new", type: "artist" }], edges: [{ ...edge, status: "observed", evidence: {} }] }));
  assert.deepEqual(store.snapshot(), before);
});

test("single-edge updates preserve explicit rejection just like batch enrichment", async t => {
  const store = await storeFor(t);
  const edge = { from: "v", to: "a", kind: "probable_artist" };
  await store.ingestGraph({ edges: [{ ...edge, status: "rejected_user", evidence: ["user_rejection"] }] });
  await store.putEdge({ ...edge, status: "confirmed_cross_id", evidence: ["catalogue"] });
  assert.equal(Object.values(store.snapshot().edges)[0].status, "rejected_user");
});

test("changing a legacy edge key does not bypass a rejection of the same relation", async t => {
  const store = await storeFor(t);
  const edge = { from: "video/a", to: "artist/b", kind: "probable_artist" };
  await store.ingestGraph({ edges: [{ ...edge, id: "legacy_key", status: "rejected_user", evidence: ["user_rejection"] }] });
  await store.ingestGraph({ edges: [{ ...edge, status: "confirmed_cross_id", evidence: ["catalogue"] }] });
  assert.ok(Object.values(store.snapshot().edges).every(edge => edge.status === "rejected_user"));
});

test("a reused logical cache key cannot reuse another resource or provider origin", async t => {
  const store = await storeFor(t);
  let calls = 0;
  const runtime = new SourceRuntime({ store, fetchImpl: async url => { calls++; return new Response(JSON.stringify({ resource: String(url) })); } });
  runtime.register("fixture", { retries: 0 });
  for (const url of ["https://first.test/artist/1", "https://first.test/artist/2", "https://second.test/artist/2"]) {
    assert.equal((await runtime.request("fixture", url, { cacheKey: "same" })).data.resource, url);
  }
  assert.equal(calls, 3);
});

test("disabled provider does not execute a previously queued request or resurrect its status", async () => {
  let release, entered;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const runtime = new SourceRuntime({ fetchImpl: async () => { calls++; entered(); await gate; return new Response('{}'); } });
  runtime.register("fixture", { retries: 0 });
  const first = runtime.request("fixture", "https://fixture.test/1");
  await started;
  const queued = runtime.request("fixture", "https://fixture.test/2");
  const rejected = assert.rejects(queued, /configur|chang|interromp/i);
  runtime.setConfigured("fixture", false);
  release();
  await Promise.allSettled([first]);
  await rejected;
  assert.equal(calls, 1);
  assert.equal(runtime.status().fixture.status, "not_configured");
});

test("a shared country alone is not a route through accumulated unrelated artists", () => {
  const entities = [
    { id: "a", type: "artist" }, { id: "b", type: "artist" },
    { id: "fr", type: "territory", name: "France" },
    { id: "ra", type: "release", title: "Source" }, { id: "rb", type: "release", title: "Unrelated" }
  ];
  const edges = [["a", "fr", "associated_scene"], ["b", "fr", "associated_scene"], ["a", "ra", "primary_artist"], ["b", "rb", "primary_artist"]].map(([from, to, kind]) => ({ from, to, kind, status: "observed" }));
  assert.deepEqual(catalogueCandidates({ entities, edges }, "a", "scene"), []);
  entities.push({ id: "label", type: "label", name: "Actual shared label" });
  edges.push(...["ra", "rb"].map(from => ({ from, to: "label", kind: "issued_by", status: "observed" })));
  const [related] = catalogueCandidates({ entities, edges }, "a", "scene");
  assert.equal(related.id, "rb");
  assert.equal(related.relatedVia, "label");
  assert.equal(related.territoryContext.label, "France");
});

test("explicit documented scenes remain usable without a shared label", () => {
  const entities = [{ id: "a", type: "artist" }, { id: "b", type: "artist" }, { id: "scene", type: "scene", name: "Documented collective" }, { id: "r", type: "release", title: "Discovery" }];
  const edges = [["a", "scene", "associated_scene"], ["b", "scene", "associated_scene"], ["b", "r", "primary_artist"]].map(([from, to, kind]) => ({ from, to, kind, status: "observed" }));
  assert.deepEqual(catalogueCandidates({ entities, edges }, "a", "scene").map(item => item.id), ["r"]);
});

test("homonymous YouTube channels cannot join separate departures, including legacy graphs", () => {
  const videos = [
    { id: "first", title: "A", channelTitle: "Same name", channelId: `UC${"a".repeat(22)}` },
    { id: "second", title: "B", channelTitle: "Same name", channelId: `UC${"b".repeat(22)}` }
  ];
  const deltas = videos.map(video => graphFromResolution(video));
  const raw = { entities: deltas.flatMap(delta => delta.entities), edges: deltas.flatMap(delta => delta.edges) };
  assert.deepEqual(catalogueCandidates(raw, "video:youtube:first", "curator"), []);
  assert.deepEqual(catalogueCandidates(augmentExplorationGraph({}, videos.map(({ channelId, ...video }) => video)), "video:youtube:first", "curator"), []);
  const legacy = { entities: [...raw.entities, { id: "channel:youtube-name:same-name", type: "channel", name: "Same name" }], edges: [...raw.edges, ...videos.map(video => ({ from: `video:youtube:${video.id}`, to: "channel:youtube-name:same-name", kind: "published_by", status: "observed" }))] };
  assert.deepEqual(catalogueCandidates(legacy, "video:youtube:first", "curator"), []);
  videos[1].channelId = videos[0].channelId;
  assert.deepEqual(catalogueCandidates(augmentExplorationGraph({}, videos), "video:youtube:first", "curator").map(item => item.id), ["video:youtube:second"]);
});

test("expired data is never used to disguise an authentication refusal", async t => {
  const store = await storeFor(t);
  await store.cacheSet("fixture", "key", { old: true }, -1, { url: "https://fixture.test/item" });
  const runtime = new SourceRuntime({ store, fetchImpl: async () => new Response('{}', { status: 401 }) });
  runtime.register("fixture", { retries: 0 });
  await assert.rejects(runtime.request("fixture", "https://fixture.test/item", { cacheKey: "key" }), /401/);
});

test("an excessive Retry-After cannot occupy the source queue for hours", async () => {
  const sleeps = [];
  const runtime = new SourceRuntime({ fetchImpl: async () => new Response('{}', { status: 429, headers: { "retry-after": "9999999" } }), sleep: async ms => sleeps.push(ms) });
  runtime.register("fixture", { retries: 2 });
  await assert.rejects(runtime.request("fixture", "https://fixture.test/item"), /429/);
  assert.deepEqual(sleeps, []);
});
