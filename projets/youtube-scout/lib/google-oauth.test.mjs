import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GoogleOAuthSession, GoogleGrantFile, googleOAuthConfiguration, YOUTUBE_READONLY_SCOPE } from "./google-oauth.mjs";

const config = { configured: true, clientId: "fixture.apps.googleusercontent.com", clientSecret: "SECRET-client-fixture", origin: "http://localhost:4181", tokenFile: "/unused" };
const grant = { version: 1, clientId: config.clientId, refreshToken: "SECRET-refresh-fixture" };
const access = { access_token: "SECRET-access-fixture", token_type: "Bearer", expires_in: 3600, scope: YOUTUBE_READONLY_SCOPE };
const response = (data, ok = true) => ({ ok, json: async () => data });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function memoryFile(initial = null) {
  let value = initial;
  return { load: async () => value, save: async next => { value = next; }, remove: async () => { value = null; }, value: () => value };
}
function flow(session) {
  const started = session.start(), authorization = new URL(started.authorizationUrl);
  const callback = new URL("http://localhost:4181/oauth/google/callback");
  callback.searchParams.set("state", authorization.searchParams.get("state")); callback.searchParams.set("code", "SECRET-code-fixture");
  return { started, authorization, callback, cookie: started.cookie.split(";")[0] };
}

test("OAuth is disabled without both configured secrets and does not read the grant file", async () => {
  const disabled = googleOAuthConfiguration({}, 4181);
  let reads = 0;
  const session = await new GoogleOAuthSession({ config: disabled, grantFile: { load() { reads++; throw new Error(); } } }).load();
  assert.equal(reads, 0); assert.equal(session.status().configured, false);
  assert.throws(() => session.start(), { code: "not_configured" });
  assert.throws(() => googleOAuthConfiguration({ SCOUT_GOOGLE_CLIENT_ID: config.clientId, SCOUT_GOOGLE_CLIENT_SECRET: config.clientSecret, SCOUT_GOOGLE_ORIGIN: "https://external.test" }), /Configuration/);
  assert.throws(() => googleOAuthConfiguration({ SCOUT_GOOGLE_CLIENT_ID: config.clientId, SCOUT_GOOGLE_CLIENT_SECRET: config.clientSecret,
    SCOUT_GOOGLE_TOKEN_FILE: new URL("../public/accidental-secret.json", import.meta.url).pathname }), /Configuration/);
});

test("credential endpoints require exact host, same-origin JSON and non-simple request header", () => {
  const session = new GoogleOAuthSession({ config });
  const headers = { host: "localhost:4181", origin: config.origin, "x-scout-local": "1", "content-type": "application/json", "sec-fetch-site": "same-origin" };
  session.assertRequest({ method: "POST", headers });
  session.assertRequest({ method: "GET", headers: { host: headers.host, "x-scout-local": "1" } });
  for (const patch of [{ host: "evil.test:4181" }, { origin: "http://localhost:9999" }, { origin: undefined }, { "x-scout-local": undefined }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "cross-site" }]) {
    assert.throws(() => session.assertRequest({ method: "POST", headers: { ...headers, ...patch } }), { httpStatus: 403 });
  }
  assert.throws(() => session.assertRequest({ method: "POST", headers: { ...headers, "content-type": "text/plain" } }), { httpStatus: 415 });
});

test("authorization binds state to HttpOnly cookie and PKCE; only refresh grant is persisted", async () => {
  const file = memoryFile(); let sent;
  const session = new GoogleOAuthSession({ config, grantFile: file, now: () => 10_000,
    fetchImpl: async (url, options) => { sent = { url, options }; return response({ ...access, refresh_token: grant.refreshToken }); } });
  const login = flow(session);
  assert.equal(login.authorization.searchParams.get("scope"), YOUTUBE_READONLY_SCOPE);
  assert.equal(login.authorization.searchParams.get("access_type"), "offline");
  assert.match(login.started.cookie, /HttpOnly; SameSite=Lax/);
  await assert.rejects(session.complete(login.callback, "scout_google_oauth=wrong"), { code: "state" });
  await session.complete(login.callback, login.cookie);
  assert.equal(sent.url, "https://oauth2.googleapis.com/token");
  assert.equal(sent.options.redirect, "error");
  assert.equal(createHash("sha256").update(sent.options.body.get("code_verifier")).digest("base64url"), login.authorization.searchParams.get("code_challenge"));
  assert.deepEqual(file.value(), grant);
  const exposed = JSON.stringify(session.status());
  for (const secret of [grant.refreshToken, access.access_token, config.clientSecret, "SECRET-code-fixture"]) assert.ok(!exposed.includes(secret));
  assert.equal((await session.token()).accessToken, access.access_token);
  await assert.rejects(session.complete(login.callback, login.cookie), { code: "state" });
});

