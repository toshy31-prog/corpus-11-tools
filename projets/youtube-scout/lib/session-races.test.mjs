import test from "node:test";
import { recordingArtistHints } from "../public/artist-names.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseTrackCandidate } from "./identity.mjs";
import { hasExplicitDepartureArtist, declaredDepartureArtist, artistSearchHint } from "../public/departure-workflow.mjs";
import { createScoutPatch, SCOUT_DIRECTIONS } from "../public/scout-parameters.mjs";
import { selectedCatalogueEntity } from "../public/selected-catalogue-seed.mjs";
import { departureRoutingSnapshot } from "../public/departure-integrity.mjs";

const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function actualFunction(name, nextName, context) {
  context.recordingArtistHints ??= recordingArtistHints;
  context.hasExplicitDepartureArtist ??= hasExplicitDepartureArtist;
  context.declaredDepartureArtist ??= declaredDepartureArtist;
  context.initialScoutPatch ??= createScoutPatch;
  context.createScoutPatch ??= createScoutPatch;
  context.selectedCatalogueEntity ??= selectedCatalogueEntity;
  context.EXPLORATION_DIRECTIONS ??= SCOUT_DIRECTIONS;
  context.artistCorrections ??= {};
  for (const name of ["artistCache", "labelCache", "contextCache", "identityCache", "recordingCache", "videoSearchCache", "derivedPool", "externalSeeds"]) context[name] ??= new Map();
  context.departureRoutingSnapshot ??= departureRoutingSnapshot;
  context.explorationTransport ??= { start: async () => {} };
  context.fetch ??= async () => ({ ok: true });
  context.searchedLabels ??= new Set(); context.searchedCollaborators ??= new Set();
  if (context.nodes) context.nodes.explorationDirections ??= { querySelectorAll: () => [] };
  context.artistSearchHint ??= artistSearchHint;
  context.seedVideo ??= () => null;
  context.resolvedArtist ??= () => null;
  context.getScoutMixerView ??= () => ({ workflow: "search" });
  context.artistMemoryKey ??= name => `artist-query:v2:${JSON.stringify(String(name || "").normalize("NFC").trim())}`;
  const begin = app.indexOf(`async function ${name}(`);
  const end = app.indexOf(`async function ${nextName}(`, begin);
  assert.ok(begin >= 0 && end > begin, `Fonction ${name} présente dans app.js`);
  // SESSION_RACES_DEPTH_HELPER_V2:
  // openExploration dépend désormais du réglage de profondeur du synthé.
  // Ce VM de test extrait la fonction seule : on expose donc son helper,
  // sans modifier le code de production.
  context.currentExplorationDepth ??= () => {
    const value = Number(context.nodes?.explorationDepth?.value || 6);
    return [3, 6, 9].includes(value) ? value : 6;
  };
  vm.createContext(context);
  vm.runInContext(app.slice(begin, end), context);
  return context[name];
}

test("a graph response received out of order cannot erase newer knowledge", async () => {
  const older = deferred();
  let calls = 0;
  const context = {
    graphReadSequence: 0, compositionGeneration: 0, activeDig: {},
    fetch: async () => ({ ok: true, json: () => ++calls === 1 ? older.promise : Promise.resolve({ version: "new" }) }),
    sanitizeExplorationGraph: value => value,
    departureRoutingSnapshot,
    explorationLibrary: () => [], augmentExplorationGraph: value => value,
    projectActiveCollectionGraph: value => value, buildSeedCatalog: () => [],
    collaborationIndex: [], explorationSession: null, renderSeedOptions() {}
  };
  const begin = app.indexOf("async function refreshExplorationGraph(");
  const end = app.indexOf("\nfunction selectedExplorationDirections(", begin);
  vm.runInNewContext(app.slice(begin, end), context);
  const first = context.refreshExplorationGraph();
  await Promise.resolve();
  await context.refreshExplorationGraph();
  older.resolve({ version: "old" });
  await first;
  assert.equal(context.explorationGraph.version, "new");
});

