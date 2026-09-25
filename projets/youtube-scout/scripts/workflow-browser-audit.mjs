import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { discogsReleaseGraph } from "../lib/catalogue.mjs";
import { catalogueArtistChoices } from "../public/departure-workflow.mjs";

// All accounts, catalogues and playlists below are synthetic. No personal
// browser/profile or production store is opened. External requests never leave.
const engine = process.env.SCOUT_AUDIT_BROWSER || "firefox";
const pw = await import(process.env.SCOUT_PLAYWRIGHT_MODULE || "playwright");
const folder = await mkdtemp(join(tmpdir(), "scout-workflow-ui-"));
console.log(`Artifacts: ${folder}`);
const upstream = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url.startsWith("/oauth/identity")) {
    res.statusCode = req.headers.authorization?.includes("AuditValidToken12345678901234567890") ? 200 : 401;
    return res.end(JSON.stringify({ username: "audit-fixture", id: 1 }));
  }
  res.end(JSON.stringify({ releases: [], recordings: [], artists: [], results: [], pagination: { pages: 1 } }));
});
upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
const root = `http://127.0.0.1:${upstream.address().port}`;
const probe = createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url),
  env: { ...process.env, PORT: String(port), SCOUT_DATA_FILE: join(folder, "state.json"), DISCOGS_TOKEN_FILE: join(folder, "token"),
    DISCOGS_TOKEN: "", SPOTIFY_TOKEN: "", APPLE_MUSIC_TOKEN: "", SOUNDCLOUD_TOKEN: "",
    MUSICBRAINZ_ROOT: root, MUSICBRAINZ_INTERVAL: "0", WIKIDATA_ROOT: root, DISCOGS_ROOT: root,
    LISTENBRAINZ_ROOT: root, APPLE_MUSIC_ROOT: root, SPOTIFY_ROOT: root, YOUTUBE_THUMBNAIL_ROOT: root }, stdio: ["ignore", "pipe", "pipe"] });
let browser, page, badKey = false, delayBranch = false, identityFailure = false, delayRecording = false, curatorAvailable = false;
const errors = [], checks = [], interactions = [], browserEvents = [], inventory = new Map(), requests = [], directionRequests = [];
const check = (label, result) => { assert.ok(result, label); checks.push(label); console.log(`PASS ${label}`); };
const fixtureVideos = Array.from({ length: 18 }, (_, i) => ({ id: i ? `audit${String(i).padStart(6, "0")}` : "ddN4SBU6k30",
  title: i ? `Archive ${i} - Audit Track` : '"Space Travel" - Nexxor - Statik Travel 21', channelTitle: "Audit Channel",
  channelId: "UC1234567890123456789012", durationSeconds: 360, publishedAt: "2020-01-01T00:00:00Z", playlistIds: ["PLfixture123"], playlistNames: ["Audit playlist"] }));
