import test from "node:test";
import assert from "node:assert/strict";
import { SourceRuntime } from "./source-runtime.mjs";
import { PersistentStore } from "./persistent-store.mjs";

test("cache-only probes preserve URL scoping, expiry and source configuration", async () => {
  let now = 100, calls = 0;
  const store = new PersistentStore("unused", { now: () => now });
  store.persist = async () => {};
  const runtime = new SourceRuntime({ store, now: () => now, fetchImpl: async () => { calls++; return response(200, { title: "Cached" }); } });
  runtime.register("catalogue");
  const url = "https://example.test/item";
  await runtime.request("catalogue", url, { cacheKey: "logical", ttlMs: 100 });
  assert.equal(runtime.cached("catalogue", url, "logical").value.title, "Cached");
  assert.equal(runtime.cached("catalogue", `${url}/different`, "logical"), null);
  runtime.setConfigured("catalogue", false);
  assert.equal(runtime.cached("catalogue", url, "logical"), null);
  runtime.setConfigured("catalogue", true);
  now = 201;
  assert.equal(runtime.cached("catalogue", url, "logical"), null);
  assert.equal(calls, 1);
});

function response(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

test("une erreur d’authentification n’est pas répétée comme une panne temporaire", async () => {
  let calls = 0;
  const runtime = new SourceRuntime({ fetchImpl: async () => { calls++; return response(401, {}); } });
  runtime.register("catalogue", { retries: 3 });
  await assert.rejects(runtime.request("catalogue", "https://example.test/item"), /401/);
  assert.equal(calls, 1);
});

test("la provenance d’une URL reste une chaîne sérialisable dans le cache", async () => {
  let metadata;
  const store = { cacheGet: () => null, cacheSet: async (_source, _key, _data, _ttl, value) => { metadata = value; } };
  const runtime = new SourceRuntime({ store, fetchImpl: async () => response(200, { title: "Release" }) });
  runtime.register("discogs");
  await runtime.request("discogs", new URL("https://example.test/artists/123"));
  assert.equal(metadata.url, "https://example.test/artists/123");
  assert.deepEqual(structuredClone(metadata), metadata);
});

test("deux lectures identiques en attente réutilisent le cache rempli par la première", async () => {
  let calls = 0; const cache = new Map();
  const store = { cacheGet: (source, key) => cache.get(`${source}:${key}`), cacheSet: async (source, key, value) => cache.set(`${source}:${key}`, { value, savedAt: Date.now() }) };
  const runtime = new SourceRuntime({ store, fetchImpl: async () => { calls++; return response(200, { title: "Known" }); } });
  runtime.register("catalogue");
  const results = await Promise.all([runtime.request("catalogue", "https://example.test/item"), runtime.request("catalogue", "https://example.test/item")]);
  assert.equal(calls, 1);
  assert.equal(results[1].provenance.cache, "fresh");
});

test("respecte Retry-After puis réussit sans perdre la provenance", async () => {
  const sleeps = [];
  const replies = [response(429, {}, { "retry-after": "2" }), response(200, { ok: true })];
  const runtime = new SourceRuntime({ fetchImpl: async () => replies.shift(), sleep: async (milliseconds) => sleeps.push(milliseconds) });
  runtime.register("catalogue", { retries: 1, minIntervalMs: 0 });
  const result = await runtime.request("catalogue", "https://example.test/item");
  assert.equal(result.data.ok, true);
  assert.equal(result.provenance.cache, "network");
  assert.deepEqual(sleeps, [2000]);
  assert.equal(runtime.status().catalogue.successes, 1);
});

test("rend une copie périmée explicitement lorsque la source tombe", async () => {
  const entry = { value: { title: "copie" }, savedAt: 10, expiresAt: 20 };
  const store = { cacheGet: (_source, _key, options) => options?.allowStale ? entry : null };
  const runtime = new SourceRuntime({ store, now: () => 100, fetchImpl: async () => response(503, {}), sleep: async () => {} });
  runtime.register("catalogue", { retries: 0 });
  const result = await runtime.request("catalogue", "https://example.test/item", { staleMs: 1000 });
  assert.equal(result.data.title, "copie");
  assert.equal(result.provenance.cache, "stale");
  assert.match(result.provenance.warning, /503/);
});

test("sérialise deux requêtes d’une même source", async () => {
  let active = 0;
  let maximum = 0;
  const runtime = new SourceRuntime({ fetchImpl: async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return response(200, { ok: true });
  } });
  runtime.register("catalogue", { minIntervalMs: 0 });
  await Promise.all([runtime.request("catalogue", "https://example.test/a"), runtime.request("catalogue", "https://example.test/b")]);
  assert.equal(maximum, 1);
});
