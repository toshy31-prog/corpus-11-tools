import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { catalogueArtistChoices } from "../public/departure-workflow.mjs";
import { discogsReleaseGraph } from "../lib/catalogue.mjs";

// Reproducible software test, not the user's browser/profile. All upstreams,
// credentials, library entries, graphs and sessions below are synthetic.
const pw = await import(process.env.SCOUT_PLAYWRIGHT_MODULE || "playwright");
const engine = process.env.SCOUT_AUDIT_BROWSER || "firefox";
const folder = await mkdtemp(join(tmpdir(), "scout-evolution-ui-"));
console.log(`Artifacts: ${folder}`);
const upstream = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ results: [], artists: [], recordings: [], releases: [], pagination: { pages: 1 } }));
});
upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
const upstreamRoot = `http://127.0.0.1:${upstream.address().port}`;
const probe = createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url), env: {
  ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(folder, "state.json"), DISCOGS_TOKEN_FILE: join(folder, "discogs-token"),
  DISCOGS_TOKEN: "", SPOTIFY_TOKEN: "", APPLE_MUSIC_TOKEN: "", SOUNDCLOUD_TOKEN: "",
  SCOUT_GOOGLE_CLIENT_ID: "", SCOUT_GOOGLE_CLIENT_SECRET: "", SCOUT_GOOGLE_ORIGIN: base, SCOUT_GOOGLE_TOKEN_FILE: join(folder, "google-token"),
  MUSICBRAINZ_ROOT: upstreamRoot, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: upstreamRoot, DISCOGS_ROOT: upstreamRoot,
  LISTENBRAINZ_ROOT: upstreamRoot, APPLE_MUSIC_ROOT: upstreamRoot, SPOTIFY_ROOT: upstreamRoot, YOUTUBE_THUMBNAIL_ROOT: upstreamRoot
}, stdio: ["ignore", "pipe", "pipe"] });
let browser, page, failure;
const checks = [], errors = [], forbidden = [], musicRequests = [], serverLog = [];
server.stderr.on("data", value => serverLog.push(String(value)));
const check = (name, result) => { assert.ok(result, name); checks.push(name); console.log(`PASS ${name}`); };
const videos = Array.from({ length: 30 }, (_, i) => ({ id: `evol${String(i).padStart(7, "0")}`,
  title: i === 0 ? "6SISS - Synthetic Beginning" : `Artist ${i} - Collection track ${i}`,
  artist: i === 0 ? "6SISS" : `Artist ${i}`, channelTitle: `Artist ${i} - Topic`, channelId: `UC${String(i).padStart(22, "0")}`,
  playlistIds: ["PLevolution01"], playlistNames: ["Synthetic playlist"], durationSeconds: 160 + i * 10,
  publishedAt: `${2010 + i % 10}-01-01T00:00:00Z`, addedAt: "2020-01-01T00:00:00Z", viewCount: 500 + i * 77 }));
