import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function server(t, configured) {
  const folder = await mkdtemp(join(tmpdir(), "scout-google-http-"));
  const probe = http.createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url), stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(folder, "store.json"), DISCOGS_TOKEN: "", DISCOGS_TOKEN_FILE: join(folder, "discogs"),
      SCOUT_GOOGLE_CLIENT_ID: configured ? "fixture.apps.googleusercontent.com" : "", SCOUT_GOOGLE_CLIENT_SECRET: configured ? "SECRET-fixture-client" : "",
      SCOUT_GOOGLE_ORIGIN: `http://localhost:${port}`, SCOUT_GOOGLE_TOKEN_FILE: join(folder, "google", "grant.json") } });
  t.after(async () => { child.kill("SIGTERM"); await once(child, "exit").catch(() => {}); await rm(folder, { recursive: true, force: true }); });
  let timeout;
  try { await Promise.race([once(child.stdout, "data"), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Isolated Scout startup timed out")), 5000); })]); }
  finally { clearTimeout(timeout); }
  const base = `http://localhost:${port}`;
  const headers = { "content-type": "application/json", "X-Scout-Local": "1", origin: base };
  return { base, headers };
}

test("renewable OAuth HTTP is off by default and protected even when disabled", async t => {
  const { base, headers } = await server(t, false);
  assert.equal((await fetch(`${base}/api/google-oauth/status`)).status, 403);
  const result = await fetch(`${base}/api/google-oauth/status`, { headers });
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal((await result.json()).configured, false);
  assert.equal((await fetch(`${base}/api/google-oauth/start`, { method: "POST", headers, body: "{}" })).status, 409);
});

test("OAuth HTTP requires origin/header, returns no secrets, uses a bound callback and local forget", async t => {
  const { base, headers } = await server(t, true);
  for (const invalid of [{ ...headers, origin: "https://evil.test" }, { "content-type": "application/json", origin: base }, { ...headers, "sec-fetch-site": "same-site" }]) {
    assert.equal((await fetch(`${base}/api/google-oauth/start`, { method: "POST", headers: invalid, body: "{}" })).status, 403);
  }
  const status = await fetch(`${base}/api/google-oauth/status`, { headers }).then(r => r.json());
  assert.equal(status.configured, true); assert.equal(status.renewable, false);
  assert.ok(!JSON.stringify(status).includes("SECRET"));
  const start = await fetch(`${base}/api/google-oauth/start`, { method: "POST", headers, body: "{}" });
  assert.equal(start.status, 200); assert.match(start.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
  const { authorizationUrl } = await start.json(); assert.ok(!authorizationUrl.includes("SECRET"));
  const authorization = new URL(authorizationUrl);
  assert.equal(authorization.searchParams.get("redirect_uri"), `${base}/oauth/google/callback`);
  const callback = await fetch(`${base}/oauth/google/callback?code=SECRET-code&state=wrong`, { redirect: "manual" });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("location"), `${base}/?google_oauth=reconnect#source-panel`);
  assert.ok(!(await callback.text()).includes("SECRET"));
  assert.equal((await fetch(`${base}/api/google-oauth/token`, { method: "POST", headers, body: "{}" })).status, 401);
  const removed = await fetch(`${base}/api/google-oauth/disconnect`, { method: "POST", headers, body: "{}" });
  assert.equal(removed.status, 200); assert.equal((await removed.json()).renewable, false);
});
