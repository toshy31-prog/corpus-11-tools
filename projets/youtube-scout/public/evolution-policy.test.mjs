import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { rankFreshDepartures, rememberExplored, suggestionRenewalMessage } from "./suggestion-memory.mjs";
import { sortMusic } from "./music-sorting.mjs";
import { buildScoutMixView, consumeMixPage } from "./scout-mix-session.mjs";
import { createBackup, validateBackup } from "./library-state.mjs";
import { selectedCatalogueEntity } from "./selected-catalogue-seed.mjs";
import { selectionSummary } from "./scout-mixer-panel.mjs";

const row = (id, artist = `Artist ${id}`, releaseId = `release:${id}`) => ({ id, title: `Title ${id}`, artist, releaseId, path: [{}], evidence: ["fixture"] });
const ids = items => items.map(item => item.id);
const select = (items, { exclude = [] }) => items.filter(item => !exclude.includes(item.id));

test("le hasard est stable à clé fixe, réversible, non destructif et réellement remélangeable", () => {
  const items = Array.from({ length: 30 }, (_, i) => row(String(i))), before = structuredClone(items);
  const first = ids(sortMusic(items, "random", { shuffleKey: "session-a" }));
  assert.deepEqual(ids(sortMusic(items, "random", { shuffleKey: "session-a" })), first);
  assert.notDeepEqual(ids(sortMusic(items, "random", { shuffleKey: "session-b" })), first);
  assert.notDeepEqual(first, ids(sortMusic(items, "title")));
  assert.deepEqual(items, before);
  assert.equal(new Set(first).size, 30);
});

test("le hasard trie le vivier entier puis pagine, sans répétition ni perte", () => {
  const items = Array.from({ length: 31 }, (_, i) => row(String(i)));
  const options = { seedId: "seed", groups: { label: { items } }, patch: { sort: "random", shuffleKey: "a" }, select, limit: 6 };
  let history = {}, seen = [];
  for (let page = 0; page < 6; page++) {
    const view = buildScoutMixView({ ...options, history });
    seen.push(...ids(view.items));
    history = consumeMixPage(history, view);
  }
  assert.deepEqual(seen, ids(sortMusic(items, "random", { shuffleKey: "a" })));
  assert.equal(new Set(seen).size, 31);
  assert.equal(buildScoutMixView({ ...options, history }).items.length, 0);
});

test("cocher puis décocher autres artistes restaure exactement le vivier et son historique", () => {
  const groups = { label: { items: [row("seed-work", "Seed"), row("other", "Other"), row("unknown", "")] } };
  const before = structuredClone(groups), history = { seedId: "seed", seenIds: [], turn: 0 };
  const options = { seedId: "seed", seedArtist: "Seed", groups, history, select, patch: { sort: "title" } };
  const all = ids(buildScoutMixView(options).items);
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(ids(buildScoutMixView({ ...options, patch: { ...options.patch, otherArtistsOnly: true } }).items), ["other"]);
    assert.deepEqual(ids(buildScoutMixView(options).items), all);
  }
  assert.deepEqual(groups, before);
  assert.deepEqual(history.seenIds, []);
});

test("un filtre hérité sans artiste de référence reste désactivable et ne masque rien", () => {
  const options = { seedId: "playlist:youtube:test", groups: { label: { items: [row("unknown", ""), row("known")] } }, select };
  const all = buildScoutMixView(options);
  const checked = buildScoutMixView({ ...options, patch: { otherArtistsOnly: true } });
  assert.equal(checked.canFilterArtists, false);
  assert.equal(checked.artistFilterApplied, false);
  assert.deepEqual(ids(checked.items), ids(all.items));
  assert.equal(checked.routes.find(route => route.id === "label").artistHidden, 0);
});

test("la pertinence diversifie albums et artistes mais conserve toutes les pistes accessibles", () => {
  const items = [...Array.from({ length: 8 }, (_, i) => row(`a${i}`, "Same", "album-a")), ...Array.from({ length: 6 }, (_, i) => row(`b${i}`, `Other ${i}`, `album-${i}`))];
  const options = { seedId: "seed", groups: { label: { items } }, select, patch: { sort: "relation", shape: { spread: 1 } } };
  const first = buildScoutMixView(options);
  assert.ok(new Set(first.items.map(item => item.artist)).size >= 4);
  let history = {}, all = [];
  for (let i = 0; i < 3; i++) { const view = buildScoutMixView({ ...options, history }); all.push(...ids(view.items)); history = consumeMixPage(history, view); }
  assert.equal(new Set(all).size, items.length);
});

test("les suggestions privilégient des vidéos ET des artistes non récemment explorés", () => {
  const history = { old: { lastShown: 200, timesShown: 2 }, explored: { lastExplored: 300, artistKey: "seed" } };
  const input = [row("old"), row("explored", "Seed"), row("same-artist", "Seed"), row("new-one"), row("new-two"), row("current")];
  const before = structuredClone(input), saved = structuredClone(history);
  const ranked = rankFreshDepartures(input, { history, avoidIds: ["current"] });
  assert.deepEqual(ids(ranked), ["new-one", "new-two", "old", "same-artist", "explored", "current"]);
  assert.equal(suggestionRenewalMessage(ranked.slice(0, 2)).includes("Nouveaux"), true);
  assert.match(suggestionRenewalMessage(ranked), /4 départs/);
  assert.deepEqual(input, before); assert.deepEqual(history, saved);
});

