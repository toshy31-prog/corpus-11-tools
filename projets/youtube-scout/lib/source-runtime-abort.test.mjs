import test from "node:test";
import assert from "node:assert/strict";
import { SourceRuntime } from "./source-runtime.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
const ok = () => new Response(JSON.stringify({ ok: true }));

test("queued cancellation rejects promptly and never starts transport", async () => {
  let release;
  const calls = [];
  const runtime = new SourceRuntime({ fetchImpl: async url => {
    calls.push(url);
    if (url === "first") await new Promise(resolve => { release = resolve; });
    return ok();
  } });
  runtime.register("a"); runtime.register("b");
  const first = runtime.request("a", "first");
  await tick();
  const controller = new AbortController();
  const queued = runtime.request("a", "cancelled", { signal: controller.signal });
  controller.abort();
  await assert.rejects(queued, { name: "AbortError" });
  await runtime.request("b", "independent");
  release(); await first; await tick();
  assert.deepEqual(calls, ["first", "independent"]);
});

test("inflight cancellation aborts transport, skips stale and releases queue", async () => {
  let transport;
  let calls = 0;
  const runtime = new SourceRuntime({ fetchImpl: async (_url, options) => {
    calls++;
    if (calls > 1) return ok();
    transport = options.signal;
    return new Promise(() => {});
  } });
  runtime.register("a");
  const controller = new AbortController();
  const pending = runtime.request("a", "first", { signal: controller.signal });
  await tick(); controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(transport.aborted, true);
  await runtime.request("a", "next");
  assert.equal(calls, 2);
  assert.equal(runtime.status().a.failures, 0);
});

for (const phase of ["interval", "backoff"]) {
  test(`cancellation interrupts ${phase} without further requests`, async () => {
    let calls = 0;
    let sleeping = false;
    const runtime = new SourceRuntime({ now: () => 1, sleep: () => {
      sleeping = true; return new Promise(() => {});
    }, fetchImpl: async () => { calls++; return new Response("", { status: 503 }); } });
    runtime.register("a", { minIntervalMs: phase === "interval" ? 100 : 0 });
    const controller = new AbortController();
    const pending = runtime.request("a", "x", { signal: controller.signal });
    await tick(); assert.equal(sleeping, true); controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    await tick(); assert.equal(calls, phase === "interval" ? 0 : 1);
  });
}

test("pre-aborted request does not consult cache or transport", async () => {
  const runtime = new SourceRuntime({ store: { cacheGet() { assert.fail("cache read"); } }, fetchImpl() { assert.fail("fetch"); } });
  runtime.register("a");
  await assert.rejects(runtime.request("a", "x", { signal: AbortSignal.abort() }), { name: "AbortError" });
});