const uploads = Array.from({ length: 200 }, (_, i) => ({ id: `upload${String(i).padStart(5, "0")}`, title: `Publication ${i} de la même chaîne`, channelTitle: "Audit Channel", channelId: fixtureVideos[0].channelId, publishedAt: "2021-01-01T00:00:00Z" }));
const click = async selector => { interactions.push({ action: "click", selector }); await page.locator(selector).click(); };
const fill = async (selector, value) => { interactions.push({ action: "fill", selector }); await page.locator(selector).fill(value); };
const select = async (selector, value) => { interactions.push({ action: "select", selector }); await page.locator(selector).selectOption(value); };
const scan = async stage => {
  for (const item of await page.locator("button,input,select,textarea,summary,a[href]").evaluateAll(nodes => nodes.filter(n => n.checkVisibility()).map(n => ({
    id: n.id, tag: n.tagName, type: n.type || "", text: (n.getAttribute("aria-label") || n.textContent || n.labels?.[0]?.textContent || "").trim().slice(0, 100), disabled: Boolean(n.disabled)
  })))) inventory.set(`${stage}:${item.id || `${item.tag}:${item.text}`}`, { stage, ...item });
};
const openDetails = async selector => { if (!await page.locator(selector).evaluate(n => n.open)) await click(`${selector} > summary`); };
const waitText = async (selector, expression) => { await page.waitForFunction(({ selector, expression }) => new RegExp(expression, "i").test(document.querySelector(selector)?.textContent || ""), { selector, expression }); };
const put = async delta => { const res = await fetch(`${base}/api/graph/ingest`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) }); assert.equal(res.ok, true); };
try {
  await Promise.race([once(server.stdout, "data"), new Promise((_, reject) => setTimeout(() => reject(new Error("startup")), 5000))]);
  browser = await pw[engine].launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }); page.setDefaultTimeout(12000);
  await page.exposeBinding("auditControl", (_, event) => browserEvents.push(event));
  await page.addInitScript(() => {
    for (const type of ["click", "change", "input", "keydown"]) document.addEventListener(type, event => {
      const n = event.target.closest?.("button,input,select,textarea,summary,a[href]");
      if (n) window.auditControl({ type, id: n.id, tag: n.tagName, label: (n.getAttribute("aria-label") || n.textContent || n.labels?.[0]?.textContent || "").trim().slice(0, 100), key: type === "keydown" ? event.key : undefined });
    }, true);
  });
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.hostname === "accounts.google.com") return route.fulfill({ contentType: "application/javascript", body: 'window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:"audit-oauth-token",expires_in:3600,scope:"https://www.googleapis.com/auth/youtube.readonly"})})}}};' });
    if (url.hostname === "www.googleapis.com") {
      const endpoint = url.pathname.split("/").at(-1);
      if (endpoint === "channels") directionRequests.push("curator");
      if (endpoint === "channels" && curatorAvailable) return json({ items: [{ id: fixtureVideos[0].channelId, contentDetails: { relatedPlaylists: { uploads: "UUfixture12345678" } } }] });
      if (badKey && endpoint === "i18nRegions") return json({ error: { message: "Fixture invalid key" } }, 403);
      if (endpoint === "playlists") return json({ items: [{ id: "PLfixture123", snippet: { title: "Audit playlist" }, contentDetails: { itemCount: 18 }, status: { privacyStatus: "public" } }] });
      if (endpoint === "playlistItems") {
        const offset=Number(url.searchParams.get("pageToken") || 0), isUploads=url.searchParams.get("playlistId")==="UUfixture12345678";
        const rows=isUploads ? uploads.slice(offset,offset+50) : fixtureVideos;
        return json({ ...(isUploads && offset+50<uploads.length ? { nextPageToken:String(offset+50) } : {}), items: rows.map((v, i) => ({ contentDetails: { videoId: v.id, videoPublishedAt: v.publishedAt }, snippet: { title: v.title, resourceId: { videoId: v.id }, position: offset+i, publishedAt: v.publishedAt, videoOwnerChannelId: v.channelId, videoOwnerChannelTitle: v.channelTitle } })) });
      }
      if (endpoint === "videos") return json({ items: [...fixtureVideos,...uploads].filter(v=>(url.searchParams.get("id")||"").split(",").includes(v.id)).map(v => ({ id: v.id, snippet: { title: v.title, channelTitle: v.channelTitle, channelId: v.channelId, categoryId: "10", publishedAt: v.publishedAt, tags: [] }, contentDetails: { duration: "PT6M" }, statistics: { viewCount: "40" }, status: { privacyStatus: "public" } })) });
      return json({ items: [{ id: "fixture" }] });
    }
    if (url.origin !== base) return route.abort();
    if (url.pathname.startsWith("/api/music/")) requests.push(url.pathname);
    if (url.pathname === "/api/music/artist-choices") return identityFailure ? json({ message: "Catalogue fixture indisponible" }, 503) : json({ candidates: catalogueArtistChoices({ entities: [{ id: "artist:discogs:3860526", type: "artist", name: "Nexxor", externalIds: { discogs: "3860526" } }] }, url.searchParams.get("name")), sourceStates: {} });
    if (url.pathname === "/api/music/recording") { if (delayRecording) await new Promise(resolve => setTimeout(resolve, 1200)); return json({ status: "not_found", candidates: [], resolved: null }); }
    if (url.pathname === "/api/music/identity") return identityFailure ? json({ message: "Catalogue fixture indisponible" }, 503) : json({ requestedName: url.searchParams.get("name"), claims: url.searchParams.get("name") === "Nexxor" ? [{ field: "name", source: "discogs", sourceId: "3860526", value: "Nexxor", status: "candidate" }] : [], sourceStates: {}, resolution: { status: "unresolved" } });
    if (url.pathname === "/api/music/branch") directionRequests.push(url.searchParams.get("direction"));
    if (delayBranch && url.pathname === "/api/music/branch") await new Promise(resolve => setTimeout(resolve, 800));
    return route.continue();
  });
  await page.goto(base); await page.locator("#workspace-empty").waitFor(); await scan("empty");
  await click("#workspace-change-seed");
  check("Empty picker explains import and cannot launch", await page.locator("#launch-seed").isDisabled() && (await page.locator(".finder-empty").innerText()).includes("importez"));
  await page.keyboard.press("Escape");
  await click('[data-view="sources"]'); await scan("sources-initial");
  await fill("#client-id", "invalid"); await click("#save-client-id");
  check("Invalid OAuth client is not saved", (await page.locator("#client-id-state").innerText()).includes("non enregistré"));
  await fill("#client-id", "audit.apps.googleusercontent.com"); await click("#save-client-id");
  check("Valid OAuth client persists", await page.evaluate(() => localStorage.getItem("youtube-scout.client-id.v1")) === "audit.apps.googleusercontent.com");
  badKey = true; await fill("#api-key", "audit-key"); await click("#verify-api-key"); await waitText("#source-message", "impossible");
  check("Invalid API access is visible and configuration stays open", await page.locator("#youtube-settings").evaluate(n => n.open));
  badKey = false; await click("#verify-api-key"); await waitText("#connection-summary", "vérifiée");
  check("Verified API settings close", !await page.locator("#youtube-settings").evaluate(n => n.open));
  await click("#connection-recheck"); await waitText("#connection-summary", "vérifiée");
  await openDetails("#youtube-settings"); await click("#connect"); await waitText("#connection-state", "Connecté");
  await page.locator("#playlists input").waitFor(); await click("#refresh-owned-playlists");
  check("Mock OAuth loads owned playlists", await page.locator("#playlists input").count() === 1);
  await openDetails("#youtube-settings"); await click("#disconnect");
  check("Disconnect removes only temporary OAuth access", !await page.evaluate(() => sessionStorage.getItem("youtube-scout.oauth-session.v1")));
  await openDetails("#playlist-links"); await fill("#playlist-urls", "nonsense"); await click("#inspect-urls"); await waitText("#source-message", "valide|collez");
  await fill("#playlist-urls", "https://www.youtube.com/playlist?list=PLfixture123"); await click("#inspect-urls"); await waitText("#source-message", "ajoutée");
  await click("#select-none"); check("No selection disables import", await page.locator("#import-playlists").isDisabled());
  await click("#select-all"); await page.locator("#playlists input").uncheck(); await page.locator("#playlists input").check();
  await click("#import-playlists"); await waitText("#workspace-library-summary", "18 vidéos");
  check("Real import UI persists fixture videos", (await page.locator("#workspace-library-summary").innerText()).startsWith("18 vidéos"));
  await openDetails("#discogs-settings"); await click("#save-discogs-token"); await waitText("#discogs-token-message", "Collez");
  await fill("#discogs-token", "short"); await click("#save-discogs-token"); await waitText("#discogs-token-message", "incomplet");
  await fill("#discogs-token", "AuditInvalidToken12345678901234567890"); await click("#save-discogs-token"); await waitText("#discogs-token-message", "invalide|refus|401");
  await fill("#discogs-token", "AuditValidToken12345678901234567890"); await click("#save-discogs-token"); await waitText("#discogs-state", "vérifié");
  check("Discogs token field clears after save", await page.locator("#discogs-token").inputValue() === "");
  await openDetails("#discogs-settings"); page.once("dialog", d => d.dismiss()); await click("#remove-discogs-token");
  check("Cancelling token removal preserves it", await page.locator("#remove-discogs-token").isVisible());
  page.once("dialog", d => d.accept()); await click("#remove-discogs-token"); await waitText("#discogs-token-message", "supprimé");
  await openDetails("#catalogue-tools"); await scan("catalogue-tools");
  await fill("#bandcamp-url", "https://example.org/album/no"); await fill("#bandcamp-artist", "Audit Artist"); await fill("#bandcamp-title", "Audit Release");
  await click('#bandcamp-entry-form button[type="submit"]'); await waitText("#bandcamp-import-status", "Bandcamp");
  check("Non-Bandcamp form URL rejected", !(await page.locator("#bandcamp-import-status").innerText()).includes("enregistrée"));
  await fill("#bandcamp-url", "https://fixture.bandcamp.com/album/audit"); await fill("#bandcamp-label", "Audit Label"); await fill("#bandcamp-tracks", "One\nTwo");
  await click('#bandcamp-entry-form button[type="submit"]'); await waitText("#bandcamp-import-status", "enregistrée");
  const uploadDetails = page.locator("#bandcamp-import").locator("xpath=ancestor::details[1]"); await uploadDetails.locator(":scope > summary").click();
  await page.locator("#bandcamp-import").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") }); await waitText("#bandcamp-import-status", "requ|URL|lien");
  await page.locator("#bandcamp-import").setInputFiles({ name: "valid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ sourceUrl: "https://fixture.bandcamp.com/album/two", artist: "Audit Artist", title: "Second Release" })) }); await waitText("#bandcamp-import-status", "enregistrée");
  await fill("#platform-isrc", "bad"); await fill("#platform-territory", "FR"); await click("#platform-compare-submit"); await waitText("#platform-compare-results", "ISRC");
  await fill("#platform-isrc", "FRABC2600001"); await click("#platform-compare-submit"); await waitText("#platform-compare-results", "configur|trouvé|disponible");
  await openDetails("#backup-settings"); await scan("backup");
  const download = page.waitForEvent("download"); await click("#export-backup"); const backupDownload = await download; const backupPath = join(folder, "fixture-backup.json"); await backupDownload.saveAs(backupPath);
  const backupText = await readFile(backupPath, "utf8"); check("Export omits every fake credential", !/audit-key|AuditValidToken|audit-oauth-token/.test(backupText));
  await page.locator("#restore-backup").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") }); await waitText("#backup-status", "impossible");
  check("Rejected backup leaves the library intact", (await page.locator("#workspace-library-summary").innerText()).startsWith("18 vidéos"));
  await openDetails(".workspace-diagnostics"); await scan("diagnostics");
  check("Diagnostics show local version", /Scout/.test(await page.locator("#runtime-status").innerText()));

  const deltas = Array.from({ length: 12 }, (_, i) => discogsReleaseGraph({ id: 900 + i, title: `Audit Album ${i}`, artists: [{ id: i ? 990 + i : 3860526, name: i ? `Audit Artist ${i}` : "Nexxor" }], labels: [{ id: 777, name: "Audit Records" }], tracklist: [] }));
  await put({ entities: deltas.flatMap(d => d.entities), edges: deltas.flatMap(d => d.edges) });
  // Reproduce the real two-provider shape, including the historical mbid node.
  const mbid = "174ad015-820c-44ee-ac38-752e7871ad4c";
  await put({ entities: [`mbid:${mbid}`, `artist:musicbrainz:${mbid}`].map(id => ({ id, type: "artist", name: "Nexxor", externalIds: { musicbrainz: mbid } })), edges: [
    { from: `mbid:${mbid}`, to: `artist:musicbrainz:${mbid}`, kind: "same_identity", status: "confirmed_cross_id" },
    { from: `artist:musicbrainz:${mbid}`, to: "artist:discogs:3860526", kind: "same_identity", status: "confirmed_cross_id" }
  ] });
  await page.reload(); await click('[data-view="explore"]'); await click("#workspace-change-seed");
  await scan("picker-search");
  check("Picker defaults to all types without a hidden selection", await page.locator("#seed-type").inputValue() === "all" && await page.locator("#launch-seed").isDisabled());
  check("Picker has no route, depth or relation-count controls", await page.locator("#seed-dialog #exploration-directions, #seed-dialog #exploration-depth, #seed-dialog #seed-metrics").count() === 0 && !(await page.locator("#seed-results").innerText()).includes("liens connus"));
  await fill("#seed-search", "Audit");
  check("Unified search finds both playlists and videos without changing type", await page.locator('#seed-results [data-seed-id^="playlist:"]').count() > 0 && await page.locator('#seed-results [data-seed-id^="video:"]').count() > 0);
  await fill("#seed-search", "");
  for (const type of ["artist", "label", "playlist", "track"]) await select("#seed-type", type);
  await click("#more-seed-choices"); check("Picker pagination adds choices", await page.locator(".seed-result").count() > 8);
  await fill("#seed-search", "no matching title"); check("Empty search has feedback", await page.locator(".finder-empty").isVisible());
  await fill("#seed-search", "Space Travel");
  const requestsBeforeSelection = requests.length;
  await page.locator('[data-seed-id="video:youtube:ddN4SBU6k30"]').press("Space");
  check("Keyboard selection is explicit and makes no catalogue request", await page.locator('#seed-dialog').isVisible() && await page.locator('#launch-seed').isEnabled() && requests.length === requestsBeforeSelection);
  check("Selection is described and visibly pressed", (await page.locator('#seed-selection').innerText()).includes('Space Travel') && await page.locator('[data-seed-id="video:youtube:ddN4SBU6k30"]').getAttribute('aria-pressed') === 'true');
  await page.screenshot({ path: join(folder, "picker-selected.png") });
  await fill("#seed-search", "no matching title");
  check("Changing search clears the old pending selection", await page.locator('#launch-seed').isDisabled());
  await fill("#seed-search", "Space Travel"); await click('[data-seed-id="video:youtube:ddN4SBU6k30"]');
  const launchWasLocked = await page.locator('#launch-seed').evaluate(n => { n.click(); const locked=n.disabled; n.click(); return locked; });
  await page.locator("#departure-artist-query").waitFor(); await scan("blocked-identification");
  check("Immediate repeated launch is blocked synchronously", launchWasLocked);
  check("Exact reported title reaches a visible correction form", await page.locator("#departure-artist-query").inputValue() === "Nexxor");
  check("No ineffective DIG or tuning exposed while blocked", !await page.locator('.mix-actions').isVisible() && !await page.locator(".mix-tuning").isVisible());
  check("No catalogue search loops before identity confirmation", !requests.includes("/api/music/branch"));
  check("Cross-linked catalogue cards form one actionable artist", await page.locator(".identity-choice").count() === 1 && await page.locator(".identity-choice a").count() === 2);
  await page.screenshot({ path: join(folder, "identity-required.png"), fullPage: true });
  identityFailure = true; await fill("#departure-artist-query", "Offline Artist"); await click('[data-search-departure-artist]'); await waitText(".identity-search-status", "indisponible");
  check("Identity error leaves an editable query and retry action", await page.locator("#departure-artist-query").inputValue() === "Offline Artist" && await page.locator('.departure-identity-form [type="submit"]').isEnabled());
  const beforeNameSave = requests.length;
  await page.route("**/api/graph/ingest", route => route.fulfill({ status: 503, contentType: "application/json", body: '{}' }), { times: 1 });
  await click('[data-save-departure-artist]'); await waitText(".identity-save-status", "pas été enregistré");
  check("Failed local save stays editable and does not pretend success", await page.locator("#departure-artist-query").isEnabled() && !((await (await fetch(`${base}/api/graph`)).json()).entities["video:youtube:ddN4SBU6k30"]?.departureArtist));
  await click('[data-save-departure-artist]'); await waitText(".identity-save-status", "Nom enregistré : Offline Artist");
  check("Name saves despite offline catalogues, without any provider request", requests.length === beforeNameSave);
  let namedGraph = await (await fetch(`${base}/api/graph`)).json();
  check("Name is persisted without inventing a confirmed artist edge", namedGraph.entities["video:youtube:ddN4SBU6k30"].departureArtist.name === "Offline Artist" && !Object.values(namedGraph.edges).some(e => e.from === "video:youtube:ddN4SBU6k30" && e.status === "confirmed_user"));
  await page.reload(); await click("#workspace-resume"); await page.locator("#departure-artist-query").waitFor();
  check("Saved name survives reload without restarting failed identification", await page.locator("#departure-artist-query").inputValue() === "Offline Artist" && requests.length === beforeNameSave);
  await fill("#departure-artist-query", ""); await click('[data-save-departure-artist]');
  check("Empty manual name is rejected", !await page.locator("#departure-artist-query").evaluate(n => n.checkValidity()));
  await fill("#departure-artist-query", "X"); await page.locator("#departure-artist-query").press("Enter"); await waitText(".identity-save-status", "Nom enregistré : X");
  check("Enter saves a one-character artist without catalogue search", requests.length === beforeNameSave);
  identityFailure = false;
  await fill("#departure-artist-query", "Unknown Artist"); await click('[data-search-departure-artist]'); await waitText(".identity-search-status", "Aucune fiche");
  await fill("#departure-artist-query", "Nexxor"); await click('[data-save-departure-artist]'); await waitText(".identity-save-status", "Nom enregistré : Nexxor");
  await click('[data-search-departure-artist]'); await waitText(".identity-search-status", "vérifier");
  check("Search alone never confirms the artist", !Object.values((await (await fetch(`${base}/api/graph`)).json()).edges || {}).some(e => e.from === "video:youtube:ddN4SBU6k30" && e.kind === "probable_artist" && e.status === "confirmed_user"));
  await click('[data-confirm-departure-artist="artist:discogs:3860526"]');
  const cards = page.locator(".mix-grid .derived-card"); await cards.first().waitFor(); await scan("results");
  check("Manual confirmation yields genuine graph-linked fixture results", await cards.count() > 0);
  await page.waitForFunction(() => document.querySelector('[data-action="stop"]')?.hidden);
  const beforeViewTools = requests.length;
  await select("#scout-result-sort", "title");
  const titlesSorted = await cards.locator("h3").allTextContents();
  check("Title sort is natural and global before pagination", JSON.stringify(titlesSorted) === JSON.stringify([...titlesSorted].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true,sensitivity:'base'}))));
  await page.locator("#scout-other-artists").check();
  check("Other-artists filter is local and leaves linked discoveries", await cards.count()>0 && requests.length===beforeViewTools);
  await page.locator("#scout-other-artists").uncheck();
  await select("#scout-result-sort", "release-new");
  check("Release sorting explains that upload dates are never substituted", (await page.locator('.mix-view-help').innerText()).includes('jamais l’upload'));
  await select("#scout-result-sort", "explore");
  check("Results are visible without an expanded wall of settings", !await page.locator("#scout-settings").evaluate(n=>n.open) && await cards.first().evaluate(n=>n.getBoundingClientRect().top<innerHeight));
  await page.screenshot({ path: join(folder, "results.png"), fullPage: true });
  await page.reload(); await click("#workspace-resume"); await cards.first().waitFor();
  check("Explicit resume restores confirmed departure and results", (await page.locator(".mix-source-name").innerText()).includes("Space Travel") && !await page.locator("#departure-artist-query").isVisible());
  const pageTitles = await cards.locator("h3").allTextContents();
  const paginationRequests = requests.length; await click('[data-action="next"]');
  check("Local pagination changes results without provider calls", JSON.stringify(await cards.locator("h3").allTextContents()) !== JSON.stringify(pageTitles) && requests.length === paginationRequests);
  await openDetails("#scout-settings"); await openDetails(".mix-tuning"); await scan("tuning");
  check("A new departure no longer silently selects only labels", await page.locator("#scout-param-direction-remix-weight").inputValue() === "1");
  const before = requests.length;
  for (const route of ["label", "remix", "featuring", "compilation", "alias", "curator", "scene", "era"]) {
    await openDetails(`.mix-route:has([data-route-toggle="${route}"]) .mix-route-details`);
    await fill(`#scout-param-direction-${route}-weight`, "0.5"); await page.locator(`#scout-param-direction-${route}-weight`).dispatchEvent("input");
    await click(`.mix-route:has([data-route-toggle="${route}"]) .mix-route-details > summary`);
  }
  await fill("#scout-param-shape-spread", "0.4"); await page.locator("#scout-param-shape-spread").dispatchEvent("input");
  for (const depth of ["3", "9", "6"]) await page.getByRole("button", { name: depth, exact: true }).click();
  check("Activating all is disabled when every route is already enabled", await page.locator('[data-action="reset"]').isDisabled());
  await click('[data-route-toggle="remix"]');
  await click('[data-action="reset"]');
  check("All tuning controls are local until explicit search", requests.length === before);
  await click('.mix-tuning > summary');
  await cards.first().locator("[data-continue]").click();
  await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent.includes("Audit Album"));
  await click(".mix-source-back"); await page.waitForFunction(() => document.querySelector(".mix-source-name")?.textContent.includes("Space Travel")); await cards.first().waitFor();
  check("Continue and back restore the correct departure", (await page.locator(".mix-source-name").innerText()).includes("Space Travel"));
  await cards.first().locator(".catalogue-proof > summary").click(); await cards.first().locator(".catalogue-proof > summary").click();
  await cards.first().locator("[data-keep]").click();
  await click('[data-view="notebook"]'); await scan("notebook");
  await fill(".notebook-card textarea", "Audit note"); await select(".notebook-card select", "listen"); await page.locator(".notebook-card textarea").blur();
  await fill("#notebook-search", "absent"); check("Notebook search filters cards", !await page.locator(".notebook-card").isVisible());
  await fill("#notebook-search", "Audit note"); await select("#notebook-filter", "kept"); check("Notebook status filter works", !await page.locator(".notebook-card").isVisible());
  await select("#notebook-filter", "listen"); check("Matching note and status restore card", await page.locator(".notebook-card").isVisible());
  const notebookDownload = page.waitForEvent("download"); await click("#export-notebook"); await (await notebookDownload).saveAs(join(folder, "fixture-notebook.json"));
  await click(".remove-notebook"); await page.getByRole("button", { name: "Annuler", exact: true }).click();
  check("Notebook removal can be undone without losing the note", await page.locator(".notebook-card textarea").inputValue() === "Audit note");
  await click('[data-view="explore"]');
  const seedBefore = await page.locator(".mix-source-name").innerText(), cardsBefore = await cards.locator("h3").allTextContents();
  await click("#workspace-change-seed"); await click('[data-picker-mode="suggest"]'); await scan("suggestions");
  check("Suggestion mode hides direct search", !await page.locator("#seed-search").isVisible());
  for (const preset of ["fresh", "network", "archive", "surprise"]) await click(`[data-mission="${preset}"]`);
  await openDetails(".suggestion-options");
  const lenses = await page.locator("input[data-source-lens]").all(); assert.equal(lenses.length, 7);
  for (const input of lenses) { await input.check(); await input.uncheck(); }
  await fill("#source-temperature", "45"); await page.locator("#source-temperature").dispatchEvent("input");
  await fill("#max-duration", "0"); await click("#compose"); check("Invalid duration blocked by form validation", !await page.locator("#max-duration").evaluate(n => n.checkValidity()));
  await fill("#max-duration", "240"); await page.locator("#hide-seen").uncheck(); await click("#compose");
  await page.locator("#videos .video-card").first().waitFor(); await scan("suggestion-results");
  await click("#reroll-programme");
  const suggestion = page.locator("#videos .video-card").first(); await suggestion.locator(".suggestion-card-details > summary").click();
  await suggestion.locator(".pin-button").click(); await suggestion.locator(".suggestion-card-details > summary").click(); await suggestion.locator(".reroll-card").click();
  check("Suggestions from playlists offer departure selection, not notebook saving", await page.locator('#seed-dialog .keep-button, #seed-dialog .seen-button, #reserve-list button:not(.seed-button)').count()===0);
  await select('#seed-sort','title');
  await openDetails('#reserve-panel');
  const reserveChoice=page.locator('#reserve-list .seed-button').first();
  await reserveChoice.click();
  check("Every reserve track can become a departure without entering the notebook", await page.locator('#launch-seed').isEnabled() && await page.locator('#nav-kept-count').innerText()==='1');
  await suggestion.locator(".seed-button").click();
  check("Suggested departure uses the same explicit launch step", await page.locator("#seed-dialog").isVisible() && await page.locator("#launch-seed").isEnabled() && await page.locator(".mix-source-name").innerText() === seedBefore);
  await page.keyboard.press("Escape");
  check("Closing the picker returns focus to its opener", await page.locator('#workspace-change-seed').evaluate(n => n === document.activeElement));
  check("Suggestion actions preserve the active departure and results", await page.locator(".mix-source-name").innerText() === seedBefore && JSON.stringify(await cards.locator("h3").allTextContents()) === JSON.stringify(cardsBefore));
  check("Duplicate route module and secondary cards are removed", await page.locator("#scout-route-inspector, #direction-panel, #direction-tabs, .discovery-group, .branch-card").count() === 0);
  const filterRequests = requests.length;
  for (const id of ["label", "remix", "featuring", "compilation", "alias", "curator", "scene", "era", ""]) await select("#scout-result-direction", id);
  check("Result filter only changes the single list, never queries providers", requests.length === filterRequests);
  await select("#scout-result-direction", "label");
  check("Route filter shows only label proofs in the single list", (await cards.locator(".mix-origin").allTextContents()).every(text => text.includes("Labels")));
  await openDetails('#scout-settings');
  await click('[data-route-toggle="label"]');
  check("Disabling the displayed direction clears its stale filter", await page.locator('#scout-result-direction').inputValue()==='');
  check("A disabled direction cannot be selected as an empty view", await page.locator('#scout-result-direction option[value="label"]').isDisabled());
  await click('[data-route-toggle="label"]');
  await select("#scout-result-direction", "");
  await openDetails("#scout-settings");
  await page.locator('[data-route-toggle="label"]').press("Space");
  check("Keyboard deactivation updates the same route weight", await page.locator("#scout-param-direction-label-weight").inputValue() === "0");
  await click('[data-route-toggle="label"]');
  await click('[data-action="rewind"]');
  check("Rewinding presentation history restores local results without providers", await cards.count() > 0 && requests.length === filterRequests);
  for (const id of ["label", "remix", "featuring", "compilation", "alias", "curator", "scene", "era"]) {
    await click(`[data-route-toggle="${id}"]`);
    check(`Toggle ${id} disables its own weight`, await page.locator(`#scout-param-direction-${id}-weight`).inputValue() === "0");
    await click(`[data-route-toggle="${id}"]`);
    check(`Toggle ${id} reactivates its own weight`, await page.locator(`#scout-param-direction-${id}-weight`).inputValue() === "1");
  }
  check("Direction activation never starts a hidden provider query", requests.length === filterRequests);
  const beforeAll = directionRequests.length;
  await click('[data-action="dig"]');
  await page.waitForFunction(() => document.querySelector('[data-action="stop"]')?.hidden);
  const loadedDirections = directionRequests.slice(beforeAll);
  check("Search attempts every enabled unconsulted direction, not only Labels", ["remix", "featuring", "compilation", "alias", "curator", "scene", "era"].every(id => loadedDirections.includes(id)));
  check("Unknown directions are attempted before any repeat", new Set(loadedDirections.slice(0, 7)).size === 7);
  await openDetails('.mix-route:has([data-route-toggle="curator"]) .mix-route-details');
  check("Unavailable source is distinguished from an untried route", (await page.locator("#scout-route-state-curator").innerText()).includes("indisponible") && (await page.locator('.mix-route:has([data-route-toggle="curator"]) .mix-route-details').innerText()).includes("pas accessible"));
  await page.screenshot({ path: join(folder, "unified-directions.png"), fullPage: true });
  delayBranch = true; await click('[data-action="dig"]'); await page.locator('[data-action="stop"]').waitFor(); await click('[data-action="stop"]'); delayBranch = false;
  check("Stopping a search preserves current departure", await page.locator(".mix-source-name").innerText() === seedBefore);
  // Regression from the user's 200-loaded / 1-displayed / Next-disabled case.
  curatorAvailable=true;
  for (const id of ["label","remix","featuring","compilation","alias","scene","era"]) await click(`[data-route-toggle="${id}"]`);
  await openDetails('.mix-tuning');
  await fill("#scout-param-shape-spread", "1"); await page.locator("#scout-param-shape-spread").dispatchEvent("input");
  await click('.mix-tuning > summary');
  for (let round=0; round<2; round++) { await click('[data-action="dig"]'); await page.waitForFunction(()=>document.querySelector('[data-action="stop"]')?.hidden); }
  check("Four real upload pages accumulate 200 same-channel videos", (await page.locator("#scout-route-state-curator").innerText()).includes("200 chargées"));
  await click('#scout-settings > summary');
  await select("#scout-result-direction", "curator");
  check("Focused channel displays six cards and an enabled Next", await cards.count()===6 && !await page.locator('[data-action="next"]').isDisabled());
  check("Counter distinguishes current six from 194 remaining", (await page.locator('.mix-result-count').innerText()).includes("194 autres"));
  const uploadRequests=directionRequests.length, seenUploads=new Set();
  for (let i=0;i<8;i++) {
    for(const title of await cards.locator('h3').allTextContents()){ assert.ok(!seenUploads.has(title),`Repeated page item: ${title}`); seenUploads.add(title); }
    await click('[data-action="next"]');
  }
  check("Eight channel pages advance without duplicates or catalogue calls", seenUploads.size===48 && directionRequests.length===uploadRequests);
  await cards.first().locator('.catalogue-proof > summary').click();
  await cards.first().locator('[data-keep]').focus();
  await select('#scout-result-direction','curator');
  check("A routine rerender keeps an open proof", await cards.first().locator('.catalogue-proof').evaluate(n=>n.open));
  await click('[data-action="clear-filter"]');
  check("Removing the filter does not collapse a lone channel to one card", await cards.count()===6 && await page.locator('#scout-result-direction').inputValue()==="");
  await click('[data-action="rewind"]');
  check("Rewind restores all 200 without clearing the library", (await page.locator('.mix-result-count').innerText()).includes('194 autres'));
  await page.reload(); await click('#workspace-resume'); await cards.first().waitFor();
  await select('#scout-result-direction','curator');
  check("Reload and resume keep six cards and working pagination", await cards.count()===6 && !await page.locator('[data-action="next"]').isDisabled());
  await page.screenshot({path:join(folder,'channel-pagination.png'),fullPage:true});
  await openDetails('#scout-settings'); await click('[data-action="reset"]');
  await select('#scout-result-direction','curator');
  check("Focused results explain that other active routes are hidden", (await page.locator('.mix-filter-scope').innerText()).includes('Labels ('));
  await click('#scout-settings > summary');
  await page.setViewportSize({ width: 390, height: 844 }); await click("#workspace-change-seed"); await scan("mobile-picker");
  check("Mobile picker remains inside viewport", await page.locator("#seed-dialog").evaluate(n => n.getBoundingClientRect().width <= innerWidth));
  check("Mobile launch stays visible without scrolling the dialog", await page.locator('#launch-seed').evaluate(n => { const r=n.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; }));
  await page.locator('.seed-result').first().click();
  check("Mobile selection enables the same launch button", await page.locator('#launch-seed').isEnabled());
  await page.locator('#departure-picker').evaluate(n => { n.scrollTop = n.scrollHeight; });
  check("Picker uses one scroll region with footer outside it", await page.locator('#seed-dialog').evaluate(n => {
    const scrollables=[n,...n.querySelectorAll('*')].filter(e => e.checkVisibility() && e.scrollHeight>e.clientHeight+1 && ['auto','scroll'].includes(getComputedStyle(e).overflowY));
    return scrollables.length === 1 && scrollables[0].id === 'departure-picker' && !scrollables[0].contains(document.querySelector('#launch-seed'));
  }));
  await page.locator('#departure-picker').evaluate(n => { n.scrollTop = 0; });
  await page.screenshot({ path: join(folder, "mobile-picker.png") }); await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 720, height: 500 }); await click('#workspace-change-seed');
  check("Reduced viewport (200 percent layout equivalent) keeps close and launch visible", await page.locator('#seed-dialog').evaluate(n => {
    const controls=[n.querySelector('header button'),n.querySelector('#launch-seed')];
    return controls.every(e=>{ const r=e.getBoundingClientRect(); return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth; });
  }));
  await page.screenshot({ path: join(folder, "picker-reduced-viewport.png") }); await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  check("Mobile has no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check("Escape closes a picker even from a populated search input", !await page.locator("#seed-dialog").isVisible());
  await page.screenshot({ path: join(folder, "mobile-exploration.png"), fullPage: true });
  check("Mobile results do not require expanding the settings", !await page.locator('#scout-settings').evaluate(n=>n.open) && await cards.first().isVisible());
  await openDetails('#scout-settings');
  check("All eight route toggles fit inside the mobile viewport", await page.locator("[data-route-toggle]").evaluateAll(nodes => nodes.length === 8 && nodes.every(n => { const b = n.getBoundingClientRect(); return b.width >= 44 && b.height >= 44 && b.left >= 0 && b.right <= innerWidth; })));
  await page.setViewportSize({ width: 1440, height: 1000 }); await openDetails("#scout-source-inspector");
  await page.getByRole("button", { name: "Ce n’est pas cet artiste · Nexxor", exact: true }).click(); await page.locator("#departure-artist-query").waitFor();
  check("Revoking a manual identity removes its discovery results", !await cards.first().isVisible());
  await click('[data-confirm-departure-artist="artist:discogs:3860526"]'); await cards.first().waitFor();
  check("An explicit re-confirmation restores the same scoped path", await cards.count() > 0);
  check("Correcting identity clears an obsolete result filter", await page.locator('#scout-result-direction').inputValue()==="");
  await page.waitForFunction(() => document.querySelector('[data-action="stop"]')?.hidden);
  const beforeConfigure = directionRequests.length;
  await select('#scout-result-sort', 'release-old');
  await page.locator('#scout-other-artists').check();
  await page.locator('#scout-distant-relations').check();
  await click('#workspace-change-seed'); await fill('#seed-search', 'Space Travel'); await page.locator('.seed-result').first().click(); await click('#launch-seed');
  await page.waitForFunction(() => document.querySelector('#scout-settings')?.open);
  await page.waitForFunction(() => document.querySelector('#launch-seed')?.textContent === 'Explorer ce départ →');
  check("Known departure opens the single settings panel without loading catalogue branches", directionRequests.length === beforeConfigure);
  check("Changing departure preserves sort and artist/distant-link preferences", await page.locator('#scout-result-sort').inputValue()==='release-old' && await page.locator('#scout-other-artists').isChecked() && await page.locator('#scout-distant-relations').isChecked());
  // This launch has completed its final save. Do not compare snapshots while
  // the preceding manual confirmation is still saving catalogue results.
  const beforeCancelSession = JSON.stringify((await (await fetch(`${base}/api/exploration/session`)).json()));
  await click('#workspace-change-seed'); await fill('#seed-search', 'Space Travel'); await page.locator('.seed-result').first().click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  check("Cancelling a pending departure does not write the active session", JSON.stringify((await (await fetch(`${base}/api/exploration/session`)).json())) === beforeCancelSession);
  delayRecording = true;
  await click("#workspace-change-seed"); await fill("#seed-search", "Archive 1 -"); await page.locator(".seed-result").first().click();
  await click("#launch-seed");
  await page.getByRole("button", { name: "Arrêter la vérification", exact: true }).click(); delayRecording = false;
  await page.locator("#departure-artist-query").waitFor();
  check("Stopping identification provides an editable next step", !await page.locator(".mix-actions").isVisible() && await page.locator("#departure-artist-query").isEnabled());
  check("Another departure does not inherit Nexxor from the previous name", await page.locator("#departure-artist-query").inputValue() !== "Nexxor");
  await page.setViewportSize({ width: 1440, height: 1000 }); await click('[data-view="sources"]');
  await openDetails(".danger-zone"); page.once("dialog", d => d.dismiss()); await click("#clear-library");
  check("Cancelling library clear preserves videos", (await page.locator("#workspace-library-summary").innerText()).startsWith("18 vidéos"));
  page.once("dialog", d => d.accept()); await click("#clear-library"); await waitText("#workspace-library-summary", "0 vidéos");
  await openDetails("#backup-settings"); page.once("dialog", d => d.accept()); await page.locator("#restore-backup").setInputFiles(backupPath); await waitText("#backup-status", "restaurée|restauré");
  check("Backup restores cleared fixture library", (await page.locator("#workspace-library-summary").innerText()).startsWith("18 vidéos"));
  check("No uncaught browser error across workflows", errors.length === 0);
  await writeFile(join(folder, "report.json"), JSON.stringify({ engine, fixtureOnly: true, checks, interactions, browserEvents, inventory: [...inventory.values()], errors, limits: ["Personal Google consent and real provider availability not exercised", "Inventory is not a claim that every dynamic control was exercised"] }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, interactions: interactions.length, browserEvents: browserEvents.length, controlsObserved: inventory.size, folder }));
} catch (error) {
  await page?.screenshot({ path: join(folder, "failure.png"), fullPage: true }).catch(() => {});
  await writeFile(join(folder, "failure.json"), JSON.stringify({ message: error.message, errors, checks, interactions, inventory: [...inventory.values()] }, null, 2));
  throw error;
} finally { await browser?.close(); server.kill("SIGTERM"); upstream.close(); }
