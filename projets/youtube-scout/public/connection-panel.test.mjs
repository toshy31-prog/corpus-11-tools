import { test } from "node:test";
import assert from "node:assert/strict";
import { createConnectionPanel, usableSession, API_KEY_STORAGE, OAUTH_SESSION_STORAGE } from "./connection-panel.mjs";

const id = "fixture.apps.googleusercontent.com";
const clock = 100_000;
const grant = { accessToken: "fixture-token", expiresAt: clock + 3600_000, clientId: id };
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
function setup(t, fetchImpl = async () => ({ ok: true, json: async () => ({ items: [] }) }), options = {}) {
  const nodes = new Map();
  const root = { getElementById: key => {
    if (!nodes.has(key)) nodes.set(key, { value: "", open: true, hidden: false, textContent: "", classList: { toggle() {} },
      listeners: {}, addEventListener(type, action) { this.listeners[type] = action; }, focus() {}, click() { this.onclick?.(); } });
    return nodes.get(key);
  } };
  const local = storage(), session = storage(), tokens = [], messages = [], statuses = [];
  root.getElementById("client-id").value = id;
  const panel = createConnectionPanel({ root, local, session, fetchImpl, now: () => clock,
    onToken: (...args) => tokens.push(args), onMessage: message => messages.push(message), onStatus: status => statuses.push(status), ...options });
  t.after(() => panel.dispose());
  return { panel, $: root.getElementById, local, session, tokens, messages, statuses };
}

test("OAuth session is bounded by expiry, client and valid structure", () => {
  assert.equal(usableSession(grant, id, clock), true);
  for (const invalid of [null, {}, { ...grant, accessToken: "" }, { ...grant, expiresAt: Infinity }, { ...grant, expiresAt: clock + 15_000 }]) assert.equal(usableSession(invalid, id, clock), false);
  assert.equal(usableSession(grant, "another-client", clock), false);
});
test("saved ID alone never claims a connection or collapses configuration", async t => {
  const { panel, $ } = setup(t);
  await panel.restore();
  assert.equal($("youtube-settings").open, true);
  assert.equal($("connection-state").textContent, "Non connecté");
});
test("valid key is stored separately and collapses only after verification", async t => {
  let release;
  const { panel, $, local } = setup(t, () => new Promise(resolve => { release = resolve; }));
  $("api-key").value = "fixture-key"; panel.saveKey();
  assert.equal(local.getItem(API_KEY_STORAGE), "fixture-key");
  const verifying = panel.verify();
  assert.equal($("youtube-settings").open, true);
  assert.equal($("connection-state").textContent, "Vérification…");
  release({ ok: true, json: async () => ({ items: [] }) }); await verifying;
  assert.equal($("youtube-settings").open, false);
  assert.equal($("connection-state").textContent, "Accès public vérifié");
  $("api-key").value = ""; panel.saveKey();
  assert.equal(local.getItem(API_KEY_STORAGE), null);
  assert.equal($("connection-state").textContent, "Non connecté");
});
test("unexpired OAuth is reverified before being exposed to the app", async t => {
  let release;
  const { panel, $, session, tokens } = setup(t, () => new Promise(resolve => { release = resolve; }));
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant));
  const restoring = panel.restore();
  assert.deepEqual(tokens, []);
  release({ ok: true, json: async () => ({ items: [] }) });
  assert.equal(await restoring, true);
  assert.deepEqual(tokens.at(-1), [grant.accessToken, grant.expiresAt]);
  assert.equal($("youtube-settings").open, false);
});
test("expired OAuth is removed without a provider call", async t => {
  let calls = 0;
  const { panel, $, session } = setup(t, async () => { calls++; });
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify({ ...grant, expiresAt: clock - 1 }));
  await panel.restore();
  assert.equal(calls, 0);
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
  assert.equal($("connection-reconnect").hidden, false);
  assert.equal($("connection-state").textContent, "À reconnecter");
});
test("revoked OAuth cannot be resumed", async t => {
  const { panel, $, session } = setup(t, async () => ({ ok: false, status: 401 }));
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant));
  assert.equal(await panel.restore(), false);
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
  assert.equal($("youtube-settings").open, true);
});
test("a rejected key keeps the settings open and never echoes secrets", async t => {
  const { panel, $, messages } = setup(t, async () => ({ ok: false, status: 403, json: async () => ({ error: "fixture-private-secret" }) }));
  $("api-key").value = "fixture-private-secret"; panel.saveKey();
  await panel.verify();
  assert.equal($("youtube-settings").open, true);
  assert.match($("connection-summary").textContent, /non vérifiée/);
  assert.equal(messages.join().includes("fixture-private-secret"), false);
});
test("HTML success and network failures are not accepted as API verification", async t => {
  const { panel, $ } = setup(t, async () => ({ ok: true, json: async () => { throw new SyntaxError(); } }));
  $("api-key").value = "fixture-key";
  await panel.verify();
  assert.equal($("youtube-settings").open, true);
  assert.equal($("connection-state").textContent, "Non connecté");
});
test("late verification after editing the key cannot validate the replacement", async t => {
  let release;
  const { panel, $ } = setup(t, () => new Promise(resolve => { release = resolve; }));
  $("api-key").value = "first";
  const pending = panel.verify();
  $("api-key").value = "second"; $("api-key").listeners.input(); panel.saveKey();
  release({ ok: true, json: async () => ({ items: [] }) }); await pending;
  assert.equal($("connection-state").textContent, "Non connecté");
  assert.equal($("connect").disabled, false);
});
test("forget during restoration wins over a late verification", async t => {
  let release;
  const { panel, $, session, tokens } = setup(t, () => new Promise(resolve => { release = resolve; }));
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant));
  const pending = panel.restore(); panel.forget();
  release({ ok: true, json: async () => ({ items: [] }) }); await pending;
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
  assert.deepEqual(tokens.at(-1), ["", 0]);
  assert.equal($("connection-state").textContent, "Non connecté");
});
test("an unrelated late 401 cannot remove the current grant", async t => {
  const { panel, $, session } = setup(t);
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant)); await panel.restore();
  panel.invalidateOAuth("an-old-token");
  assert.equal($("connection-state").textContent, "Connecté · lecture seule");
});
test("later successful reads do not close settings manually reopened by user", async t => {
  const { panel, $, session } = setup(t);
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant)); await panel.restore();
  $("youtube-settings").open = true; panel.accept({ accessToken: grant.accessToken });
  assert.equal($("youtube-settings").open, true);
});