test("expired state, denied consent and absent refresh grant preserve prior account", async () => {
  let time = 0;
  const file = memoryFile(grant), session = await new GoogleOAuthSession({ config, grantFile: file, now: () => time, fetchImpl: async () => response(access) }).load();
  const expired = flow(session); time = 600_001;
  await assert.rejects(session.complete(expired.callback, expired.cookie), { code: "state" });
  const denied = flow(session); denied.callback.searchParams.set("error", "SECRET-provider-error");
  await assert.rejects(session.complete(denied.callback, denied.cookie), { code: "denied" });
  const noRefresh = flow(session);
  await assert.rejects(session.complete(noRefresh.callback, noRefresh.cookie), { code: "missing_refresh" });
  assert.deepEqual(file.value(), grant);
});

test("simultaneous refreshes are singleflight; cached access is reused until near expiry", async () => {
  const gate = deferred(); let calls = 0, time = 0;
  const session = await new GoogleOAuthSession({ config, grantFile: memoryFile(grant), now: () => time,
    fetchImpl: async () => { calls++; return gate.promise; } }).load();
  const first = session.token(), second = session.token({ force: true });
  gate.resolve(response(access));
  assert.deepEqual(await first, await second); assert.equal(calls, 1);
  time = 3000_000; await session.token(); assert.equal(calls, 1);
  time = 3590_000; await session.token(); assert.equal(calls, 2);
});

test("network failures retain refresh grant; invalid_grant requires reconnect and clears it", async () => {
  const file = memoryFile(grant); let revoked = false;
  const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async () => {
    if (!revoked) throw new Error("SECRET-network-error");
    return response({ error: "invalid_grant", error_description: "SECRET-provider-description" }, false);
  } }).load();
  await assert.rejects(session.token(), error => !error.message.includes("SECRET") && error.httpStatus === 503);
  assert.deepEqual(file.value(), grant); assert.equal(session.status().state, "unavailable");
  revoked = true; await assert.rejects(session.token(), { code: "reconnect_required" });
  assert.equal(file.value(), null); assert.equal(session.status().renewable, false);
});

test("wrong scopes and malformed access responses are never delivered", async () => {
  for (const patch of [{ scope: "https://www.googleapis.com/auth/drive" }, { token_type: "MAC" }, { access_token: "" }, { expires_in: "NaN" }, { expires_in: 0 }]) {
    const file = memoryFile(grant);
    const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async () => response({ ...access, ...patch }) }).load();
    await assert.rejects(session.token()); assert.equal(session.status().connected, false); assert.deepEqual(file.value(), grant);
  }
});

test("disconnect wins against late authorization, late refresh and rotation writes", async () => {
  for (const kind of ["authorization", "refresh"]) {
    const file = memoryFile(kind === "refresh" ? grant : null), gate = deferred();
    const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: () => gate.promise }).load();
    const login = kind === "authorization" ? flow(session) : null;
    const pending = kind === "authorization" ? session.complete(login.callback, login.cookie) : session.token();
    const assertion = assert.rejects(pending, { code: "cancelled" });
    await session.disconnect();
    gate.resolve(response({ ...access, refresh_token: "SECRET-new-refresh" })); await assertion;
    assert.equal(file.value(), null); assert.equal(session.status().connected, false);
  }
  const entered = deferred(), release = deferred(), file = memoryFile();
  const save = file.save;
  file.save = async value => { entered.resolve(); await release.promise; await save(value); };
  const session = new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async () => response({ ...access, refresh_token: grant.refreshToken }) });
  const login = flow(session), pending = session.complete(login.callback, login.cookie);
  const assertion = assert.rejects(pending, { code: "cancelled" });
  await entered.promise; const disconnecting = session.disconnect(); release.resolve();
  await Promise.all([assertion, disconnecting]); assert.equal(file.value(), null);
});

