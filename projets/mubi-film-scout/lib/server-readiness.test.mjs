import test from "node:test";
import assert from "node:assert/strict";
import { serverReady, SERVICE_ID } from "./server-readiness.mjs";

test("launcher rejects an older version or another checkout without following redirects", async () => {
  const status = {service: SERVICE_ID, version: "0.16.3", instanceId: "local-copy"};
  const fetchImpl = async () => ({ok: true, json: async () => status});
  assert.equal(await serverReady("http://localhost:4180", fetchImpl, {version: "0.16.3", instanceId: "local-copy"}), true);
  await assert.rejects(serverReady("http://localhost:4180", fetchImpl, {version: "0.16.2"}), /ancienne version/);
  await assert.rejects(serverReady("http://localhost:4180", fetchImpl, {instanceId: "another-copy"}), /autre copie/);
});

test("recognizes the MUBI status endpoint", async () => {
  assert.equal(await serverReady("http://127.0.0.1:4180", async (url, options) => {
    assert.equal(url, "http://127.0.0.1:4180/api/status");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ service: SERVICE_ID }) };
  }), true);
});

test("a connection failure permits a server startup attempt", async () => {
  assert.equal(await serverReady("http://127.0.0.1:4180", async () => { throw new Error("refused"); }), false);
});

test("foreign, old, failed and unreadable services are not declared ready", async () => {
  for (const response of [
    { ok: true, json: async () => ({ service: "other-app" }) },
    { ok: true, json: async () => ({ connections: {} }) },
    { ok: false, json: async () => ({ service: SERVICE_ID }) },
    { ok: true, json: async () => null },
    { ok: true, json: async () => { throw new SyntaxError("HTML"); } },
  ]) {
    await assert.rejects(serverReady("http://127.0.0.1:4180", async () => response), /pas identifié/);
  }
});