const backend = { configured: true, renewable: true, clientId: id, state: "renewable" };
const renewableGrant = { ...grant, renewable: true };
const json = data => ({ ok: true, json: async () => structuredClone(data) });

test("server restoration resumes without GIS and never persists renewable access in browser storage", async t => {
  const calls = [];
  const { panel, session, tokens, statuses } = setup(t, async (url, options) => {
    calls.push({ url, options }); return json(url.endsWith("status") ? backend : renewableGrant);
  }, { renewable: true });
  assert.equal(await panel.restore(), true);
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
  assert.deepEqual(tokens.at(-1), [grant.accessToken, grant.expiresAt]);
  assert.equal(statuses.at(-1).connected, true);
  assert.ok(!JSON.stringify(statuses).includes(grant.accessToken));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers["X-Scout-Local"], "1");
  assert.equal(calls[1].options.credentials, "same-origin");
});

test("renewable token timer renews before expiration and concurrent requests share the result", async t => {
  let tokenCalls = 0, release;
  const timers = [];
  const { panel, tokens } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    if (++tokenCalls === 1) return json(renewableGrant);
    return new Promise(resolve => { release = resolve; });
  }, { renewable: true, schedule: (run, delay) => { timers.push({ run, delay }); return timers.length; }, unschedule() {} });
  await panel.restore();
  assert.equal(timers.at(-1).delay, 3540_000);
  timers.at(-1).run();
  const waiting = panel.ensureAccessToken({ force: true });
  assert.equal(tokenCalls, 2);
  release(json({ ...renewableGrant, accessToken: "renewed-fixture", expiresAt: grant.expiresAt + 3600_000 }));
  assert.equal(await waiting, "renewed-fixture");
  assert.equal(tokens.at(-1)[0], "renewed-fixture");
});

test("transient renewal failure keeps authorization and schedules bounded retry; revocation stops it", async t => {
  let next = "success", time = clock;
  const timers = [];
  const { panel, tokens, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    if (next === "network") throw new Error("secret-provider-failure");
    if (next === "revoked") return { ok: false, status: 401 };
    return json({ ...renewableGrant, expiresAt: time + 3600_000 });
  }, { renewable: true, now: () => time, schedule: (run, delay) => { timers.push({ run, delay }); return timers.length; }, unschedule() {} });
  await panel.restore(); next = "network"; time += 3600_000;
  assert.equal(await panel.ensureAccessToken(), "");
  assert.equal(statuses.at(-1).oauth, "unavailable"); assert.equal(statuses.at(-1).renewable, true);
  assert.equal(timers.at(-1).delay, 15_000); assert.deepEqual(tokens.at(-1), ["", 0]);
  next = "success"; assert.equal(await panel.ensureAccessToken(), grant.accessToken);
  next = "revoked"; const count = timers.length;
  await panel.ensureAccessToken({ force: true });
  assert.equal(statuses.at(-1).oauth, "expired"); assert.equal(statuses.at(-1).renewable, false);
  assert.equal(timers.length, count);
});