test("switching accounts rejects late refresh from the earlier account", async () => {
  const gate = deferred(), file = memoryFile(grant);
  const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async (_url, options) => options.body.get("grant_type") === "refresh_token"
    ? gate.promise : response({ ...access, access_token: "new-account-access", refresh_token: "new-account-refresh" }) }).load();
  const old = session.token(), rejected = assert.rejects(old, { code: "cancelled" }), login = flow(session);
  await session.complete(login.callback, login.cookie);
  gate.resolve(response({ error: "invalid_grant" }, false)); await rejected;
  assert.equal(file.value().refreshToken, "new-account-refresh");
  assert.equal((await session.token()).accessToken, "new-account-access");
});

test("refresh started during a new account code exchange cannot race its commit", async () => {
  const codeGate = deferred(), file = memoryFile(grant); let refreshes = 0;
  const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async (_url, options) => {
    if (options.body.get("grant_type") === "authorization_code") return codeGate.promise;
    refreshes++; return response({ ...access, access_token: "OLD-account-access", refresh_token: "OLD-account-refresh" });
  } }).load();
  const login = flow(session), completing = session.complete(login.callback, login.cookie);
  await assert.rejects(session.token({ force: true }), { code: "authorization_in_progress", httpStatus: 503 });
  assert.equal(refreshes, 0);
  codeGate.resolve(response({ ...access, access_token: "NEW-account-access", refresh_token: "NEW-account-refresh" }));
  await completing;
  assert.equal(file.value().refreshToken, "NEW-account-refresh");
  assert.equal((await session.token()).accessToken, "NEW-account-access");
  assert.equal(refreshes, 0);
});

test("a failed account switch releases the refresh gate and preserves the earlier authorization", async () => {
  const codeGate = deferred(), file = memoryFile(grant); let refreshes = 0;
  const session = await new GoogleOAuthSession({ config, grantFile: file, fetchImpl: async (_url, options) => {
    if (options.body.get("grant_type") === "authorization_code") return codeGate.promise;
    assert.equal(options.body.get("refresh_token"), grant.refreshToken);
    refreshes++; return response(access);
  } }).load();
  const login = flow(session), completing = session.complete(login.callback, login.cookie);
  const rejected = assert.rejects(completing, { code: "reconnect_required" });
  await assert.rejects(session.token({ force: true }), { code: "authorization_in_progress" });
  codeGate.resolve(response({ error: "invalid_grant" }, false)); await rejected;
  assert.deepEqual(file.value(), grant);
  assert.equal((await session.token()).accessToken, access.access_token);
  assert.equal(refreshes, 1);
});

test("grant file uses private modes, excludes access/client secrets and rejects unsafe files", async t => {
  const folder = await mkdtemp(join(tmpdir(), "scout-oauth-test-")); t.after(() => rm(folder, { recursive: true, force: true }));
  const file = new GoogleGrantFile(join(folder, "private", "grant.json"));
  await file.save(grant);
  assert.equal((await stat(file.path)).mode & 0o777, 0o600);
  assert.equal((await stat(join(folder, "private"))).mode & 0o777, 0o700);
  assert.deepEqual(await file.load(), grant);
  const contents = await readFile(file.path, "utf8");
  assert.ok(!contents.includes(config.clientSecret)); assert.ok(!contents.includes(access.access_token));
  await chmod(file.path, 0o644); await assert.rejects(file.load(), { code: "storage" });
  await chmod(file.path, 0o600); await file.remove(); assert.equal(await file.load(), null);
  await symlink(join(folder, "elsewhere"), file.path); await assert.rejects(file.load(), { code: "storage" });
  await assert.rejects(file.save(grant), { code: "storage" });
});
