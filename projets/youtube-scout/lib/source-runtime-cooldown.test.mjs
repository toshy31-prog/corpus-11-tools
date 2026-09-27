import test from "node:test";
import assert from "node:assert/strict";
import { SourceRuntime } from "./source-runtime.mjs";

test("long Retry-After gates queued source requests, not other sources, then expires", async () => {
  let now = 1_000, calls = 0;
  const runtime = new SourceRuntime({ now: () => now, sleep: async () => { throw new Error("must not sleep"); }, fetchImpl: async () => {
    calls++;
    return calls === 1 ? new Response("{}", { status: 429, headers: { "retry-after": "120" } }) : new Response('{"ok":true}');
  } });
  runtime.register("a"); runtime.register("b");
  const result = await Promise.allSettled([runtime.request("a", "https://example.test/a"), runtime.request("a", "https://example.test/b")]);
  assert.deepEqual(result.map(item => item.status), ["rejected", "rejected"]);
  assert.equal(calls, 1);
  await runtime.request("b", "https://example.test/c");
  assert.equal(calls, 2);
  now += 119_000;
  await assert.rejects(runtime.request("a", "https://example.test/d"), /pause fournisseur/);
  assert.equal(calls, 2);
  now += 1_000;
  assert.equal((await runtime.request("a", "https://example.test/e")).data.ok, true);
  assert.equal(calls, 3);
});

test("HTTP-date cooldown uses injected clock and stale fallback stays labelled", async () => {
  const now = Date.UTC(2026, 8, 27), entry = { value: { cached: true }, savedAt: now - 2000, expiresAt: now - 1000 };
  let calls = 0;
  const runtime = new SourceRuntime({ now: () => now, store: { cacheGet: (_name, _key, options) => options?.allowStale ? entry : null }, fetchImpl: async () => {
    calls++;
    return new Response("{}", { status: 503, headers: { "retry-after": new Date(now + 120_000).toUTCString() } });
  } });
  runtime.register("a");
  assert.equal((await runtime.request("a", "https://example.test/a")).provenance.cache, "stale");
  const blocked = await runtime.request("a", "https://example.test/b");
  assert.equal(blocked.provenance.cache, "stale");
  assert.match(blocked.provenance.warning, /pause fournisseur/);
  assert.equal(calls, 1);
});