const exactArtist = { id: "artist:discogs:60", type: "artist", name: "6SISS", externalIds: { discogs: "60" } };
try {
  await Promise.race([once(server.stdout, "data"), new Promise((_, reject) => setTimeout(() => reject(new Error("Server startup timeout")), 5000))]);
  browser = await pw[engine].launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(12000);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) { forbidden.push(url.origin); return route.abort(); }
    const json = body => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname.startsWith("/api/music/")) musicRequests.push(`${url.pathname}?${url.searchParams}`);
    if (url.pathname.startsWith("/api/youtube/thumbnail/")) return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#477867"/><circle cx="80" cy="45" r="30" fill="#f07f60"/></svg>' });
    if (url.pathname === "/api/music/artist-choices") return json({ candidates: catalogueArtistChoices({ entities: [exactArtist] }, url.searchParams.get("name") || "6SISS"), sourceStates: {} });
    if (url.pathname === "/api/music/identity") return json({ requestedName: url.searchParams.get("name"), claims: [], resolution: { status: "unresolved" }, sourceStates: {} });
    if (url.pathname === "/api/music/recording") return json({ status: "not_found", candidates: [], resolved: null });
    return route.continue();
  });
  await page.goto(base); await page.locator("#workspace-empty").waitFor();
  const release = discogsReleaseGraph({ id: 700, title: "Synthetic album", artists: [{ id: 70, name: "Fixture Label Artist" }],
    labels: [{ id: 77, name: "Fixture Records" }], tracklist: [{ title: "Synthetic label track", position: "A1" }] });
  const localArtist = { id: "artist:local:6siss", type: "artist", name: "6SISS", status: "user_supplied", seedEligible: true };
  const seedId = `video:youtube:${videos[0].id}`;
  const graph = { entities: [...release.entities, localArtist, { id: seedId, type: "video", title: videos[0].title }, { id: `video:youtube:${videos[1].id}`, type: "video", title: videos[1].title }], edges: [
    ...release.edges, { from: localArtist.id, to: seedId, kind: "credited_on", status: "observed", source: "fixture" },
    { from: seedId, to: "track:discogs:700:0", kind: "embodies", status: "resolved", source: "fixture" },
    { from: `video:youtube:${videos[1].id}`, to: "track:discogs:700:0", kind: "embodies", status: "resolved", source: "fixture" }
  ] };
  check("Synthetic graph stored on isolated server", (await fetch(`${base}/api/graph/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(graph) })).ok);
  await page.evaluate(async library => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open("youtube-scout", 3); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise((resolve, reject) => { const tx = db.transaction("library", "readwrite"); tx.objectStore("library").put(library, "videos"); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); db.close();
  }, videos);
  await page.reload(); await page.locator("#workspace-change-seed").click();
  await page.locator("#seed-type").selectOption("track");
  const order = () => page.locator("#seed-results [data-seed-id]").evaluateAll(rows => rows.map(row => row.dataset.seedId));
  check("Random is the initial departure ordering", await page.locator("#seed-sort").inputValue() === "random");
  const first = await order();
  await page.locator("#seed-search").dispatchEvent("input");
  check("Unchanged refresh preserves random order", JSON.stringify(first) === JSON.stringify(await order()));
  await page.locator("#seed-shuffle").click();
  check("Explicit reshuffle changes the ordered sample", JSON.stringify(first) !== JSON.stringify(await order()));
  await page.locator("#seed-search").fill(videos[0].title);
  check("Exact text search stays first with random sort", (await order())[0] === seedId);
  await page.locator("#seed-search").fill("");
  await page.locator("#seed-sort").selectOption("title");
  const alphabetical = await order();
  check("Alphabetical differs from the random sample", JSON.stringify(alphabetical) !== JSON.stringify(first));
  await page.locator("#seed-sort").selectOption("random");
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.locator('[data-picker-mode="search"]').click();
    await page.screenshot({ path: join(folder, `picker-search-${width}.png`) });
    const bounds = await page.locator("#seed-dialog").evaluate(dialog => { const r = dialog.getBoundingClientRect(), footer = dialog.querySelector("footer").getBoundingClientRect(), picker = dialog.querySelector("#departure-picker"); return { within: r.left >= 0 && r.right <= innerWidth && footer.bottom <= innerHeight, overflow: dialog.scrollWidth > dialog.clientWidth + 1, scrollable: getComputedStyle(picker).overflowY }; });
    check(`Modal and actions stay within viewport at ${width}px`, bounds.within && !bounds.overflow && bounds.scrollable === "auto");
    const firstResultVisible = await page.locator("#seed-results [data-seed-id]").first().evaluate(row => {
      const r = row.getBoundingClientRect(), p = document.querySelector("#departure-picker").getBoundingClientRect();
      return r.top >= p.top && r.bottom <= p.bottom;
    });
    check(`First search result is visible without scrolling at ${width}px`, firstResultVisible);
    await page.locator('[data-picker-mode="suggest"]').click();
    await page.locator("#videos .video-card").first().waitFor();
    await page.locator("#videos .video-card").first().scrollIntoViewIfNeeded();
    const overlaps = await page.locator("#videos .video-card").evaluateAll(cards => cards.filter(card => {
      const thumb = card.querySelector(".thumb"), copy = card.querySelector(".video-copy");
      if (!thumb.checkVisibility()) return false;
      const t = thumb.getBoundingClientRect(), c = copy.getBoundingClientRect();
      return t.right > c.left + 1 && t.left < c.right - 1 && t.top < c.bottom - 1 && t.bottom > c.top + 1;
    }).length);
    check(`Suggestion thumbnails do not overlap text at ${width}px`, overlaps === 0);
    await page.screenshot({ path: join(folder, `picker-suggest-${width}.png`) });
  }
  await page.keyboard.press("Escape"); await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#workspace-change-seed").click(); await page.locator("#seed-type").selectOption("playlist");
  await page.locator('[data-seed-id="playlist:youtube:PLevolution01"]').click(); await page.locator("#launch-seed").click();
  await page.locator(".departure-member-list button").first().waitFor();
  check("Playlist opens members instead of an artist form", await page.locator("#departure-artist-query").count() === 0 && await page.locator(".departure-member-list button").count() === 12);
  await page.locator('.departure-members input[type="search"]').fill("Synthetic Beginning");
  await page.screenshot({ path: join(folder, "playlist-members.png") });
  await page.locator(`[data-departure-member="${seedId}"]`).click();
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent.includes("Synthetic Beginning"));
  check("Playlist member becomes the next departure", (await page.locator(".mix-source-name").innerText()).includes("Synthetic Beginning"));
  const review = page.locator(".departure-review"); await review.waitFor();
  const beforeReviewRequests = musicRequests.length;
  await review.locator('[name="title"]').fill("Corrected beginning");
  await review.locator('[name="artist"]').fill("Manual Performer");
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 700)));
  check("No catalogue search or automatic validation while editing", musicRequests.length === beforeReviewRequests && await review.isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  check("Review text survives responsive rendering", await review.locator('[name="artist"]').inputValue() === "Manual Performer");
  await page.screenshot({ path: join(folder, "departure-review-mobile.png"), fullPage: true });
  const correctionSaved = page.waitForResponse(response => response.url() === `${base}/api/departure/correction` && response.ok());
  await review.locator('button[type="submit"]').click(); await correctionSaved;
  await page.waitForFunction(() => !document.querySelector(".departure-review"));
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent.includes("Corrected beginning"));
  const correctedGraph = await fetch(`${base}/api/graph`).then(r => r.json());
  check("Correction is persisted without erasing the original title", correctedGraph.entities[seedId].departureCorrection.artist === "Manual Performer" && correctedGraph.entities[seedId].departureCorrection.originalTitle === videos[0].title);
  const late = await fetch(`${base}/api/resolution`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video: videos[0], identity: { id: "old-wrong-artist", canonicalName: "Release" } }) });
  check("Late resolution of the original departure is rejected", late.status === 409);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByText("Fiche du départ et historique", { exact: true }).click();
  await page.getByRole("button", { name: "Corriger le titre ou l’artiste", exact: true }).click();
  await review.waitFor();
  check("History correction reopens the saved title and artist", await review.locator('[name="title"]').inputValue() === "Corrected beginning" && await review.locator('[name="artist"]').inputValue() === "Manual Performer");
  await review.locator('[name="artist"]').fill("Unsaved draft");
  await page.locator("#workspace-change-seed").click(); await page.locator("#seed-type").selectOption("artist"); await page.locator("#seed-search").fill("6SISS");
  await page.locator('[data-seed-id="artist:local:6siss"]').click(); await page.locator("#launch-seed").click();
  await page.locator("#departure-artist-query").waitFor();
  check("Local artist is prefilled without becoming a song", await page.locator("#departure-artist-query").inputValue() === "6SISS" && !(await page.locator(".departure-identity-form").innerText()).includes("uniquement ce morceau"));
  await page.locator("[data-search-departure-artist]").click();
  await page.locator('[data-confirm-departure-artist="artist:discogs:60"]').waitFor();
  await page.screenshot({ path: join(folder, "artist-choice.png") });
  const savedArtist = page.waitForResponse(response => response.url() === `${base}/api/exploration/session`
    && response.request().method() === "PUT" && response.request().postDataJSON()?.session?.seed?.id === exactArtist.id && response.ok());
  await page.locator('[data-confirm-departure-artist="artist:discogs:60"]').click();
  await page.waitForFunction(() => !document.querySelector("#departure-artist-query"));
  await savedArtist;
  const session = await (await fetch(`${base}/api/exploration/session`)).json();
  check("Chosen remote artist ID survives navigation and persistence", (session.session?.seed || session.seed)?.id === exactArtist.id);
  await page.screenshot({ path: join(folder, "artist-exact-departure.png") });
  await page.locator("#workspace-change-seed").click(); await page.locator("#seed-type").selectOption("label"); await page.locator("#seed-search").fill("Fixture Records");
  await page.locator('[data-seed-id="label:discogs:77"]').click(); await page.locator("#launch-seed").click();
  await page.locator(".departure-members").waitFor();
  check("Label keeps its kind and exposes local edition tracks", await page.locator("#departure-artist-query").count() === 0 && await page.locator('[data-departure-member="track:discogs:700:0"]').count() === 1);
  await page.screenshot({ path: join(folder, "label-departure.png") });
  check("No uncaught browser exception", errors.length === 0);
} catch (error) {
  failure = error;
  if (page) await page.screenshot({ path: join(folder, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  await writeFile(join(folder, "report.json"), JSON.stringify({ engine, checks, errors, interceptedExternalOrigins: [...new Set(forbidden)], musicRequests, serverLog, failure: failure?.stack || null }, null, 2));
  await browser?.close(); server.kill("SIGTERM"); await new Promise(resolve => upstream.close(resolve));
}
if (failure) throw failure;
console.log(`PASS ${checks.length} checks; report ${join(folder, "report.json")}`);