test("un vivier étroit réintroduit les répétitions explicitement, sans perdre les preuves", () => {
  const input = [row("a", "One"), row("b", "One"), row("c", "Two")];
  const history = Object.fromEntries(input.map((video, i) => [video.id, { lastShown: i + 1 }]));
  const ranked = rankFreshDepartures(input, { history });
  assert.deepEqual(ids(ranked), ["a", "c", "b"]);
  assert.match(suggestionRenewalMessage(ranked), /déjà proposés/);
  assert.deepEqual(ranked[0].evidence, ["fixture"]);
});

test("la mémoire d’exploration étend l’historique ancien et survit à l’export sans secrets", () => {
  const old = { v: { lastShown: 50, timesShown: 3, custom: "keep" } };
  const presented = rememberExplored(old, { id: "v", channelTitle: "Écho - Topic" }, { now: 80 });
  assert.deepEqual(presented.v, { ...old.v, lastExplored: 80, artistKey: "echo" });
  assert.equal(old.v.lastExplored, undefined);
  const restored = validateBackup(JSON.parse(JSON.stringify(createBackup({ local: { presented }, library: [] }))));
  assert.deepEqual(restored.local.presented, presented);
});

test("choisir une fiche artiste distante conserve son ID sans relation ni fusion par nom", () => {
  const seed = { id: "artist:discogs:123", type: "artist", label: "6SISS" };
  const entity = selectedCatalogueEntity(seed);
  assert.deepEqual(entity, { id: seed.id, type: "artist", name: "6SISS", externalIds: { discogs: "123" } });
  assert.equal(selectedCatalogueEntity({ id: "artist:local:x", type: "artist", label: "6SISS" }), null);
  assert.equal(selectedCatalogueEntity({ ...seed, externalIds: { discogs: "456" } }), null);
  assert.equal(selectedCatalogueEntity({ ...seed, type: "track" }), null);
  assert.equal(selectedCatalogueEntity({ ...seed, id: "artist:discogs:not-id" }), null);
});

test("une fiche label garde données antérieures et identifiant structuré valide", () => {
  const seed = { id: "label:discogs:44", type: "label", label: "Label" };
  const existing = { ...seed, note: "retained", externalIds: { discogs: "44" } };
  assert.equal(selectedCatalogueEntity(seed, existing).note, "retained");
  assert.equal(selectedCatalogueEntity({ id: "playlist:youtube:x", type: "playlist", label: "A" }), null);
});

test("les motifs d’arrêt ne confondent pas budget, panne et absence universelle", () => {
  const messages = ["target_reached", "request_budget", "source_unavailable", "source_not_configured", "needs_confirmation", "needs_identity", "documented_frontier_exhausted"].map(stopReason => selectionSummary({ applied: true, eligible: 2, stopReason }));
  assert.equal(new Set(messages).size, 7);
  assert.match(messages[1], /Budget/); assert.match(messages[3], /Accès/); assert.match(messages[6], /pas de l’ensemble/);
});

const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
const youtubeCode = app.slice(app.indexOf("async function youtube("), app.indexOf("async function fetchAll("));
function youtubeFixture(statuses, { renewable = true } = {}) {
  const requests = [], renews = [], invalidations = [];
  const context = { accessToken: "old", tokenExpiresAt: Date.now() + 3600_000, API_ROOT: "https://www.googleapis.com/youtube/v3", URL, AbortSignal,
    nodes: { apiKey: { value: "" } }, setTimeout,
    connectionPanel: { ensureAccessToken: async ({ force, rejectedToken } = {}) => { if (force) { renews.push(true); if (renewable) context.accessToken = "new"; else if (rejectedToken) { context.accessToken = ""; invalidations.push([rejectedToken, { renew: false }]); } } return context.accessToken; },
      accept: () => {}, invalidateOAuth: (...args) => invalidations.push(args) },
    fetch: async (url, options) => { requests.push({ url: String(url), ...options }); const status = statuses.shift() || 200; return { ok: status === 200, status, json: async () => status === 200 ? { items: ["fixture"] } : { error: { message: "Access rejected" } } }; }
  };
  vm.createContext(context); vm.runInContext(youtubeCode, context);
  return { context, requests, renews, invalidations };
}
test("un 401 renouvelle l’accès une seule fois et reprend exactement la lecture interrompue", async () => {
  const view = youtubeFixture([401, 200]);
  const result = await view.context.youtube("playlistItems", { pageToken: "page-2", playlistId: "private" });
  assert.equal(result.items[0], "fixture"); assert.equal(view.renews.length, 1);
  assert.equal(view.requests.length, 2); assert.equal(view.requests[0].url, view.requests[1].url);
  assert.equal(view.requests[0].headers.authorization, "Bearer old");
  assert.equal(view.requests[1].headers.authorization, "Bearer new");
  assert.equal(view.invalidations.length, 0);
});
test("deux refus successifs arrêtent la reprise et invalident sans boucle automatique", async () => {
  const view = youtubeFixture([401, 401, 200]);
  await assert.rejects(view.context.youtube("channels"), /Access rejected/);
  assert.equal(view.requests.length, 2); assert.equal(view.renews.length, 1);
  assert.equal(view.invalidations[0][1].renew, false);
});
test("un accès temporaire non renouvelable n’est pas rejoué indéfiniment", async () => {
  const view = youtubeFixture([401, 200], { renewable: false });
  await assert.rejects(view.context.youtube("channels"), /Access rejected/);
  assert.equal(view.requests.length, 1);
  assert.equal(view.invalidations[0][1].renew, false);
});
