import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

// Fresh browser and temporary database. All provider responses are fixtures;
// no personal browser storage, credentials, account or provider is touched.
const { chromium } = await import(process.env.SCOUT_PLAYWRIGHT_MODULE || "playwright");
const folder = await mkdtemp(join(tmpdir(), "scout-connection-audit-"));
const probe = createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url), env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(folder, "state.json"), DISCOGS_TOKEN_FILE: join(folder, "token"), DISCOGS_TOKEN: "" }, stdio: ["ignore", "pipe", "pipe"] });
let browser;
try {
  await Promise.race([once(server.stdout, "data"), new Promise((_, reject) => setTimeout(() => reject(new Error("Server startup timeout")), 5000))]);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  const calls = []; let oauthStatus = 200, keyStatus = 200, holdOAuth = false, releaseOAuth;
  await page.addInitScript(() => {
    globalThis.fixtureGooglePrompts = [];
    globalThis.google = { accounts: { oauth2: { initTokenClient: options => ({ requestAccessToken: parameters => {
      globalThis.fixtureGooglePrompts.push(parameters.prompt);
      options.callback({ access_token: "fixture-oauth-token", expires_in: 3600, scope: "https://www.googleapis.com/auth/youtube.readonly" });
    } }) } } };
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.hostname !== "www.googleapis.com") return route.abort();
    calls.push(url.pathname);
    if (url.pathname.endsWith("/channels")) {
      if (holdOAuth) await new Promise(resolve => { releaseOAuth = resolve; });
      return route.fulfill({ status: oauthStatus, json: oauthStatus === 200 ? { items: [{ id: "fixture-channel" }] } : { error: {} } });
    }
    if (url.pathname.endsWith("/i18nRegions")) return route.fulfill({ status: keyStatus, json: keyStatus === 200 ? { items: [] } : { error: {} } });
    if (url.pathname.endsWith("/playlists")) return route.fulfill({ json: { items: [{ id: "PLfixture123", snippet: { title: "Playlist de vérification" }, contentDetails: { itemCount: 3 }, status: { privacyStatus: "private" } }] } });
    return route.abort();
  });
  await page.goto(`${base}/#source-panel`);
  await page.locator("#sources-view:not([hidden])").waitFor();
  await page.locator("#client-id").fill("fixture.apps.googleusercontent.com");
  await page.locator("#save-client-id").click();
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#client-id").value === "fixture.apps.googleusercontent.com");
  assert.equal(await page.locator("#youtube-settings").evaluate(node => node.open), true);
  assert.equal(await page.locator("#connection-state").textContent(), "Non connecté");
  assert.deepEqual(await page.evaluate(() => fixtureGooglePrompts), []);

  holdOAuth = true;
  await page.locator("#connect").click();
  await page.waitForFunction(() => document.querySelector("#connection-state").textContent === "Vérification…");
  assert.equal(await page.locator("#youtube-settings").evaluate(node => node.open), true);
  while (!releaseOAuth) await new Promise(resolve => setTimeout(resolve, 10));
  holdOAuth = false; releaseOAuth();
  await page.waitForFunction(() => !document.querySelector("#youtube-settings").open);
  await page.locator("#playlists").getByText("Playlist de vérification").waitFor();
  assert.equal(await page.locator("#connection-state").textContent(), "Connecté · lecture seule");
  assert.deepEqual(await page.evaluate(() => fixtureGooglePrompts), ["consent"]);
  await page.locator("#playlist-links > summary").click();
  assert.equal(await page.locator("#playlist-urls").isVisible(), true, "Playlist links remain independent of collapsed settings");
  await page.screenshot({ path: join(folder, "connected-desktop.png"), fullPage: true });

  const checksBeforeReload = calls.filter(path => path.endsWith("/channels")).length;
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#connection-state").textContent === "Connecté · lecture seule");
  assert.equal(calls.filter(path => path.endsWith("/channels")).length, checksBeforeReload + 1);
  assert.deepEqual(await page.evaluate(() => fixtureGooglePrompts), [], "No automatic popup on resume");
  assert.equal(await page.locator("#youtube-settings").evaluate(node => node.open), false);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(folder, "connected-mobile.png"), fullPage: true });

  oauthStatus = 401; await page.locator("#connection-recheck").click();
  await page.waitForFunction(() => document.querySelector("#connection-state").textContent === "À reconnecter");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("youtube-scout.oauth-session.v1")), null);
  assert.equal(await page.locator("#connection-reconnect").isVisible(), true);
  oauthStatus = 200; await page.locator("#connection-reconnect").click();
  await page.waitForFunction(() => document.querySelector("#connection-state").textContent === "Connecté · lecture seule");
  assert.deepEqual(await page.evaluate(() => fixtureGooglePrompts), [""], "Returning consent is not forced again");

  await page.locator("#youtube-settings > summary").click();
  await page.locator("#api-key").fill("fixture-key-only");
  await page.locator("#verify-api-key").click();
  await page.waitForFunction(() => document.querySelector("#api-key-state").textContent.includes("Clé vérifiée et mémorisée"));
  await page.locator("#youtube-settings > summary").click();
  await page.locator("#disconnect").click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("youtube-scout.oauth-session.v1")), null);
  assert.equal(await page.evaluate(() => localStorage.getItem("youtube-scout.api-key.v1")), "fixture-key-only");
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#connection-state").textContent === "Accès public vérifié");
  assert.deepEqual(await page.evaluate(() => fixtureGooglePrompts), []);
  assert.equal(await page.locator("#youtube-settings").evaluate(node => node.open), false);

  keyStatus = 403; await page.locator("#connection-recheck").click();
  await page.waitForFunction(() => document.querySelector("#connection-summary").textContent.includes("Clé API non vérifiée"));
  assert.equal(await page.locator("#youtube-settings").evaluate(node => node.open), true);
  await page.locator("#api-key").fill(""); await page.locator("#verify-api-key").click();
  assert.equal(await page.evaluate(() => localStorage.getItem("youtube-scout.api-key.v1")), null);
  await page.reload();
  await page.waitForFunction(() => !document.querySelector("#api-key").value);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: "PASS", checks: ["ID memory without false connection", "collapse after API verification", "independent playlist input", "OAuth resume and recheck without popup", "mobile overflow", "revoked token", "returning consent", "persistent public key", "local disconnect", "failed verification reopens settings", "key deletion", "no JS errors"], screenshots: folder }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