test("forget wins against a late renewable-token response and asks server to delete grant", async t => {
  let release; const calls = [];
  const { panel, tokens, statuses } = setup(t, async url => {
    calls.push(url);
    if (url.endsWith("status")) return json(backend);
    if (url.endsWith("disconnect")) return json({ ...backend, renewable: false, state: "idle" });
    return new Promise(resolve => { release = resolve; });
  }, { renewable: true });
  const restoring = panel.restore();
  for (let i = 0; i < 20 && !release; i++) await Promise.resolve();
  assert.equal(typeof release, "function");
  await panel.forget(); release(json(renewableGrant)); await restoring;
  assert.deepEqual(tokens.at(-1), ["", 0]); assert.equal(statuses.at(-1).connected, false);
  assert.ok(calls.some(url => url.endsWith("disconnect")));
});

test("browser expiry emits globally usable status without silently opening Google", async t => {
  let expire;
  const { panel, session, statuses } = setup(t, async () => json({ items: [] }), { schedule: run => { expire = run; }, unschedule() {} });
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant)); await panel.restore(); expire();
  assert.equal(statuses.at(-1).oauth, "expired");
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
});

test("configured connection starts only through connect and navigates solely to official Google", async t => {
  const navigated = []; let starts = 0;
  const { panel } = setup(t, async url => {
    if (url.endsWith("status")) return json({ ...backend, renewable: false });
    starts++; return json({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=fixture" });
  }, { renewable: true, navigate: url => navigated.push(url) });
  await panel.restore(); assert.equal(starts, 0); assert.equal(navigated.length, 0);
  await panel.connect(); assert.equal(starts, 1); assert.equal(navigated.length, 1);
});

test("a second API rejection stops renewal and leaves an explicit reconnect state", async t => {
  let tokenCalls = 0;
  const { panel, tokens, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    tokenCalls++; return json(renewableGrant);
  }, { renewable: true });
  await panel.restore();
  panel.invalidateOAuth(grant.accessToken, { renew: false });
  assert.equal(await panel.ensureAccessToken({ force: true }), "");
  assert.equal(tokenCalls, 1); assert.deepEqual(tokens.at(-1), ["", 0]);
  assert.equal(statuses.at(-1).oauth, "expired");
});

test("forget during connection start prevents late navigation to Google", async t => {
  let release; const navigated = [];
  const { panel } = setup(t, async url => url.endsWith("status") ? json({ ...backend, renewable: false }) : new Promise(resolve => { release = resolve; }),
    { renewable: true, navigate: url => navigated.push(url) });
  await panel.restore(); const connecting = panel.connect(); await panel.forget();
  release(json({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=fixture" }));
  await connecting; assert.deepEqual(navigated, []);
});

test("rejected access is never reused after transient 503; the grant and automatic retry survive", async t => {
  const timers = []; let tokenCalls = 0;
  const { panel, tokens, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    tokenCalls++;
    if (tokenCalls === 2) return { ok: false, status: 503 };
    return json({ ...renewableGrant, accessToken: tokenCalls === 1 ? grant.accessToken : "recovered-access" });
  }, { renewable: true, schedule: (run, delay) => { timers.push({ run, delay }); return timers.length; }, unschedule() {} });
  await panel.restore();
  assert.equal(await panel.ensureAccessToken({ force: true, rejectedToken: grant.accessToken }), "");
  assert.deepEqual(tokens.at(-1), ["", 0]);
  assert.equal(statuses.at(-1).oauth, "unavailable");
  assert.equal(statuses.at(-1).renewable, true);
  assert.equal(timers.at(-1).delay, 15_000);
  timers.at(-1).run();
  assert.equal(await panel.ensureAccessToken({ force: true }), "recovered-access");
  assert.equal(tokenCalls, 3);
  assert.equal(statuses.at(-1).oauth, "ready");
  assert.equal(tokens.at(-1)[0], "recovered-access");
});

test("late 401 reuses a valid concurrent replacement without another refresh", async t => {
  let tokenCalls = 0;
  const { panel, tokens } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    tokenCalls++;
    return json({ ...renewableGrant, accessToken: tokenCalls === 1 ? grant.accessToken : "replacement-access" });
  }, { renewable: true });
  await panel.restore();
  assert.equal(await panel.ensureAccessToken({ force: true, rejectedToken: grant.accessToken }), "replacement-access");
  assert.equal(await panel.ensureAccessToken({ force: true, rejectedToken: grant.accessToken }), "replacement-access");
  assert.equal(tokenCalls, 2);
  assert.equal(tokens.at(-1)[0], "replacement-access");
});

test("a rejected browser-only grant is cleared without renewal or popup", async t => {
  let calls = 0;
  const { panel, tokens, session, statuses } = setup(t, async () => { calls++; return json({ items: [] }); });
  session.setItem(OAUTH_SESSION_STORAGE, JSON.stringify(grant)); await panel.restore();
  assert.equal(await panel.ensureAccessToken({ force: true, rejectedToken: grant.accessToken }), "");
  assert.deepEqual(tokens.at(-1), ["", 0]);
  assert.equal(session.getItem(OAUTH_SESSION_STORAGE), null);
  assert.equal(statuses.at(-1).oauth, "expired");
  assert.equal(calls, 1);
});

test("suspending renewal after a second 401 still permits forgetting the stored server grant", async t => {
  let disconnects = 0;
  const { panel, $, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    if (url.endsWith("disconnect")) { disconnects++; return json({ ...backend, renewable: false, state: "idle" }); }
    return json(renewableGrant);
  }, { renewable: true });
  await panel.restore(); panel.invalidateOAuth(grant.accessToken, { renew: false });
  assert.equal(statuses.at(-1).renewable, false);
  assert.equal(statuses.at(-1).hasServerGrant, true);
  assert.equal($("disconnect").hidden, false);
  await panel.forget();
  assert.equal(disconnects, 1); assert.equal($("disconnect").hidden, true);
  assert.equal(statuses.at(-1).hasServerGrant, false);
});

