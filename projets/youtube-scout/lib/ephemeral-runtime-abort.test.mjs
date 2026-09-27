import test from "node:test";
import assert from "node:assert/strict";
import { PersistentStore } from "./persistent-store.mjs";
import { EphemeralExplorations } from "./ephemeral-exploration.mjs";
import { SourceRuntime } from "./source-runtime.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
for (const mode of ["close", "expire"]) {
  test(`${mode} aborts inflight and queued session work but preserves another session`, async () => {
    let now = 0;
    const personal = new PersistentStore(null); personal.loaded = true;
    const digs = new EphemeralExplorations({ personal, now: () => now, ttl: 100 });
    const a = await digs.start(); const b = await digs.start();
    const run = (token, task) => digs.context.run(digs.get(token), task);
    const calls = []; let transport;
    const runtime = new SourceRuntime({ store: digs.store, fetchImpl: async (url, options) => {
      calls.push(url);
      if (url === "blocked") { transport = options.signal; return new Promise(() => {}); }
      return new Response('{"ok":true}');
    } });
    runtime.register("provider");
    const caller = new AbortController();
    const inflight = run(a, () => runtime.request("provider", "blocked", { signal: caller.signal }));
    const queued = run(a, () => runtime.request("provider", "never"));
    await tick();
    if (mode === "close") digs.close(a);
    else { now = 101; assert.throws(() => digs.get(a), { httpStatus: 410 }); }
    await assert.rejects(inflight, { httpStatus: 410 });
    await assert.rejects(queued, { httpStatus: 410 });
    assert.equal(runtime.status().provider.status, "idle");
    assert.equal(runtime.status().provider.failures, 0);
    assert.equal(transport.aborted, true);
    assert.equal(caller.signal.aborted, false);
    now = 0; // Keep session B valid under the injected test clock.
    const result = await run(b, () => runtime.request("provider", "healthy"));
    assert.equal(result.data.ok, true);
    assert.deepEqual(calls, ["blocked", "healthy"]);
    assert.equal(run(b, () => digs.store.signal.aborted), false);
  });
}

test("caller cancellation does not close its session or cancel its next request", async () => {
  const personal = new PersistentStore(null); personal.loaded = true;
  const digs = new EphemeralExplorations({ personal });
  const token = await digs.start();
  const session = digs.get(token);
  let calls = 0;
  const runtime = new SourceRuntime({ store: digs.store, fetchImpl: async () => {
    calls++; return calls === 1 ? new Promise(() => {}) : new Response("{}");
  } });
  runtime.register("provider");
  const caller = new AbortController();
  const pending = digs.context.run(session, () => runtime.request("provider", "first", { signal: caller.signal }));
  await tick(); caller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(session.controller.signal.aborted, false);
  await digs.context.run(session, () => runtime.request("provider", "second"));
  assert.equal(calls, 2);
});
