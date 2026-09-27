import test from "node:test";
import assert from "node:assert/strict";
import { SourceRuntime } from "./source-runtime.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
test("disconnect cancels active transport and queued work; reconnect cannot revive old revision", async () => {
  let transport; const calls = [];
  const runtime = new SourceRuntime({ fetchImpl: async (url, options) => {
    calls.push(url);
    if (url === "old") {
      transport = options.signal;
      return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true }));
    }
    return new Response("{}");
  } });
  runtime.register("a", { timeoutMs: 50, retries: 0 }); runtime.register("b");
  const old = runtime.request("a", "old");
  const queued = runtime.request("a", "queued");
  // Attach handlers before the synchronous cancellation to avoid test noise.
  const oldRejected = assert.rejects(old, /configuration changée/);
  const queuedRejected = assert.rejects(queued, /configuration changée/);
  await tick(); runtime.setConfigured("a", false);
  assert.equal(transport.aborted, true, "disconnect must abort transport immediately, not just discard its result");
  runtime.setConfigured("a", true);
  await Promise.all([oldRejected, queuedRejected]);
  await runtime.request("b", "independent");
  await runtime.request("a", "new");
  assert.deepEqual(calls, ["old", "independent", "new"]);
  assert.equal(runtime.status().a.failures, 0);
});

for (const phase of ["interval", "backoff"]) {
  test(`configuration revision interrupts ${phase} without another transport`, async () => {
    let sleeps = 0, calls = 0;
    const runtime = new SourceRuntime({ now: () => 1,
      sleep: () => { sleeps++; return new Promise(() => {}); },
      fetchImpl: async () => { calls++; return new Response("", { status: 503 }); } });
    runtime.register("a", { minIntervalMs: phase === "interval" ? 100 : 0 });
    const pending = runtime.request("a", "old");
    const rejected = assert.rejects(pending, /configuration changée/);
    await tick(); assert.equal(sleeps, 1);
    runtime.setConfigured("a", false);
    await rejected; await tick();
    assert.equal(calls, phase === "interval" ? 0 : 1);
    assert.equal(runtime.status().a.status, "not_configured");
    assert.equal(runtime.status().a.failures, 0);
  });
}
