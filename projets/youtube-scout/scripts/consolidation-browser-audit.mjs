import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { discogsReleaseGraph } from "../lib/catalogue.mjs";

// Real UI + local graph HTTP, synthetic catalogues, disposable browser/state.
const browserName = process.env.SCOUT_AUDIT_BROWSER || "chromium";
const librarySize = Math.max(1, Math.min(5000, Number(process.env.SCOUT_AUDIT_LIBRARY_SIZE) || 1));
const playwright = await import(process.env.SCOUT_PLAYWRIGHT_MODULE || "playwright");
const folder = await mkdtemp(join(tmpdir(), "scout-consolidation-ui-"));
console.log(`Audit artifacts: ${folder}`);
const fixture = createServer((request, response) => {
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify({ releases: [], recordings: [], artists: [], relations: [], results: [], pagination: { pages: 1 } }));
});
fixture.listen(0, "127.0.0.1"); await once(fixture, "listening");
const root = `http://127.0.0.1:${fixture.address().port}`;
const probe = createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("../", import.meta.url),
  env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(folder, "state.json"), DISCOGS_TOKEN_FILE: join(folder, "token"),
    DISCOGS_TOKEN: "", APPLE_MUSIC_TOKEN: "", SPOTIFY_TOKEN: "", SOUNDCLOUD_TOKEN: "",
    MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: root, DISCOGS_ROOT: root,
    LISTENBRAINZ_ROOT: root, APPLE_MUSIC_ROOT: root, SPOTIFY_ROOT: root, YOUTUBE_THUMBNAIL_ROOT: root },
  stdio: ["ignore", "pipe", "pipe"]
});
let browser, page;
const checks = [], errors = [], calls = [];
let delayGraph = false;
const check = (name, condition) => { assert.ok(condition, name); checks.push(name); console.log(`PASS ${name}`); };
try {
  await Promise.race([once(server.stdout, "data"), new Promise((_, reject) => setTimeout(() => reject(new Error("Server startup timeout")), 5000))]);
  browser = await playwright[browserName].launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = route.request().url();
    if (!url.startsWith(`http://localhost:${port}/`)) return route.abort();
    if (delayGraph && new URL(url).pathname === "/api/graph") await new Promise(resolve => setTimeout(resolve, 400));
    return route.continue();
  });
  page.on("request", request => { if (request.url().includes("/api/music/")) calls.push(request.url()); });
  const base = `http://localhost:${port}`;
  await page.goto(base);
  await page.locator("#workspace-empty").waitFor();
  await page.keyboard.press("Control+k");
  await page.locator("#seed-dialog[open]").waitFor();
  check("Keyboard picker opens", await page.locator("#seed-search").evaluate(node => node === document.activeElement));
  check("Suggestions are optional and collapsed", !await page.locator("#suggestion-picker").evaluate(node => node.open));
  check("Search is visible immediately without scrolling", await page.locator("#seed-search").evaluate(node => { const box = node.getBoundingClientRect(); return box.top >= 0 && box.bottom < innerHeight; }));
  await page.keyboard.press("Escape");
  check("Escape closes picker", !await page.locator("#seed-dialog").evaluate(node => node.open));
  const deltas = Array.from({ length: 18 }, (_, i) => discogsReleaseGraph({ id: 100 + i, title: i ? `Night Routes ${i}` : "First Light", artists: [{ id: i ? 20 + i : 10, name: i ? `Satellite ${i}` : "Signal Coast" }], labels: [{ id: 77, name: "Tidal Records" }], tracklist: [] }));
  const delta = { entities: deltas.flatMap(x => x.entities), edges: deltas.flatMap(x => x.edges) };
  const hostile = '<img data-audit-xss="yes" src=x onerror="window.auditXss=true">';
  for (const node of delta.entities) if (node.type === "release" && node.id !== "release:discogs:100") {
    node.title += ` ${hostile}`;
    node.url = "javascript:window.auditXss=true";
  }
  const video = { id: "fixture0001", title: "Signal Coast - First Light", channelTitle: "Fixture Channel", durationSeconds: 360, playlistIds: ["fixture-list"], playlistNames: ["Fixture collection"] };
  delta.entities.push({ id: `video:youtube:${video.id}`, type: "video", title: video.title });
  delta.edges.push({ from: `video:youtube:${video.id}`, to: "artist:discogs:10", kind: "probable_artist", status: "confirmed_user", evidence: ["fixture"] });
  check("Fixture graph ingested", (await fetch(`${base}/api/graph/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) })).ok);
  const library = [video, ...Array.from({ length: librarySize - 1 }, (_, i) => ({ ...video, id: `fixture${String(i + 2).padStart(5, "0")}`, title: `Collection item ${i + 2}`, channelTitle: "Fixture archive" }))];
  await page.evaluate(async library => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open("youtube-scout", 3); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction("library", "readwrite"); tx.objectStore("library").put(library, "videos"); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
  }, library);
  await page.reload();
  await page.getByRole("button", { name: "＋ Choisir un départ" }).click();
  check("Picker renders a bounded initial list", await page.locator(".seed-result").count() <= 8);
  await page.locator("#seed-search").fill("Signal Coast");
  const resultBeforeRefresh = await page.locator(".seed-result").first().elementHandle();
  await page.locator("#seed-search").dispatchEvent("input");
  check("An unchanged picker refresh preserves the clickable element", await resultBeforeRefresh.evaluate(node => node.isConnected));
  await page.screenshot({ path: join(folder, "picker.png") });
  // Regression from the real workflow: all optional directions unchecked,
  // then choosing a track must not silently refuse the click behind the modal.
  await page.locator(".seed-advanced > summary").click();
  for (const checkbox of await page.locator("#exploration-directions input").all()) await checkbox.uncheck();
  delayGraph = true;
  await page.locator('[data-seed-id="video:youtube:fixture0001"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check("Track selection works with no optional direction selected", !await page.locator("#seed-dialog").evaluate(node => node.open));
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent?.includes("First Light"));
  await page.locator("#workspace-change-seed").click();
  await page.locator("#seed-type").selectOption("artist");
  await page.locator("#seed-search").fill("signal");
  await page.locator('[data-seed-id="artist:discogs:10"]').click();
  const cards = page.locator("#scout-mixer-rack .mix-grid .derived-card");
  await cards.first().waitFor();
  await page.waitForTimeout(600);
  delayGraph = false;
  check("Changing departure during a delayed graph read keeps the latest choice", (await page.locator(".mix-source-name").innerText()) === "Signal Coast");
  check("Active collection artist opens discoveries", await cards.count() > 0);
  check("Hostile catalogue titles stay text", await cards.first().locator("h3").textContent().then(text => text.includes("<img")) && await page.locator("[data-audit-xss]").count() === 0);
  check("Hostile catalogue URLs never become executable links", await page.locator('a[href^="javascript:"], a[href^="data:"]').count() === 0);
  check("Picker closes on choice", !await page.locator("#seed-dialog").evaluate(node => node.open));
  check("Mixer settings are available without obscuring results", !await page.locator(".mix-tuning").evaluate(node => node.open));
  check("Desktop results use two readable columns", await cards.nth(1).evaluate((node) => {
    const first = node.previousElementSibling.getBoundingClientRect(), second = node.getBoundingClientRect();
    return second.left > first.left && Math.abs(second.top - first.top) < 2;
  }));
  await cards.first().locator(".catalogue-proof > summary").click();
  check("Expanded evidence stays bounded and the explanation remains visible", await cards.first().evaluate(card => card.querySelector(".catalogue-proof").getBoundingClientRect().height <= 321 && Boolean(card.querySelector(".catalogue-reason").textContent)));
  await cards.first().locator(".catalogue-proof > summary").click();
  await page.locator('#scout-mixer-rack [data-action="dig"]').waitFor({ state: "visible" });
  await page.screenshot({ path: join(folder, "desktop.png"), fullPage: true });
  const beforeCalls = calls.length;
  await page.locator(".mix-tuning > summary").click();
  await page.locator("#scout-param-shape-spread").fill("0.4");
  await page.locator("#scout-param-shape-spread").dispatchEvent("input");
  await page.waitForTimeout(150);
  check("Local controls do not query providers", calls.length === beforeCalls);
  const oldTitles = await cards.locator("h3").allTextContents();
  await page.locator('#scout-mixer-rack [data-action="next"]').click();
  await page.waitForTimeout(150);
  check("NEXT changes the candidate page", JSON.stringify(await cards.locator("h3").allTextContents()) !== JSON.stringify(oldTitles));
  await cards.first().locator("[data-keep]").click();
  await page.getByRole("link", { name: /Carnet/ }).click();
  await page.locator(".notebook-card textarea").fill("Conserver le chemin du label.");
  await page.locator(".notebook-card select").selectOption("listen");
  await page.locator(".notebook-card textarea").blur();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("youtube-scout.active-dig.v2"))?.seed?.id === "artist:discogs:10");
  await page.evaluate(() => {
    const key = "youtube-scout.active-dig.v2";
    const saved = JSON.parse(localStorage.getItem(key));
    const stale = { id: "release:fixture:stale-era", title: "Unrelated remembered result", artist: "Unrelated", type: "release", direction: "era", path: [] };
    saved.front.directions = [...new Set([...saved.front.directions, "era"])];
    saved.catalogueGroups.era = { items: [stale], selectedIds: [stale.id], coverage: { complete: true, state: "documented" } };
    saved.updatedAt = new Date(Date.now() + 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await page.locator(".notebook-card").waitFor();
  check("Notebook note survives reload", await page.locator(".notebook-card textarea").inputValue() === "Conserver le chemin du label.");
  await page.getByRole("link", { name: /Explorer/ }).click();
  await page.locator("#workspace-resume").waitFor();
  check("Reload does not reactivate the last departure", await page.locator("#workspace-empty").isVisible());
  const resumeCalls = calls.length;
  await page.locator("#workspace-resume").click();
  await cards.first().waitFor();
  check("Explicit resume restores the departure", (await page.locator(".mix-source-name").innerText()).includes("Signal Coast"));
  check("Resume reads local knowledge without provider searches", calls.length === resumeCalls);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("youtube-scout.active-dig.v2"))?.catalogueGroups?.era?.retiredItems?.length === 1);
  check("Resume excludes an obsolete remembered result without erasing its history", await page.evaluate(() => {
    const group = JSON.parse(localStorage.getItem("youtube-scout.active-dig.v2")).catalogueGroups.era;
    return group.items.length === 0 && group.selectedIds.length === 0 && group.retiredItems[0].title === "Unrelated remembered result";
  }));
  await cards.first().locator("[data-continue]").click();
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent?.includes("Night Routes"));
  await page.locator(".mix-source-back").click();
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent?.includes("Signal Coast"));
  check("Continue and back retain the route", await cards.count() > 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const mobileCard = await cards.first().evaluate(card => {
    const bounds = card.getBoundingClientRect();
    const copy = card.querySelector(".derived-copy").getBoundingClientRect();
    const actions = [...card.querySelectorAll(".card-actions a, .card-actions button")].map(node => {
      const box = node.getBoundingClientRect();
      return { width: box.width, height: box.height, left: box.left, right: box.right };
    });
    return { width: bounds.width, left: bounds.left, right: bounds.right, copyWidth: copy.width, actions };
  });
  check("Mobile card content uses its available width", mobileCard.copyWidth >= mobileCard.width - 30);
  await writeFile(join(folder, "mobile-layout.json"), JSON.stringify(mobileCard, null, 2));
  check("Mobile actions remain inside the card and touch-sized", mobileCard.actions.length > 0 && mobileCard.actions.every(box => box.height >= 44 && box.width >= 60 && box.left >= mobileCard.left && box.right <= mobileCard.right));
  await page.screenshot({ path: join(folder, "mobile.png"), fullPage: true });
  await cards.first().screenshot({ path: join(folder, "mobile-card.png") });
  check("No horizontal overflow on mobile", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const backupChecks = await page.evaluate(async () => {
    const { createBackup, validateBackup } = await import('/library-state.mjs');
    const backup = createBackup({ local: { activeDig: { apiKey: "secret-fixture", nested: { access_token: "secret-fixture" } } } });
    const clean = !JSON.stringify(backup).includes("secret-fixture");
    let invalid = 0;
    for (const altered of [
      { ...backup, local: { activeDig: { seed: { id: "A" }, front: { seed: { id: "B" }, branches: [] } } } },
      JSON.parse(JSON.stringify(backup).replace('"local":{', '"local":{"__proto__":{},'))
    ]) { try { validateBackup(altered); } catch { invalid++; } }
    return { clean, invalid };
  });
  check("Backup omits nested credentials", backupChecks.clean);
  check("Malformed and cross-departure backups are rejected", backupChecks.invalid === 2);
  check("No injected script ran", !await page.evaluate(() => window.auditXss));
  check("No uncaught browser errors", errors.length === 0);
  await writeFile(join(folder, "report.json"), JSON.stringify({ fixtureOnly: true, browser: browserName, librarySize, checks, errors }, null, 2));
  console.log(JSON.stringify({ status: "passed", checks: checks.length, folder, fixtureOnly: true }));
} catch (error) {
  await page?.screenshot({ path: join(folder, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(join(folder, "failure.json"), JSON.stringify({ message: error.message, errors, checks }, null, 2));
  throw error;
} finally {
  await browser?.close(); server.kill("SIGTERM"); fixture.close();
}