test("unconfirmed server forget keeps its retry action visible even after renewal was stopped", async t => {
  let disconnects = 0;
  const { panel, $, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return json(backend);
    if (url.endsWith("disconnect")) { disconnects++; return { ok: false, status: 503 }; }
    return json(renewableGrant);
  }, { renewable: true });
  await panel.restore(); panel.invalidateOAuth(grant.accessToken, { renew: false }); await panel.forget();
  assert.equal(statuses.at(-1).hasServerGrant, true); assert.equal($("disconnect").hidden, false);
  await panel.forget(); assert.equal(disconnects, 2);
});

test("forget before initial server status still deletes its grant and a late status cannot restore it", async t => {
  let releaseStatus, disconnects = 0, tokenCalls = 0;
  const { panel, $, tokens, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return new Promise(resolve => { releaseStatus = resolve; });
    if (url.endsWith("disconnect")) { disconnects++; return json({ ...backend, renewable: false, state: "idle" }); }
    tokenCalls++; return json(renewableGrant);
  }, { renewable: true });
  const restoring = panel.restore(); await panel.forget();
  releaseStatus(json(backend)); await restoring;
  assert.equal(disconnects, 1); assert.equal(tokenCalls, 0);
  assert.deepEqual(tokens.at(-1), ["", 0]);
  assert.equal(statuses.at(-1).hasServerGrant, false);
  assert.equal(statuses.at(-1).serverForgetUnconfirmed, false);
  assert.equal($("disconnect").hidden, true);
});

test("failed forget of an unknown server grant remains visible and retryable after late status", async t => {
  let releaseStatus, disconnects = 0;
  const { panel, $, statuses } = setup(t, async url => {
    if (url.endsWith("status")) return new Promise(resolve => { releaseStatus = resolve; });
    if (url.endsWith("disconnect")) {
      disconnects++;
      return disconnects === 1 ? { ok: false, status: 503 } : json({ ...backend, renewable: false, state: "idle" });
    }
    throw new Error("Must not request access");
  }, { renewable: true });
  const restoring = panel.restore(); await panel.forget(); releaseStatus(json(backend)); await restoring;
  assert.equal(statuses.at(-1).hasServerGrant, false);
  assert.equal(statuses.at(-1).serverForgetUnconfirmed, true);
  assert.equal($("disconnect").hidden, false); assert.equal($("connect").disabled, true);
  await panel.forget();
  assert.equal(disconnects, 2); assert.equal($("disconnect").hidden, true);
  assert.equal(statuses.at(-1).serverForgetUnconfirmed, false);
});