test("browser identity requests do not share another punctuated artist's memory", async () => {
  const requests = [];
  const context = {
    discogsArtistConfirmations: {}, identityCache: new Map(), CLIENT_VERSION: "test", URLSearchParams, AbortSignal,
    registryStorageKey: name => `artist:${name.replace(/[^a-z]/gi, "")}`,
    artistMemoryKey: name => `artist-query:v2:${JSON.stringify(name)}`,
    writeCachedIdentity: async () => {}, readCachedIdentity: async () => null,
    fetch: async url => { requests.push(url); return { ok: true, json: async () => ({ requestedName: new URL(url, "http://test").searchParams.get("name") }) }; }
  };
  const begin = app.indexOf("function identityDetails(");
  const end = app.indexOf("\nfunction recordingDetails(", begin);
  vm.runInNewContext(app.slice(begin, end), context);
  assert.equal((await context.identityDetails("C++")).requestedName, "C++");
  assert.equal((await context.identityDetails("C")).requestedName, "C");
  assert.equal(requests.length, 2);
});

test("hostile catalogue URLs cannot become HTML or executable links", async () => {
  const container = { innerHTML: "", querySelectorAll: () => [], querySelector: () => null };
  const context = {
    recordingDetails: async () => ({ parsed: { status: "parsed", artist: "Fixture", title: "Track" }, candidates: [{ title: "Safe title", musicBrainzUrl: '\"><img data-xss="yes" src=x>' }], discogsCandidates: [{ title: "Safe", discogsUrl: "javascript:alert(1)", id: '\"><img src=x>' }] }),
    escapeHtml: value => String(value).replaceAll("&", "&amp;").replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    htmlUrl: value => /^https?:\/\//.test(value || "") ? value : "#"
  };
  const begin = app.indexOf("async function loadRecordingResolution(");
  const end = app.indexOf("\nasync function loadPlatformAvailability(", begin);
  vm.runInNewContext(app.slice(begin, end), context);
  await context.loadRecordingResolution(container, { id: "fixture" }, { name: "Fixture" });
  assert.doesNotMatch(container.innerHTML, /<img|href="javascript:/i);
});

test("late structured discovery is not registered against a newer departure", async () => {
  const search = deferred(), started = deferred();
  const registered = [];
  const context = {
    compositionGeneration: 1, currentProgramme: [{ id: "first", title: "First" }],
    fetch: async () => ({ ok: true, json: async () => ({ candidates: [{ artist: "A", title: "Track" }] }) }),
    findTrackVideo: async () => { started.resolve(); return search.promise; },
    registerDerived: (...args) => registered.push(args),
    escapeHtml: value => value, AbortSignal
  };
  const button = { parentElement: { querySelector: () => ({ innerHTML: "" }) }, dataset: { sourceVideo: "first" } };
  const begin = app.indexOf("async function loadStructuredDiscovery(");
  const end = app.indexOf("\nfunction sourceStateLabel(", begin);
  vm.runInNewContext(app.slice(begin, end), context);
  const pending = context.loadStructuredDiscovery(button, "fixture-recording");
  await started.promise;
  context.compositionGeneration = 2;
  search.resolve({ id: "discovery", title: "Old result" });
  await pending;
  assert.equal(registered.length, 0);
});

test("les gestes gardent le front en RAM et ne sauvegardent que les réglages", async () => {
  const gate = deferred();
  const browser = new Map();
  const persisted = [];
  const context = {
    explorationSession: { seed: { id: "A" }, branches: [{ direction: "label", status: "active" }] },
    activeDig: { seed: { id: "A" }, synthPatch: { shape: { depth: 6 } } }, currentDerivedIds: [], derivedPool: new Map(),
    CLIENT_VERSION: "test", EXPLORATION_KEY: "dig", structuredClone,
    explorationSaveQueue: gate.promise,
    EXPLORATION_SETTINGS_KEY: "settings", saveLocalObject: (key, value) => browser.set(key, JSON.stringify(value)),
    localStorage: { setItem: (key, value) => browser.set(key, value) },
    writeSyncState: async (_key, value) => persisted.push(value),
    fetch: async () => ({ ok: true })
  };
  context.setActiveDig = value => { context.activeDig = { ...context.activeDig, ...value }; };
  const begin = app.indexOf("async function persistExplorationSession(");
  const end = app.indexOf("\nfunction branchStatusLabel(", begin);
  assert.ok(begin >= 0 && end > begin);
  vm.runInNewContext(app.slice(begin, end), context);
  const first = context.persistExplorationSession();
  context.explorationSession = { seed: { id: "A" }, branches: [{ direction: "label", status: "paused" }] };
  const last = context.persistExplorationSession();
  assert.equal(context.activeDig.front.branches[0].status, "paused");
  gate.resolve();
  await Promise.all([first, last]);
  assert.equal(browser.has("dig"), false);
  assert.equal(persisted.length, 0);
  assert.deepEqual(JSON.parse(browser.get("settings")), { synthPatch: { shape: { depth: 6 } } });
});

test("fermer une fouille ne la ressuscite pas si une sauvegarde précédente était encore en file", async () => {
  const gate = deferred();
  const old = JSON.stringify({ schemaVersion: 2, seed: { id: "old" }, front: { seed: { id: "old" }, branches: [] }, updatedAt: "2026-09-13T12:00:00Z" });
  const browser = new Map([["dig", old]]);
  const indexed = {};
  let closed = false;
  let handler;
  const context = {
    nodes: { clearExploration: { addEventListener: (_event, fn) => { handler = fn; } }, discoveries: {}, derivedVideos: { replaceChildren() {} } },
    confirm: () => true,
    explorationTransport: { close: async () => { closed = true; } },
    compositionGeneration: 1,
    explorationSession: { seed: { id: "old" } }, activeDig: { seed: { id: "old" } },
    EXPLORATION_KEY: "dig",
    localStorage: { removeItem: (key) => browser.delete(key), setItem: (key, value) => browser.set(key, value) },
    explorationSaveQueue: gate.promise.then(() => { browser.set("dig", old); }),
    writeSyncState: async (key, value) => { indexed[key] = structuredClone(value); },
    fetch: async () => ({ ok: true }),
    resetDiscoveries: () => { context.compositionGeneration += 1; },
    renderExplorationSession() {}, renderActiveSeed() {}, renderCollaborationAtlas() {}
  };
  const begin = app.indexOf('nodes.clearExploration.addEventListener("click"');
  const end = app.indexOf('nodes.clearLibrary.addEventListener', begin);
  assert.ok(begin >= 0 && end > begin);
  vm.runInNewContext(app.slice(begin, end), context);
  const closing = handler();
  gate.resolve();
  await closing;
  assert.equal(browser.get("dig"), old, "L’archive ancienne reste intacte et hors circuit.");
  assert.equal(context.activeDig.seed, null);
  assert.equal(closed, true);
  assert.equal(Boolean(indexed["youtube-active-dig"]?.seed), false);
  assert.equal(indexed["youtube-active-dig"], undefined, "Aucune nouvelle reprise durable.");
  assert.ok(context.compositionGeneration > 1, "Les enrichissements de l’ancienne fouille sont invalidés.");
});

function hydrateContext({ releaseLabels, fetch }) {
  const context = {
    explorationGraph: { entities: {}, edges: {} },
    declaredDepartureArtist: () => "",
    hasExplicitDepartureArtist: () => false,
    compositionGeneration: 0,
    activeDig: { seed: { id: "A" } },
    seedVideo: () => ({ id: "vid0001", title: "Artiste A - titre" }),
    resolvedArtist: () => ({ name: "Artiste A" }),
    parseTrackCandidate,
    sourceCoverage: () => ({}),
    setActiveDig: (value) => { context.activeDig = { ...context.activeDig, ...value }; },
    renderActiveSeed() {}, renderCollaborationAtlas() {},
    identityDetails: async () => ({ sourceStates: { musicbrainz: "matched" } }),
    artistDetails: async () => ({ releases: [{ id: "release-1" }] }),
    artistContext: async () => null,
    recordingDetails: async (video, artist) => ({
      status: "resolved",
      resolved: {
        id: `recording:${video.id}`,
        title: parseTrackCandidate(video.title, artist)?.title || video.title,
        artistCredits: artist ? [{ name: artist }] : [],
        releases: []
      }
    }),
    fetchDiscogsProfile: async () => null,
    releaseLabels, fetch,
    bandcampProfiles: {}, registryStorageKey: (name) => name, extractCreditRelations: () => []
  };
  actualFunction("hydrateExplorationSeed", "populateDerivedFromFront", context);
  return context;
}

test("le départ explicite Kosh est résolu même sans ancienne catégorie YouTube", async () => {
  let query = "";
  const context = hydrateContext({ releaseLabels: async () => [], fetch: async () => ({ ok: true }) });
  context.seedVideo = () => ({ id: "TFdkvDenM04", title: "Kosh - Black Noise [MTRON009]" });
  context.resolvedArtist = () => null;
  context.identityDetails = async name => { query = name; return { sourceStates: { musicbrainz: "candidate" } }; };
  await context.hydrateExplorationSeed({ id: "A", type: "video" });
  assert.equal(query, "Kosh");
  assert.equal(context.activeDig.dossier.state, "partial", "Le texte découpé n’est pas une identité confirmée.");
});

test("changer de départ pendant la lecture des labels empêche l’ancien enrichissement de réinstaller sa graine", async () => {
  const started = deferred();
  const labels = deferred();
  const context = hydrateContext({
    releaseLabels: () => { started.resolve(); return labels.promise; },
    fetch: async () => ({ ok: true })
  });
  const pending = context.hydrateExplorationSeed({ id: "A", type: "video" });
  await started.promise;
  context.compositionGeneration = 1;
  context.activeDig = { seed: { id: "B" } };
  labels.resolve([]);
  await pending;
  assert.equal(context.activeDig.seed.id, "B");
});

test("changer de départ pendant l’enregistrement de résolution préserve aussi la nouvelle graine", async () => {
  const started = deferred();
  const resolution = deferred();
  const context = hydrateContext({
    releaseLabels: async () => [],
    fetch: () => { started.resolve(); return resolution.promise; }
  });
  const pending = context.hydrateExplorationSeed({ id: "A", type: "video" });
  await started.promise;
  context.compositionGeneration = 1;
  context.activeDig = { seed: { id: "B" } };
  resolution.resolve({ ok: true });
  await pending;
  assert.equal(context.activeDig.seed.id, "B");
});

test("Identifier relance le résolveur malgré un ancien statut source complète sans identité", async () => {
  let hydrations = 0;
  const context = {
    compositionGeneration: 0, explorationSession: null, workspace: null,
    activeDig: { seed: { id: "kosh" }, dossier: { sourceStates: { musicbrainz: "matched" } }, catalogueGroups: {} }, explorationGraph: {},
    nodes: { explorationState: {}, explorationDepth: { value: "6" }, explorationBranches: { scrollIntoView() {} } },
    document: { querySelector: () => ({ open: true }) },
    selectedExplorationDirections: () => ["label"],
    setActiveDig: value => { context.activeDig = { ...context.activeDig, ...value }; },
    resetDiscoveries() {}, renderActiveSeed() {}, renderCatalogueGroups() {}, renderExplorationSession() {},
    sourceCoverage: () => ({ label: { state: "complete" } }),
    refreshExplorationGraph: async () => {},
    createExplorationSession: ({ seed }) => ({ seed, directions: ["label"], branches: [{ direction: "label", status: "exhausted", current: null }] }),
    hydrateExplorationSeed: async () => { hydrations++; return {}; },
    persistExplorationSession: async () => {}, populateDerivedFromFront: async () => {}
  };
  await actualFunction("openExploration", "restoreExplorationSession", context)({ seed: { id: "kosh", type: "video" } });
  assert.equal(hydrations, 1);
});

test("failed opening returns to a usable empty workspace without deleting the collection", async () => {
  let renders = 0;
  const context = {
    compositionGeneration: 0, explorationSession: null,
    activeDig: { seed: null, catalogueGroups: {} }, explorationGraph: {},
    library: [{ id: "kept", title: "Kept" }], notebook: [{ id: "saved" }],
    workspace: { closePicker() {}, navigate() {}, update() { renders++; } },
    nodes: { explorationDepth: { value: "6" } }, document: { querySelector: () => ({}) },
    setActiveDig(value) { context.activeDig = { ...context.activeDig, ...value }; },
    resetDiscoveries() { context.compositionGeneration++; },
    renderActiveSeed() { renders++; }, renderExplorationSession() { renders++; },
    explorationTransport: { start: async () => { throw new Error("Server unavailable"); } }
  };
  const open = actualFunction("openExploration", "restoreExplorationSession", context);
  await assert.rejects(open({ seed: { id: "A", type: "video" }, configure: true }), /Server unavailable/);
  assert.equal(context.activeDig.seed, null);
  assert.equal(context.explorationSession, null);
  assert.equal(context.library.length, 1); assert.equal(context.notebook.length, 1);
  assert.equal(renders, 3);
});

test("local departures remain listed even when the exploration API is unavailable", async () => {
  const context = {
    graphReadSequence: 0, compositionGeneration: 0, explorationSession: null, collaborationIndex: [],
    explorationLibrary: () => [{ id: "local", title: "Imported" }],
    augmentExplorationGraph: value => value, projectActiveCollectionGraph: value => value,
    buildSeedCatalog: (_graph, videos) => videos, renderSeedOptions() {},
    fetch: async () => { throw new Error("Server unavailable"); }
  };
  const begin = app.indexOf("async function refreshExplorationGraph(");
  const end = app.indexOf("\nfunction selectedExplorationDirections(", begin);
  vm.runInNewContext(app.slice(begin, end), context);
  await assert.rejects(context.refreshExplorationGraph(), /Server unavailable/);
  assert.equal(context.seedCatalog[0].title, "Imported");
});

test("l’ouverture abandonnée pendant la seconde lecture du graphe ne remplace ni ne sauvegarde le nouveau départ", async () => {
  const started = deferred();
  const graph = deferred();
  let refreshes = 0;
  let saves = 0;
  const context = {
    compositionGeneration: 0, explorationSession: null, workspace: null,
    activeDig: { seed: null, catalogueGroups: {} }, explorationGraph: {},
    nodes: { explorationState: {}, explorationDepth: { value: "6" }, explorationBranches: { scrollIntoView() {} } },
    document: { querySelector: () => ({ open: true }) },
    selectedExplorationDirections: () => ["label"],
    setActiveDig: (value) => { context.activeDig = { ...context.activeDig, ...value }; },
    resetDiscoveries: () => { context.compositionGeneration += 1; },
    renderActiveSeed() {}, renderCatalogueGroups() {}, renderExplorationSession() {},
    sourceCoverage: () => ({}),
    refreshExplorationGraph: async () => { refreshes += 1; if (refreshes === 2) { started.resolve(); await graph.promise; } },
    createExplorationSession: ({ seed }) => ({ seed, directions: ["label"], branches: [{ status: "needs_enrichment" }] }),
    hydrateExplorationSeed: async () => ({}),
    persistExplorationSession: async () => { saves += 1; },
    populateDerivedFromFront: async () => {}
  };
  const open = actualFunction("openExploration", "restoreExplorationSession", context);
  const pending = open({ seed: { id: "A", type: "video" } });
  await started.promise;
  context.compositionGeneration += 1;
  context.activeDig = { seed: { id: "B" }, catalogueGroups: {} };
  graph.resolve();
  await pending;
  assert.equal(context.activeDig.seed.id, "B");
  assert.equal(saves, 0);
});

test("recording-first: Time Travel reste une hypothèse et Nexxor vient du recording résolu", async () => {
  const hints = [];
  const identityQueries = [];

  const context = hydrateContext({
    releaseLabels: async () => [],
    fetch: async () => ({ ok: true })
  });

  context.seedVideo = () => ({
    id: "Ie192LCYYCo",
    title: '"Time Travel" - Nexxor - Statik Travel 21',
    channelTitle: "Enfants Sages production",
    categoryId: "10",
    durationSeconds: 370
  });

  context.resolvedArtist = () => ({ name: "Time Travel" });

  context.recordingDetails = async (_video, hint) => {
    hints.push(hint);

    if (hint !== "Nexxor") {
      return {
        status: "candidates",
        resolved: null
      };
    }

    return {
      status: "resolved",
      resolved: {
        id: "recording-nexxor-time-travel",
        title: "Time Travel",
        artistCredits: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Nexxor"
          }
        ],
        releases: []
      }
    };
  };

  context.identityDetails = async (name) => {
    identityQueries.push(name);
    return {
      sourceStates: {
        musicbrainz: "matched"
      }
    };
  };

  context.artistDetails = async () => ({ releases: [] });
  context.artistContext = async () => null;
  context.fetchDiscogsProfile = async () => null;

  await context.hydrateExplorationSeed({
    id: "A",
    type: "video"
  });

  assert.ok(hints.includes("Time Travel"));
  assert.ok(hints.includes("Nexxor"));
  assert.deepEqual(identityQueries, ["Nexxor"]);
  assert.equal(context.activeDig.dossier.artistName, "Nexxor");
});
