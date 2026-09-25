import test from "node:test";
import assert from "node:assert/strict";
import { ephemeralClient } from "./ephemeral-client.mjs";

test("an old server gives an actionable error and a failed opening can be retried", async () => {
  let attempts = 0;
  const client = ephemeralClient(async url => url.endsWith("/context")
    ? ++attempts === 1 ? new Response("Not found", { status: 404 }) : Response.json({ token: "recovered" })
    : Response.json({ ok: true }), "http://localhost:4181");
  await assert.rejects(client.fetch("/api/graph"), /redémarrage.*bibliothèque/);
  assert.deepEqual(await (await client.fetch("/api/graph")).json(), { ok: true });
  assert.equal(attempts, 2);
});

test("successful HTTP responses without a token cannot masquerade as a working server", async () => {
  const client = ephemeralClient(async () => Response.json({}), "http://localhost:4181");
  await assert.rejects(client.start(), /incompatible/);
});

test("client does not persist tokens, separates departures and rejects late responses", async () => {
  let count = 0, release; const calls = [];
  const fetcher = async (url, options = {}) => {
    calls.push([url, options]);
    if (url.endsWith("/context")) return Response.json(options.method === "POST" ? { token: `t${++count}` } : {});
    if (url.endsWith("/slow")) await new Promise(resolve => { release = resolve; });
    return Response.json({ token: options.headers.get("x-scout-exploration") });
  };
  const client = ephemeralClient(fetcher, "http://localhost:4181");
  assert.equal(await client.start("a"), "t1");
  const slow = client.fetch("/api/slow");
  await Promise.resolve(); await Promise.resolve();
  await client.start("b"); release();
  await assert.rejects(slow, { name: "AbortError" });
  assert.deepEqual(await (await client.fetch("/api/graph")).json(), { token: "t2" });
  assert.ok(calls.some(([, options]) => options.method === "DELETE" && options.headers["x-scout-exploration"] === "t1"));
  const reload = ephemeralClient(fetcher, "http://localhost:4181");
  assert.deepEqual(await (await reload.fetch("/api/graph")).json(), { token: "t3" });
  await client.close(); await reload.close();
});

test("late body decoding is rejected even after headers arrived", async () => {
  let token = 0;
  const client = ephemeralClient(async url => Response.json(url.endsWith("/context") ? { token: String(++token) } : { old: true }), "http://localhost:4181");
  await client.start("a"); const response = await client.fetch("/api/graph");
  await client.start("b"); await assert.rejects(response.json(), { name: "AbortError" });
});
