import {
  LENSES,
  artistCollaborationProfile,
  buildCollaborationIndex,
  composeProgramme,
  extractCreditArtists,
  extractCreditRelations,
  extractPlaylistId,
  guessArtist,
  parseIsoDuration,
  rankVideos
} from "/scout.js";
import { parseTrackCandidate, registryStorageKey } from "/identity.js";
import { rankDerivedCandidates } from "/digging.js";
import { NOTEBOOK_STATUSES, createBackup, createImportCheckpoint, finalizeLibraryImport, normalizeNotebookItem, reusableImportCheckpoint, safeExternalUrl, scanImportPages, validateBackup } from "/library-state.mjs";
import { directionNames, selectDiscoveries, deduplicatePaths, matchesRecording, dateDescription } from "/discovery-model.mjs";
import { recordingArtistHints, searchCreditChoices, splitArtistNames } from "/artist-names.mjs";
import { participantDraft, mountParticipantPicker, renderParticipantResults, participantCatalogueItems, participantResults } from "/participant-explorer.mjs";
import { videoContent, titleCreditSuggestion } from "/video-content.mjs";
import { routeExplanation } from "/discovery-presentation.mjs";
import { bindCatalogueTools } from "/bandcamp-tools.mjs";
import { exploreCurator } from "/curator-catalogue.mjs";
import { journeyGuidance, branchGuidance, collaborationContext } from "/journey-state.mjs";
import { catalogueCandidates } from "/catalogue-graph.mjs";
import { mountWorkspace } from "/workspace.mjs";
import { artistSearchHint, artistChoiceRank, catalogueArtistChoices, catalogueArtistReference, declaredDepartureArtist, departureArtistUpdate, departureArtistsUpdate, hasExplicitDepartureArtist, MANUAL_DEPARTURE_EVIDENCE, departureWorkflow, typedDepartureModel, localDepartureMembers } from "/departure-workflow.mjs";
import { API_KEY_STORAGE, createConnectionPanel } from "/connection-panel.mjs";
import { createScoutPatch, setScoutParameter } from "/scout-parameters.mjs";
import { buildScoutMixView, consumeMixPage, runScoutMixLoad } from "/scout-mix-session.mjs";
import { scheduleDiscoveryFrontiers } from "/discovery-frontier.mjs";
import { mountScoutMixerPanel } from "/scout-mixer-panel.mjs";
import { enhanceScoutDial } from "/scout-dial.mjs";
import { createSourceCharacterPatch, sourceCharacterPresetMatch } from "/source-character-patch.mjs";
import { createDepartureProfile, departureCoverage } from "/departure-profile.mjs";
import { seedPickerChoices } from "/seed-picker-model.mjs";
import { sortMusic, musicalReleaseDate, departureArtistIds } from "/music-sorting.mjs";
import { rememberExplored, rankFreshDepartures, suggestionRenewalMessage } from "/suggestion-memory.mjs";
import { selectedCatalogueEntity } from "/selected-catalogue-seed.mjs";
import { reviewedVideo, departureRevision, departureRoutingSnapshot } from "/departure-integrity.mjs";
import { ephemeralClient } from "/ephemeral-client.mjs";
import { personalBackup } from "/personal-memory.mjs";

const explorationTransport = ephemeralClient(globalThis.fetch.bind(globalThis), location.origin);
const fetch = explorationTransport.fetch;
addEventListener("pagehide", () => { void explorationTransport.close(); });
addEventListener("pageshow", event => { if (event.persisted) location.reload(); });

let scoutMixerRack = null;
let scoutMixOperation = null;
let seedShuffleKey = "scout";
import {
  DIRECTION_SOURCE_REQUIREMENTS,
  EXPLORATION_DIRECTIONS,
  augmentExplorationGraph,
  buildSeedCatalog, projectActiveCollectionGraph,
  collaborationGraph,
  continueFromBranch,
  createExplorationSession,
  rerollExplorationBranch,
  sanitizeExplorationGraph,
  seedCoverage,
  setExplorationBranchStatus
} from "/exploration.js";

const CLIENT_VERSION = "0.19.0";
const API_ROOT = "https://www.googleapis.com/youtube/v3";
const DB_NAME = "youtube-scout";
const DB_STORE = "library";
const ENTITY_STORE = "entities";
const EVENT_STORE = "events";
const SYNC_STORE = "sync";
const DB_VERSION = 3;
const CONFIG_KEY = "youtube-scout.config.v1";
const SEEN_KEY = "youtube-scout.seen.v1";
const PRESENTED_KEY = "youtube-scout.presented.v1";
const CORRECTIONS_KEY = "youtube-scout.artist-corrections.v1";
const NOTEBOOK_KEY = "youtube-scout.notebook.v1";
const CLIENT_ID_KEY = "youtube-scout.client-id.v1";
const FEEDBACK_KEY = "youtube-scout.feedback.v1";
const BANDCAMP_KEY = "youtube-scout.bandcamp-profiles.v1";
const DISCOGS_ARTIST_KEY = "youtube-scout.discogs-artists.v1";
const EXPLORATION_KEY = "youtube-scout.active-dig.v2";
const SOURCE_CHARACTER_KEY = "youtube-scout.source-character.v1";
const EXPLORATION_SETTINGS_KEY = "youtube-scout.exploration-settings.v1";
const MAX_IMPORTED_VIDEOS = 5000;
const VIDEO_ENRICHMENT_CONCURRENCY = 4;
const MAX_PRESENTED_HISTORY = 500;
const DERIVED_SIZE = 6;

const nodes = {
  apiKey: document.querySelector("#api-key"),
  clientId: document.querySelector("#client-id"),
  saveClientId: document.querySelector("#save-client-id"),
  clientIdState: document.querySelector("#client-id-state"),
  discogsSettings: document.querySelector("#discogs-settings"),
  discogsState: document.querySelector("#discogs-state"),
  discogsToken: document.querySelector("#discogs-token"),
  saveDiscogsToken: document.querySelector("#save-discogs-token"),
  removeDiscogsToken: document.querySelector("#remove-discogs-token"),
  discogsTokenMessage: document.querySelector("#discogs-token-message"),
  connect: document.querySelector("#connect"),
  disconnect: document.querySelector("#disconnect"),
  connectionState: document.querySelector("#connection-state"),
  sourcePanel: document.querySelector("#source-panel"),
  sourceBody: document.querySelector("#source-body"),
  toggleSources: document.querySelector("#toggle-sources"),
  playlistUrls: document.querySelector("#playlist-urls"),
  inspectUrls: document.querySelector("#inspect-urls"),
  sourceMessage: document.querySelector("#source-message"),
  playlistPicker: document.querySelector("#playlist-picker"),
  playlists: document.querySelector("#playlists"),
  importPlaylists: document.querySelector("#import-playlists"),
  importLabel: document.querySelector("#import-playlists .import-label"),
  selectionSummary: document.querySelector("#selection-summary"),
  libraryCount: document.querySelector("#library-count"),
  missionSummary: document.querySelector("#mission-summary"),
  sourceCharacterLenses: document.querySelector("#source-character-lenses"),
  sourceTemperature: document.querySelector("#source-temperature"),
  sourceTemperatureValue: document.querySelector("#source-temperature-value"),
  sourceCharacterBank: document.querySelector(".source-character-bank"),
  form: document.querySelector("#programme-form"),
  compose: document.querySelector("#compose"),
  composeLabel: document.querySelector("#compose .button-label"),
  clearLibrary: document.querySelector("#clear-library"),
  empty: document.querySelector("#empty"),
  resultHead: document.querySelector("#result-head"),
  results: document.querySelector("#results"),
  applied: document.querySelector("#applied"),
  videos: document.querySelector("#videos"),
  reservePanel: document.querySelector("#reserve-panel"),
  reserveSummary: document.querySelector("#reserve-summary"),
  reserveList: document.querySelector("#reserve-list"),
  rerollProgramme: document.querySelector("#reroll-programme"),
  discoveries: document.querySelector("#discoveries"),
  derivedVideos: document.querySelector("#derived-videos"),
  rerollDiscoveries: document.querySelector("#reroll-discoveries"),
  collaborations: document.querySelector("#collaborations"),
  collaborationSummary: document.querySelector("#collaboration-summary"),
  collaborationEdges: document.querySelector("#collaboration-edges"),
  notebook: document.querySelector("#notebook"),
  notebookCount: document.querySelector("#notebook-count"),
  notebookItems: document.querySelector("#notebook-items"),
  exportNotebook: document.querySelector("#export-notebook"),
  runtimeStatus: document.querySelector("#runtime-status"),
  librarySync: document.querySelector("#library-sync"),
  exploration: document.querySelector("#exploration"),
  explorationState: document.querySelector("#exploration-state"),
  seedType: document.querySelector("#seed-type"),
  seedSelect: document.querySelector("#seed-select"),
  explorationDepth: document.querySelector("#exploration-depth"),
  explorationDirections: document.querySelector("#exploration-directions"),
  startExploration: document.querySelector("#start-exploration"),
  refreshExploration: document.querySelector("#refresh-exploration"),
  clearExploration: document.querySelector("#clear-exploration"),
  explorationResume: document.querySelector("#exploration-resume"),
  explorationLineage: document.querySelector("#exploration-lineage"),
  explorationBranches: document.querySelector("#exploration-branches"),
  seedMetrics: document.querySelector("#seed-metrics"),
  activeSeed: document.querySelector("#active-seed"),
  activeSeedDossier: document.querySelector("#active-seed-dossier")
};

let accessToken = "";
let tokenExpiresAt = 0;
let connectionPanel = null;
let playlists = [];
let library = [];
let seen = [];
let presented = {};
let artistCorrections = loadStoredObject(CORRECTIONS_KEY);
let notebook = loadStoredArray(NOTEBOOK_KEY);
let feedback = loadStoredObject(FEEDBACK_KEY);
let bandcampProfiles = loadStoredObject(BANDCAMP_KEY);
let discogsArtistConfirmations = loadStoredObject(DISCOGS_ARTIST_KEY);
let currentProgramme = [];
let currentRanked = [];
let currentFiltersState = null;
let currentMission = "archive";
let sourceCharacterState = null;
let sourceTemperatureDial = null;
let rerollCounter = 0;
let derivedRerollCounter = 0;
let compositionGeneration = 0;
let graphReadSequence = 0;
let currentDerivedIds = [];
let collaborationIndex = [];
let collaborationDisplay = { key: "", limit: 6 };
let serverGraph = { entities: {}, edges: {} };
let explorationGraph = { entities: {}, edges: {} };
let seedCatalog = { track: [], artist: [], label: [], playlist: [] };
let explorationSession = null;
let workspace = null;
const catalogueRequests = new Map();
let activeDig = { schemaVersion: 2, id: "", seed: null, front: null, dossier: null, derived: [], derivedIds: [], collaborationArtist: "", history: [], createdAt: "", updatedAt: "" };
let resumableDig = null;
const pinnedIds = new Set();
const derivedPool = new Map();
const searchedLabels = new Set();
const searchedCollaborators = new Set();
const artistCache = new Map();
const labelCache = new Map();
const contextCache = new Map();
const identityCache = new Map();
const recordingCache = new Map();
const videoSearchCache = new Map();
const externalSeeds = new Map();

function loadStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function loadStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalObject(key, value) {
  if ([PRESENTED_KEY, SEEN_KEY, EXPLORATION_KEY].includes(key)) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function notebookHas(id) {
  return notebook.some((item) => item.id === id);
}

function notebookEntry(video, origin = "playlist") {
  const artist = resolvedArtist(video);
  return normalizeNotebookItem({
    id: video.id,
    title: video.title || "Vidéo sans titre",
    channelTitle: video.channelTitle || "",
    artist: video.participantNameSearch ? "" : video.artist || artist?.name || "",
    origin,
    status: "kept",
    note: video.participantNameSearch ? video.explanation || "Recherche YouTube par nom, identité et crédits à vérifier." : "",
    addedAt: new Date().toISOString(),
    url: video.listen?.url || video.url || video.sourceUrl || (/^[A-Za-z0-9_-]{6,20}$/.test(video.id) ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}` : ""),
    listenKind: video.listen?.kind || "",
    dates: video.dates,
    releaseDate: musicalReleaseDate(video),
    provenance: { sourceUrl: safeExternalUrl(video.sourceUrl), paths: video.paths || (video.path ? [{ steps: video.path }] : []), departure: activeDig.seed ? { id: activeDig.seed.id, label: activeDig.seed.label } : null, playlistNames: video.playlistNames || [], savedFrom: origin }
  });
}

function saveNotebook(next) {
  try {
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
    notebook = next;
    return true;
  } catch {
    setSourceMessage("Le carnet n’a pas pu être enregistré : stockage du navigateur plein ou indisponible. Exportez une sauvegarde avant de continuer.", "error");
    return false;
  }
}

function toggleNotebook(video, origin, button) {
  const present = notebookHas(video.id);
  if (present) {
    workspace?.navigate("notebook");
    nodes.notebook.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (!saveNotebook([notebookEntry(video, origin), ...notebook])) return;
  recordFeedback("keep", video.id, { origin, title: video.title }).catch(() => {});
  if (button) button.textContent = notebookHas(video.id) ? "Gardée ✓" : "Garder";
  renderNotebook();
  workspace?.notify("Piste gardée dans votre carnet.", { action: { label: "Ouvrir le carnet", run: () => workspace.navigate("notebook") } });
}

function renderNotebook() {
  nodes.notebook.hidden = false;
  nodes.notebookCount.textContent = `${notebook.length} piste${notebook.length > 1 ? "s" : ""}`;
  nodes.notebookItems.replaceChildren();
  if (!notebook.length) nodes.notebookItems.append(Object.assign(document.createElement("p"), { textContent: "Gardez une découverte pour la retrouver ici, la classer et ajouter vos notes." }));
  for (const raw of sortMusic(notebook, document.querySelector("#notebook-sort")?.value || "explore")) {
    const item = normalizeNotebookItem(raw);
    const card = document.createElement("article");
    card.className = "notebook-card";
    const listening = ["video", "direct", "verified"].includes(item.listenKind) ? "Écouter" : item.url.includes("search") || item.url.includes("results?") ? "Chercher l’écoute" : "Ouvrir la source";
    card.innerHTML = `<div><p>${escapeHtml(item.origin === "dérivée" ? "Hors playlist" : item.origin === "graphe" ? "Parcours de fouille" : "Playlist")}</p><h3>${escapeHtml(item.title)}</h3><span>${escapeHtml(item.artist || item.channelTitle)}</span></div><div class="notebook-fields"><label>Classement<select aria-label="Classement de ${escapeHtml(item.title)}">${Object.entries(NOTEBOOK_STATUSES).map(([id, label]) => `<option value="${id}"${item.status === id ? " selected" : ""}>${label}</option>`).join("")}</select></label><label>Note<textarea maxlength="4000" rows="2" placeholder="Ce qui vous intéresse dans cette piste…">${escapeHtml(item.note)}</textarea></label><span class="notebook-save-state" role="status"></span></div><div class="notebook-provenance">${item.provenance.departure?.label ? `Depuis ${escapeHtml(item.provenance.departure.label)}` : escapeHtml((item.provenance.playlistNames || []).join(" · "))}</div><div>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${listening} ↗</a>` : "<span>Écoute non renseignée</span>"}<button class="remove-notebook" type="button">Retirer du carnet</button></div>`;
    if (item.origin === "catalogue") card.querySelector("p").textContent = "Catalogue — hors playlist";
    const persistFields = () => {
      const update = { ...item, status: card.querySelector("select").value, note: card.querySelector("textarea").value, updatedAt: new Date().toISOString() };
      const saved = saveNotebook(notebook.map((candidate) => candidate.id === item.id ? update : candidate));
      card.querySelector(".notebook-save-state").textContent = saved ? "Enregistré localement" : "Échec de l’enregistrement";
    };
    card.querySelector("select").addEventListener("change", persistFields);
    card.querySelector("textarea").addEventListener("input", persistFields);
    if (item.provenance.paths?.length) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Chemin de découverte conservé";
      const pre = document.createElement("pre");
      pre.textContent = item.provenance.paths.map((path) => path.text || path.label || path.reason || path.steps?.map((step) => `${step.from?.label || ""} → ${step.to?.label || ""}`).join(" → ") || JSON.stringify(path)).join("\n");
      details.append(summary, pre);
      card.querySelector(".notebook-provenance").append(details);
    }
    card.querySelector(".remove-notebook").addEventListener("click", () => {
      const removedItem = normalizeNotebookItem(notebook.find(candidate => candidate.id === item.id) || item);
      if (!saveNotebook(notebook.filter((candidate) => candidate.id !== item.id))) return;
      renderNotebook();
      if (currentProgramme.length && currentFiltersState) renderProgramme(currentProgramme, currentFiltersState, false);
      renderDerived();
      workspace?.notify("Piste retirée du carnet.", { action: { label: "Annuler", run: () => { if (!notebookHas(removedItem.id) && saveNotebook([removedItem, ...notebook])) renderNotebook(); } } });
    });
    nodes.notebookItems.append(card);
  }
  workspace?.update();
}

function exportNotebook() {
  downloadLocalJson({ exportedAt: new Date().toISOString(), items: notebook.map(normalizeNotebookItem) }, "carnet");
}

function downloadLocalJson(value, name) {
  const content = JSON.stringify(value, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `youtube-scout-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exposureCounts() {
  return Object.fromEntries(Object.entries(presented).map(([id, value]) => [id, Number(value?.count || 0)]));
}

function markPresented(videos) {
  const now = Date.now();
  for (const video of videos) {
    if (!video?.id) continue;
    const previous = presented[video.id] || {};
    presented[video.id] = { ...previous, count: Number(previous.count || 0) + 1, lastShown: now };
  }
  const kept = Object.entries(presented).sort(([, left], [, right]) => Math.max(right.lastShown || 0, right.lastExplored || 0) - Math.max(left.lastShown || 0, left.lastExplored || 0)).slice(0, MAX_PRESENTED_HISTORY);
  presented = Object.fromEntries(kept);
  saveLocalObject(PRESENTED_KEY, presented);
}

function recentPresentedIds() {
  const count = Math.min(80, Math.max(8, Math.floor(library.length * 0.25)));
  return new Set(Object.entries(presented)
    .sort(([, left], [, right]) => Number(right.lastShown || 0) - Number(left.lastShown || 0))
    .slice(0, count)
    .map(([id]) => id));
}

function resolvedArtist(video) {
  const corrected = String(artistCorrections[video.id] || declaredDepartureArtist(explorationGraph, `video:youtube:${video.id}`) || "").trim();
  return corrected ? { name: corrected, confidence: 1, basis: "correction personnelle" } : guessArtist(video);
}

function entityTokens(value) {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[\p{L}\p{N}]+/gu) || [];
}

function mentionsEntity(video, entityName, kind = "artist") {
  const needle = entityTokens(entityName);
  const strong = new Set(entityTokens(`${video.title} ${video.channelTitle}`));
  const broad = new Set(entityTokens(`${video.title} ${video.channelTitle} ${video.description}`));
  const source = kind === "label" ? broad : strong;
  return needle.length > 0 && needle.every((token) => source.has(token));
}

function cancelDiscoveryRequests() {
  compositionGeneration += 1;
  for (const controller of catalogueRequests.values()) controller.abort();
  catalogueRequests.clear();
}

function resetDiscoveries() {
  cancelDiscoveryRequests();
  derivedPool.clear();
  currentDerivedIds = [];
  searchedLabels.clear();
  searchedCollaborators.clear();
  nodes.discoveries.hidden = true;
  nodes.derivedVideos.replaceChildren();
}

function escapeHtml(value = "") {
  const node = document.createElement("span");
  node.textContent = String(value);
  return node.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function htmlUrl(value) { return escapeHtml(safeExternalUrl(value) || "#"); }

// Keep legacy entries for export/review, but do not promote a lossy name-only
// key into a fresh identity decision for another artist.
function artistMemoryKey(name = "") {
  return `artist-query:v2:${JSON.stringify(String(name).normalize("NFC").trim())}`;
}

const RELATION_LABELS = Object.freeze({
  included_in: "dans la playlist",
  probable_artist: "artiste probable",
  embodies: "correspond au morceau",
  credited_on: "crédité sur",
  appears_on: "paraît sur",
  candidate_edition: "édition candidate",
  primary_artist: "artiste principal",
  credited_on_release: "crédit de sortie",
  issued_by: "sorti chez",
  associated_label: "lié au label",
  remixed_by: "remixé par",
  featured_with: "en featuring avec",
  published_by: "publié par la chaîne",
  associated_scene: "documenté dans la scène",
  published_in_era: "publié dans",
  released_in_era: "sorti dans",
  same_identity: "identité reliée entre catalogues"
});

function explorationLibrary({ includeExternal = true } = {}) {
  const videos = includeExternal
    ? [...library, ...externalSeeds.values()]
    : [...library];

  return [...new Map(
    videos.map((video) => [video.id, video])
  ).values()].map((video) => {
    const resolved = resolvedArtist(video);

    /*
     * Frontière de preuve :
     *
     * Le graphe d'exploration ne doit pas transformer une simple chaîne
     * YouTube classée "Musique" en identité artiste exploitable.
     *
     * - correction personnelle : autorité explicite utilisateur ;
     * - Topic / VEVO : indice structurel fort ;
     * - syntaxe "Artist - Title" : hypothèse assez forte pour être proposée ;
     * - simple nom de chaîne musicale (0.55) : reste une information
     *   d'affichage, pas une seed artiste.
     *
     * Un champ artist déjà présent dans la donnée source reste conservé :
     * on ne rétrograde pas une information explicitement fournie.
     */
    const inferredArtist =
      resolved &&
      Number(resolved.confidence || 0) >= 0.8
        ? resolved.name
        : "";

    return {
      ...video,
      artist:
        String(video.artist || "").trim() ||
        inferredArtist,
      artistInference:
        inferredArtist
          ? {
              name: resolved.name,
              confidence: Number(resolved.confidence || 0),
              basis: resolved.basis || ""
            }
          : null
    };
  });
}

function currentSeed() {
  const group = Object.values(seedCatalog).flat();
  return group.find(({ id }) => id === nodes.seedSelect.value) || null;
}

function seedVideo(seed = activeDig.seed) {
  const id = String(seed?.id || "").replace(/^video:youtube:/, "");
  const known = library.find((video) => video.id === id) || externalSeeds.get(id) || derivedPool.get(id);
  if (known) return reviewedVideo(known, explorationGraph.entities?.[seed.id]);
  if (!String(seed?.id || "").startsWith("video:youtube:")) return null;
  const stored = explorationGraph.entities?.[seed.id];
  return reviewedVideo({ ...stored, id, title: stored?.title || seed.label || "", durationSeconds: Number(stored?.durationSeconds || 0) }, stored);
}

function setActiveDig({ seed = activeDig.seed, front = activeDig.front, dossier = activeDig.dossier, collaborationArtist = activeDig.collaborationArtist, resetContext = false } = {}) {
  const now = new Date().toISOString();
  const seedChanged = Boolean(seed?.id && seed.id !== activeDig.seed?.id);
  if (seedChanged) { activeDig.reviewRequired = false; activeDig.reviewDraft = null; }
  activeDig = {
    ...activeDig,
    schemaVersion: 2,
    id: activeDig.id || crypto.randomUUID(),
    seed: seed || null,
    front: resetContext || seedChanged ? null : front || null,
    dossier: resetContext || seedChanged ? null : dossier,
    derived: resetContext || seedChanged ? [] : activeDig.derived || [],
    derivedIds: resetContext || seedChanged ? [] : currentDerivedIds,
    catalogueGroups: resetContext || seedChanged ? {} : activeDig.catalogueGroups || {},
    navigationStack: seedChanged && activeDig.seed ? [...(activeDig.navigationStack || []), { seed: activeDig.seed }].slice(-12) : activeDig.navigationStack || [],
    collaborationArtist: resetContext || seedChanged ? "" : collaborationArtist,
    history: seedChanged && activeDig.seed ? [...(activeDig.history || []), { seed: activeDig.seed, leftAt: now }].slice(-40) : activeDig.history || [],
    createdAt: activeDig.createdAt || now,
    updatedAt: now
  };
  explorationSession = activeDig.front;
}

function sourceCoverage(sourceStates = {}, attempted = false) {
  const result = {};
  for (const direction of EXPLORATION_DIRECTIONS.map(({ id }) => id)) {
    const required = DIRECTION_SOURCE_REQUIREMENTS[direction] || [];
    if (required.every((source) => source === "youtube_library" || (source === "youtube_library" && library.length))) {
      result[direction] = { state: "complete", sources: required };
      continue;
    }
    if (!attempted) {
      result[direction] = { state: "not_checked", sources: [] };
      continue;
    }
    const stateOf = (source) => source === "youtube_library" ? "matched" : sourceStates[source] || "not_checked";
    const unavailable = required.filter((source) => ["unavailable", "not_configured"].includes(stateOf(source)));
    const candidates = required.filter((source) => sourceStates[source] === "candidate");
    const pending = required.filter((source) => ["not_checked", "not_queried"].includes(stateOf(source)));
    result[direction] = unavailable.length
      ? { state: "unavailable", sources: required, unavailable }
      : candidates.length ? { state: "needs_confirmation", sources: required, candidates }
        : pending.length ? { state: "partial", sources: required, pending }
          : { state: "complete", sources: required };
  }
  return result;
}

function previousDepartureSeed() {
  return activeDig.navigationStack?.at(-1)?.seed
    || explorationSession?.lineage?.at(-1)?.fromSeed
    || null;
}

function scoutJourneyTrail() {
  const stackSeeds = (activeDig.navigationStack || [])
    .map(entry => entry?.seed)
    .filter(seed => seed?.id);
  const lineageSeeds = !stackSeeds.length
    ? (explorationSession?.lineage || []).map(entry => entry?.fromSeed).filter(seed => seed?.id)
    : [];
  const seeds = [...(stackSeeds.length ? stackSeeds : lineageSeeds), activeDig.seed].filter(seed => seed?.id);
  return seeds.slice(-4).map(seed => ({ id: seed.id, label: seed.label || seed.title || seed.id }));
}

async function returnToPreviousDeparture() {
  const stack = [...(activeDig.navigationStack || [])];
  const prior = stack.pop();
  if (!prior?.seed) return false;
  await openExploration({ seed: prior.seed, configure: true });
  activeDig.navigationStack = stack;
  renderActiveSeed();
  return true;
}

function renderActiveSeed() {
  const seed = activeDig.seed;
  renderSeedGuidance();
  renderCommonParticipantResults();
  if (typeof renderScoutMixerPanel === "function") renderScoutMixerPanel();
  nodes.activeSeed.hidden = !seed;
  if (!seed) return;
  nodes.activeSeed.querySelector("h3").textContent = seed.label;
  const video = seedVideo(seed) || (seed.id.startsWith("video:youtube:") ? { id: seed.id.slice(14), title: seed.label } : null);
  const actions = document.querySelector("#active-seed-actions");
  actions.replaceChildren();
  if (seed.id.startsWith("video:youtube:")) {
    const edit = document.createElement("button"); edit.type = "button";
    edit.textContent = "Corriger le titre ou l’artiste";
    edit.onclick = () => beginDepartureReview();
    actions.append(edit);
  }
  const query = activeDig.dossier?.artistName || seed.label;
  for (const [label, url] of [["Chercher sur Bandcamp", `https://bandcamp.com/search?q=${encodeURIComponent(query)}`], ["Chercher sur Discogs", `https://www.discogs.com/search/?q=${encodeURIComponent(query)}&type=all`]]) {
    const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = `${label} ↗`; actions.append(link);
  }
  nodes.activeSeed.querySelector(".seed-artwork")?.remove();
  if (video) {
    const img = document.createElement("img");
    img.className = "seed-artwork";
    img.alt = `Pochette de ${seed.label}`;
    img.src = safeThumbnail(video.thumbnail, video.id);
    nodes.activeSeed.prepend(img);
    const listen = document.createElement("a");
    listen.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    listen.target = "_blank";
    listen.rel = "noreferrer";
    listen.textContent = "Écouter ↗";
    actions.append(listen);
  }
  if (activeDig.navigationStack?.length || explorationSession?.lineage?.length) {
    const back = document.createElement("button");
    back.textContent = "← Départ précédent";
    back.onclick = () => returnToPreviousDeparture().catch((error) => { nodes.explorationState.textContent = error.message; });
    actions.append(back);
  }
  if (activeDig.dossier?.suppressWeakIdentityCandidates === true || hasExplicitDepartureArtist(explorationGraph, seed.id)) {
    for (const { edge, artist } of confirmedSeedArtistEdges(seed.id)) {
      const correction = document.createElement("button");
      correction.type = "button";
      correction.className = "outline-button";
      correction.textContent = `Ce n’est pas cet artiste · ${artist.name || artist.id}`;
      correction.onclick = async () => {
        correction.disabled = true;
        correction.textContent = "Correction…";
        try {
          await rejectSeedArtistEdge(edge, seed.id);
        } catch (error) {
          correction.disabled = false;
          correction.textContent = `Ce n’est pas cet artiste · ${artist.name || artist.id}`;
          nodes.explorationState.textContent = error.message;
        }
      };
      actions.append(correction);
    }
  }

  const dossier = activeDig.dossier;
  const guidance = currentJourneyGuidance();
  nodes.activeSeed.querySelector(".active-seed-heading > span").textContent = dossier?.state === "loading" ? "Enrichissement…" : dossier?.state === "ready" && guidance.state === "ready" ? "Dossier relié au graphe" : dossier ? "Dossier partiel" : "Graphe local uniquement";
  if (!dossier) {
    nodes.activeSeedDossier.innerHTML = "<p>Le dossier sera enrichi à l’ouverture du front si cette graine peut être résolue.</p>";
    return;
  }
  const sourceLabels = { matched: "identifié", candidate: "à confirmer", unavailable: "indisponible", not_found: "non trouvé", pending: "en attente" };
  const states = Object.entries(dossier.sourceStates || {}).map(([source, state]) => `<span>${escapeHtml(source)} · ${escapeHtml(sourceLabels[state] || state)}</span>`).join("");
  nodes.activeSeedDossier.innerHTML = `<div class="active-source-states">${states}</div><p>${escapeHtml(dossier.message || "Relations structurées enregistrées dans le graphe.")}</p>`;
}

function disputedSeedArtistIds(seedId = activeDig.seed?.id) {
  if (!seedId || activeDig.dossier?.suppressWeakIdentityCandidates !== true) return [];
  return Object.values(explorationGraph.edges || {})
    .filter((edge) => edge?.from === seedId && edge?.kind === "probable_artist" && edge?.status === "confirmed_user")
    .map((edge) => edge.to).filter(Boolean);
}

function currentJourneyGuidance() {
  if (activeDig.reviewRequired) return { state: "review", title: "Vérifiez votre départ", message: "Aucune recherche avant votre validation.", identityConfirmed: false, candidates: [], directions: [] };
  return journeyGuidance({ seed: activeDig.seed, groups: activeDig.catalogueGroups || {}, graph: explorationGraph, dossier: activeDig.dossier, front: explorationSession, disputedArtistIds: disputedSeedArtistIds(activeDig.seed?.id) });
}

function beginDepartureReview() {
  cancelDiscoveryRequests();
  const seed = activeDig.seed, video = seedVideo(seed);
  if (!video) return;
  activeDig.reviewRequired = true;
  const titleSuggestion = titleCreditSuggestion(video);
  const knownArtist = resolvedArtist(video);
  if (activeDig.reviewDraft?.seedId !== seed.id) activeDig.reviewDraft = {
    seedId: seed.id, title: titleSuggestion?.title || video.title || seed.label,
    artist: declaredDepartureArtist(explorationGraph, seed.id) || (knownArtist?.confidence >= .95 ? knownArtist.name : titleSuggestion?.name || ""),
    revision: departureRevision(explorationGraph.entities?.[seed.id])
  };
  renderActiveSeed();
  document.querySelector("#seed-action")?.scrollIntoView({ block: "nearest" });
}

function renderDepartureReview(host) {
  host.hidden = false;
  const draft = activeDig.reviewDraft;
  if (!draft || draft.seedId !== activeDig.seed?.id) return;
  // Keep the actual input nodes, focus and selection through unrelated renders.
  if (host.querySelector(".departure-review")?.dataset.seedId === draft.seedId) return;
  const form = document.createElement("form"); form.className = "departure-review seed-action-card is-blocked";
  form.dataset.seedId = draft.seedId;
  form.innerHTML = `<h3>Vérifiez le titre et l’artiste</h3><p>Corrigez si nécessaire. Rien n’est confirmé ni recherché automatiquement. Votre saisie reste propre à ce morceau ; elle ne fusionne aucune fiche catalogue.</p>
    <label>Titre du morceau<input name="title" required maxlength="300" autocomplete="off"></label>
    <label>Artiste(s), si connu(s)<input name="artist" maxlength="300" autocomplete="off"></label>
    <p class="departure-review-status" role="status"></p>
    <button type="submit">Valider et relancer le digger</button>`;
  for (const name of ["title", "artist"]) {
    const input = form.elements.namedItem(name); input.value = draft[name];
    input.oninput = () => { draft[name] = input.value; };
  }
  form.onsubmit = async event => {
    event.preventDefault();
    const seed = activeDig.seed;
    if (seed?.id !== draft.seedId) return;
    const generation = compositionGeneration;
    const submit = form.querySelector("button"), status = form.querySelector("[role=status]");
    submit.disabled = true; status.textContent = "Enregistrement de votre correction…";
    try {
      const response = await fetch("/api/departure/correction", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seedId: seed.id, title: draft.title, artist: draft.artist, originalTitle: seed.label, expectedRevision: draft.revision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "La correction n’a pas pu être enregistrée.");
      if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
      // Invalidate discoveries only AFTER persistence succeeded.
      resetDiscoveries();
      activeDig.reviewRequired = false; activeDig.reviewDraft = null;
      activeDig.catalogueGroups = {}; activeDig.synthMix = null; activeDig.front = null; activeDig.dossier = null;
      explorationSession = null;
      const correctedSeed = { ...seed, label: draft.title.trim() };
      setActiveDig({ seed: correctedSeed });
      const videoId = seed.id.replace(/^video:youtube:/, "");
      if (draft.artist.trim()) artistCorrections[videoId] = draft.artist.trim(); else delete artistCorrections[videoId];
      saveLocalObject(CORRECTIONS_KEY, artistCorrections);
      await refreshExplorationGraph(seed.id);
      await openExploration({ seed: correctedSeed, reviewed: true });
    } catch (error) {
      status.textContent = error.message; submit.disabled = false;
    }
  };
  host.replaceChildren(form);
}

function confirmedSeedArtistEdges(seedId = activeDig.seed?.id) {
  if (!seedId) return [];
  const entities = explorationGraph.entities || {};
  return Object.values(explorationGraph.edges || [])
    .filter((edge) =>
      edge?.from === seedId &&
      edge?.kind === "probable_artist" &&
      edge?.status === "confirmed_user"
    )
    .map((edge) => ({ edge, artist: entities[edge.to] || null }))
    .filter(({ artist }) => artist?.type === "artist");
}

async function rejectSeedArtistEdge(edge, expectedSeedId = activeDig.seed?.id) {
  const seed = activeDig.seed;
  if (
    !seed ||
    seed.id !== expectedSeedId ||
    !edge ||
    edge.from !== seed.id ||
    edge.kind !== "probable_artist" ||
    edge.status !== "confirmed_user"
  ) return;

  compositionGeneration += 1;
  for (const controller of catalogueRequests.values()) controller.abort();
  catalogueRequests.clear();

  const response = await fetch("/api/graph/ingest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      edges: [{
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        status: "rejected_user",
        evidence: [...new Set([...(edge.evidence || []), "user_rejection"])]
      }]
    })
  });

  if (!response.ok) {
    throw new Error("La correction d’identité n’a pas pu être enregistrée.");
  }

  if (activeDig.seed?.id !== expectedSeedId) return;

  await recordFeedback("wrong_identity", seed.id, {
    previousEntityId: edge.to,
    corrected: ""
  }).catch(() => {});

  await refreshExplorationGraph(seed.id);
  if (activeDig.seed?.id !== expectedSeedId) return;

  const remainingArtists = confirmedSeedArtistEdges(seed.id);
  activeDig = {
    ...activeDig,
    catalogueGroups: {},
    front: null,
    synthMix: null,
    collaborationArtist: remainingArtists.length ? declaredDepartureArtist(explorationGraph, seed.id) : "",
    dossier: {
      ...(activeDig.dossier || {}),
      state: "partial",
      artistName: "",
      suppressWeakIdentityCandidates: !remainingArtists.length,
      message: "Confirmation révoquée pour cet artiste. Les autres participants confirmés restent explorables."
    }
  };
  explorationSession = null;
  currentDerivedIds = [];

  renderActiveSeed();
  renderCatalogueGroups();
  renderCollaborationAtlas();

  await openExploration({ seed, preserveLineage: true });
}

async function confirmSeedArtist(candidate, expectedSeedId = activeDig.seed?.id) {
  const seed = activeDig.seed;
  const generation = compositionGeneration;
  if (!seed || seed.id !== expectedSeedId || !currentJourneyGuidance().candidates.some(item => item.id === candidate.id)) return;
  const entities = [explorationGraph.entities?.[seed.id], explorationGraph.entities?.[candidate.id]].filter(Boolean);
  const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entities, edges: [{ from: seed.id, to: candidate.id, kind: "probable_artist", status: "confirmed_user", departureRevision: departureRevision(explorationGraph.entities?.[seed.id]), evidence: ["user_confirmation", MANUAL_DEPARTURE_EVIDENCE] }] }) });
  if (!response.ok) throw new Error("La confirmation n’a pas été enregistrée. Réessayez sans fermer ce parcours.");
  if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
  await refreshExplorationGraph(seed.id);
  if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
  activeDig.dossier = { state: "ready", artistName: candidate.name, artistId: candidate.id, sourceStates: {}, message: "Artiste choisi par vous pour ce départ. L’enregistrement exact reste distinct." };
  for (const group of Object.values(activeDig.catalogueGroups || {})) {
    group.confirmationCandidates = [];
    if (group.coverage?.state === "needs_confirmation") group.coverage = { state: "not_checked", message: "Identité confirmée. Lecture des catalogues…" };
  }
  await openExploration({ seed, preserveLineage: true, lineage: explorationSession?.lineage });
}

function renderSeedGuidance() {
  const host = document.querySelector("#seed-action");
  if (!host) return;
  if (activeDig.reviewRequired) { renderDepartureReview(host); return; }
  const guidance = currentJourneyGuidance();
  if (activeDig.participantDraft?.automatic && activeDig.participantDraft.seedId === activeDig.seed?.id && guidance.state !== 'loading') {
    host.replaceChildren(); host.hidden = false;
    const note = document.createElement('p');
    note.textContent = guidance.identityConfirmed
      ? 'Des liens catalogue sont disponibles pour ce départ. Les recherches par nom restent distinctes et à vérifier.'
      : 'Exploration par nom · identité non confirmée. Les directions catalogue attendent une fiche artiste ; les pistes YouTube restent disponibles selon vos filtres.';
    const edit = document.createElement('button'); edit.type = 'button';
    edit.textContent = 'Corriger le titre ou les artistes'; edit.onclick = beginDepartureReview;
    host.append(note, edit);
    return;
  }
  const departure = typedDepartureModel({ seed: activeDig.seed || {}, graph: explorationGraph, suggestion: resolvedArtist(seedVideo(activeDig.seed) || {}) });
  const correctionForm = host.querySelector(".departure-identity-controls");
  host.replaceChildren();
  host.hidden = !activeDig.seed || (!departure.container && ["ready", "idle"].includes(guidance.state));
  if (host.hidden) return;
  const panel = document.createElement("section");
  panel.className = `seed-action-card ${guidance.state === "loading" ? "is-pending" : departure.container ? "is-collection" : "is-blocked"}`;
  panel.innerHTML = `<h3>${escapeHtml(guidance.title)}</h3><p>${escapeHtml(guidance.message)}</p>`;
  const choices = document.createElement("div");
  choices.className = "seed-action-choices";
  const expectedSeedId = activeDig.seed.id;
  if (departure.container && guidance.state !== "loading") {
    const members = localDepartureMembers({ seed: activeDig.seed, graph: explorationGraph, library });
    const list = document.createElement("details"); list.className = "departure-members";
    const summary = document.createElement("summary"); summary.textContent = `${members.length} morceau(s) disponible(s) ici · choisir un départ`;
    list.append(summary); list.open = activeDig.seed.type === "playlist";
    const search = document.createElement("input"); search.type = "search"; search.placeholder = "Retrouver un morceau dans cette collection…"; search.setAttribute("aria-label", "Chercher dans les morceaux de ce départ");
    const rows = document.createElement("div"); rows.className = "departure-member-list";
    const more = document.createElement("button"); more.type = "button"; more.textContent = "Afficher davantage de morceaux";
    let limit = 12;
    const render = () => {
      const query = search.value.toLocaleLowerCase("fr").trim();
      const filtered = members.filter(item => `${item.label} ${item.artist || ""} ${item.channelTitle || ""}`.toLocaleLowerCase("fr").includes(query));
      rows.replaceChildren();
      for (const member of filtered.slice(0, limit)) {
        const button = document.createElement("button"); button.type = "button";
        button.textContent = member.label; button.dataset.departureMember = member.id;
        button.onclick = () => { if (activeDig.seed?.id === expectedSeedId) openExploration({ seed: member }).catch(error => workspace?.notify(error.message, { error: true })); };
        rows.append(button);
      }
      if (!filtered.length) rows.append(Object.assign(document.createElement("p"), { textContent: query ? "Aucun morceau ne correspond à cette recherche locale." : "Aucun morceau de cette collection n’est chargé ici." }));
      more.hidden = filtered.length <= limit;
    };
    search.oninput = () => { limit = 12; render(); }; more.onclick = () => { limit += 12; render(); };
    list.append(search, rows, more); render(); choices.append(list);
    if (activeDig.seed.type === "playlist" && !members.length) {
      const sources = document.createElement("button"); sources.type = "button"; sources.textContent = "Importer le contenu de la playlist";
      sources.onclick = () => workspace?.navigate("sources"); choices.append(sources);
    }
  }
  for (const candidate of guidance.candidates || []) {
    // Recording participants share one picker; do not offer a second,
    // contradictory identity-selection path above it.
    const participantNames = departure.identityForm === "recording" && !guidance.identityConfirmed
      ? splitArtistNames(departure.initialArtistName) : [];
    if (participantNames.length && participantNames.some(name => participantProposalMatches(candidate, name, name, participantNames.length))) continue;
    const row = document.createElement("div");
    const source = safeExternalUrl(candidate.sourceUrl);
    row.innerHTML = `<strong>${escapeHtml(candidate.name)}</strong>${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">Vérifier la fiche ${escapeHtml(evidenceLabel(candidate.source))} ↗</a>` : ""}<button type="button" data-confirm-artist>Oui, c’est ${escapeHtml(candidate.name)}</button><button type="button" data-explore-artist>${departure.identityForm === "artist" ? "Explorer cette fiche artiste" : "Explorer cette fiche sans confirmer le morceau"}</button>`;
    row.querySelector("[data-confirm-artist]").hidden = departure.identityForm === "artist";
    row.querySelector("[data-confirm-artist]").onclick = async event => {
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = "Confirmation et lecture…";
      try { await confirmSeedArtist(candidate, expectedSeedId); }
      catch (error) { renderSeedGuidance(); host.append(Object.assign(document.createElement("p"), { textContent: error.message, role: "alert" })); }
    };
    row.querySelector("[data-explore-artist]").onclick = () => {
      if (activeDig.seed?.id !== expectedSeedId) return;
      openExploration({ seed: { id: candidate.id, type: "artist", label: candidate.name, url: source } }).catch(error => { nodes.explorationState.textContent = error.message; });
    };
    choices.append(row);
  }
  if (!guidance.identityConfirmed && !departure.container && guidance.state !== "loading") {
    if (correctionForm?.dataset.seedId === expectedSeedId && correctionForm.dataset.choicesReady === String(Boolean(activeDig.identityChoices?.seedId === expectedSeedId))) choices.append(correctionForm);
    else renderArtistCorrection(choices, expectedSeedId);
    const retry = document.createElement("button"); retry.type = "button"; retry.textContent = departure.retryLabel;
    retry.hidden = departure.identityForm === "artist";
    retry.onclick = () => openExploration({ seed: activeDig.seed, preserveLineage: true }).catch(error => workspace?.notify(error.message, { error: true }));
    choices.append(retry);
    if (seedVideo(activeDig.seed)?.channelId) {
      const channel = document.createElement("button"); channel.type = "button"; channel.textContent = "Explorer la chaîne sans confirmer l’artiste";
      channel.onclick = async () => {
        try { setScoutMixerParameter("direction.curator.weight", 1); await exploreWorkspaceDirection("curator", { explore: true }); }
        catch (error) { workspace?.notify(error.message, { error: true }); }
      };
      choices.append(channel);
    }
  } else if (!guidance.candidates?.length && guidance.state !== "loading") {
    const retry = document.createElement("button");
    retry.type = "button";
    const identityKnown = departure.container || guidance.identityConfirmed || Boolean(activeDig.dossier?.artistId || activeDig.dossier?.artistName || activeDig.collaborationArtist);
    retry.textContent = guidance.state === "source_unavailable"
      ? "Réessayer les sources"
      : departure.container ? departure.retryLabel : identityKnown
        ? "Reprendre les catalogues"
        : "Identifier ce départ";
    retry.onclick = () => {
      if (identityKnown) {
        return loadScoutMixerDirections().catch(error => { nodes.explorationState.textContent = error.message; });
      }
      return openExploration({ seed: activeDig.seed, preserveLineage: true }).catch(error => { nodes.explorationState.textContent = error.message; });
    };
    choices.append(retry);
  }
  panel.append(choices);
  if (guidance.state === "loading") {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Arrêter la vérification";
    cancel.onclick = cancelWorkspaceSearch;
    panel.append(cancel);
  }
  if (guidance.state !== "loading") {
    const change = document.createElement("button");
    change.type = "button";
    change.textContent = "Choisir un autre départ";
    change.onclick = () => { if (workspace) return workspace.openPicker(); const picker = document.querySelector("#departure-picker"); picker.open = true; picker.scrollIntoView({ behavior: "smooth", block: "start" }); nodes.seedSelect.focus(); };
    panel.append(change);
  }
  host.append(panel);
}

function renderArtistCorrection(host, expectedSeedId) {
  const departure = typedDepartureModel({ seed: activeDig.seed || {}, graph: explorationGraph, suggestion: resolvedArtist(seedVideo(activeDig.seed) || {}) });
  const artistDeparture = departure.identityForm === "artist";
  if (!artistDeparture && departure.initialArtistName) return renderRecordingParticipants(host, expectedSeedId, departure.initialArtistName);
  const form = document.createElement("form");
  form.className = "departure-identity-form";
  form.dataset.seedId = expectedSeedId;
  form.dataset.choicesReady = String(Boolean(activeDig.identityChoices?.seedId === expectedSeedId));
  form.innerHTML = '<label for="departure-artist-query">Nom de l’artiste</label><p>Vous connaissez l’artiste ? Enregistrez son nom ici, même sans catalogue. Ce renseignement concerne uniquement ce morceau.</p><div class="identity-search-row"><input id="departure-artist-query" type="text" required maxlength="120" autocomplete="off"><button type="submit" data-save-departure-artist>Enregistrer le nom</button></div><p class="identity-save-status" role="status"></p><section class="identity-catalogue-step" aria-label="Connexions de l’artiste"><h4>Explorer ses connexions</h4><p>Choisissez une fiche pour suivre ses liens documentés. Le nom seul ne confirme pas une fiche ni l’enregistrement exact.</p><button type="button" data-search-departure-artist>Chercher dans les catalogues</button><p class="identity-search-status" role="status"></p><div class="identity-search-results"></div></section>';
  const input = form.querySelector("input"), results = form.querySelector(".identity-search-results"), status = form.querySelector('[role="status"]');
  const searchStatus = form.querySelector(".identity-search-status"), searchButton = form.querySelector("[data-search-departure-artist]");
  input.value = departure.initialArtistName;
  input.maxLength = 300;
  form.querySelector(".identity-catalogue-step > p").textContent = "Sélectionnez une fiche par participant à explorer, puis lancez la recherche commune. Les noms sans fiche restent conservés ; aucune identité n’est choisie automatiquement.";
  if (artistDeparture) {
    form.querySelector("label").textContent = "Artiste recherché";
    form.querySelector("p").textContent = "Précisez le nom, puis choisissez la fiche de cet artiste. Le choix conserve son identifiant exact, sans fusionner les homonymes.";
    form.querySelector("[data-save-departure-artist]").textContent = "Chercher les fiches";
    form.querySelector(".identity-catalogue-step > p").textContent = "Choisissez la bonne fiche pour explorer les sorties et les crédits de cet artiste.";
  }
  if (declaredDepartureArtist(explorationGraph, expectedSeedId) && !artistDeparture) {
    status.textContent = `Titre et artistes enregistrés. Sélectionnez les participants à explorer ci-dessous.`;
    form.querySelector("label").hidden = true;
    form.querySelector("p").hidden = true;
    form.querySelector(".identity-search-row").hidden = true;
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Corriger le titre ou les artistes";
    edit.onclick = beginDepartureReview; form.prepend(edit);
  }
  let revision = 0;
  let saving = false;
  const participantSelections = new Map();
  let lastRegistry = null;
  const current = () => activeDig.seed?.id === expectedSeedId && form.isConnected;
  const save = async candidate => {
    if (!current() || saving) return;
    if (artistDeparture && candidate) {
      saving = true;
      try { await openExploration({ seed: { ...candidate.entity, id: candidate.id, type: "artist", label: candidate.name, url: candidate.sourceUrl } }); }
      catch (error) { if (current()) status.textContent = error.message; }
      finally { saving = false; }
      return;
    }
    if (!candidate && !input.reportValidity()) return;
    const chosen = candidate ? [...new Map((Array.isArray(candidate) ? candidate : [candidate]).map(item => [item.id, item])).values()] : [];
    const name = String(input.value).normalize("NFC").trim(), generation = compositionGeneration;
    saving = true; revision++;
    const disabledControls = [...controls.querySelectorAll("button,input,select")].map(control => [control, control.disabled]);
    for (const [control] of disabledControls) control.disabled = true;
    status.textContent = "Enregistrement sur cet appareil…";
    try {
      const delta = chosen.length ? departureArtistsUpdate(explorationGraph, activeDig.seed, name, chosen) : departureArtistUpdate(explorationGraph, activeDig.seed, name);
      const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) });
      if (!response.ok) throw new Error("Le nom n’a pas été enregistré. Réessayez.");
      if (!current() || generation !== compositionGeneration) return;
      await refreshExplorationGraph(expectedSeedId);
      if (!current() || generation !== compositionGeneration) return;
      const persistedArtists = new Set(departureArtistIds(explorationGraph, expectedSeedId));
      if (declaredDepartureArtist(explorationGraph, expectedSeedId) !== name || chosen.some(item => !persistedArtists.has(item.id))) throw new Error("Tous les choix n’ont pas été retrouvés. Réessayez sans changer de morceau.");
      const video = seedVideo(activeDig.seed);
      if (video?.id) { artistCorrections[video.id] = name; saveLocalObject(CORRECTIONS_KEY, artistCorrections); }
      setActiveDig({ dossier: { state: candidate ? "ready" : "partial", artistName: name, ...(candidate ? { artistIds: chosen.map(item => item.id) } : { suppressWeakIdentityCandidates: true }), sourceStates: Object.fromEntries(chosen.map(item => [item.source, "matched"])), message: candidate ? `${chosen.length} fiche(s) choisie(s) pour explorer ce départ. Les autres noms sont conservés. L’enregistrement exact n’est pas confirmé.` : "Nom renseigné par vous pour ce morceau, sans rapprochement automatique avec les catalogues." }, collaborationArtist: candidate ? name : "" });
      if (candidate) await openExploration({ seed: activeDig.seed, preserveLineage: true });
      else {
        input.value = name;
        await persistExplorationSession();
        renderActiveSeed();
        status.textContent = `Nom enregistré : ${name}. Choisissez une fiche ci-dessous si vous souhaitez explorer ses connexions.`;
      }
    } catch (error) { if (current()) status.textContent = error.message; }
    finally { saving = false; for (const [control, disabled] of disabledControls) control.disabled = disabled; }
  };
  const show = (remote = null) => {
    lastRegistry = remote;
    results.replaceChildren();
    const candidates = remote?.candidates || catalogueArtistChoices(explorationGraph, input.value);
    searchStatus.textContent = candidates.length ? `${candidates.length} artiste(s) à vérifier — aucun n’est sélectionné automatiquement.` : remote ? "Aucune fiche correspondante trouvée dans les sources consultées. Vous pouvez réessayer ou indiquer une fiche ci-dessous." : artistDeparture ? "Aucune fiche locale correspondante. Recherchez dans les catalogues ou indiquez une fiche ci-dessous." : "Aucune fiche locale. Renseignez le nom si nécessaire, puis recherchez une fiche.";
    const groups = artistDeparture ? [{ query: input.value, candidates }] : remote?.groups || (remote ? [{ query: input.value, candidates }] : splitArtistNames(input.value).map(query => ({ query, candidates: catalogueArtistChoices(explorationGraph, query) })));
    const selected = participantSelections;
    const explore = document.createElement("button"); explore.type = "button"; explore.dataset.exploreParticipants = "true"; explore.disabled = true;
    const updateSelection = () => { explore.disabled = !selected.size; explore.textContent = `Explorer les artistes sélectionnés (${new Set([...selected.values()].map(item => item.id)).size})`; };
    explore.onclick = () => save([...selected.values()]);
    updateSelection();
    if (!artistDeparture) results.append(explore);
    for (let [groupIndex, group] of groups.entries()) {
      const section = document.createElement("fieldset"), legend = document.createElement("legend"); legend.textContent = group.query; section.append(legend);
      if (!artistDeparture && groups.length > 1 && group.query === input.value.trim()) {
        const collective = document.createElement("details"), summary = document.createElement("summary"); summary.textContent = "Nom collectif complet (si ces noms désignent un groupe)"; collective.append(summary, section); results.append(collective);
      } else results.append(section);
      if (selected.has(group.query) && !group.candidates.some(candidate => candidate.id === selected.get(group.query).id)) {
        // Retrying an unavailable provider must not discard a deliberate choice.
        group = { ...group, candidates: [selected.get(group.query), ...group.candidates] };
      }
      if (!group.candidates.length) section.append(Object.assign(document.createElement("p"), { textContent: group.state === "unavailable" ? "Recherche indisponible — réessayez. Ce nom reste conservé." : "Aucune fiche trouvée pour ce nom. Vous pouvez explorer les autres participants." }));
      const alternatives = document.createElement("details"), summary = document.createElement("summary"); summary.textContent = "Autres correspondances et homonymes à vérifier"; alternatives.append(summary);
      for (const candidate of group.candidates) {
      const row = document.createElement("div"); row.className = "identity-choice";
      const name = document.createElement("strong"); name.textContent = candidate.name;
      row.append(name);
      if (candidate.context) row.append(Object.assign(document.createElement("small"), { textContent: candidate.context }));
      for (const catalogue of candidate.catalogues || [candidate]) {
        const link = document.createElement("a"); link.href = catalogue.sourceUrl; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = `Vérifier sur ${catalogue.source === "discogs" ? "Discogs" : "MusicBrainz"} ↗`; row.append(link);
      }
      if (candidate.catalogues?.length > 1) { const note = document.createElement("small"); note.textContent = "Ces fiches sont reliées par des identifiants documentés."; row.append(note); }
      if (!artistDeparture) {
        const label = document.createElement("label"), choice = document.createElement("input"); choice.type = "radio"; choice.name = `participant-${groupIndex}`; choice.value = candidate.id;
        choice.checked = selected.get(group.query)?.id === candidate.id;
        choice.onchange = () => { selected.set(group.query, candidate); updateSelection(); };
        label.append(choice, document.createTextNode(` Explorer ${candidate.name}`)); row.append(label);
      } else {
      const button = document.createElement("button"); button.type = "button"; button.dataset.confirmDepartureArtist = candidate.id; button.textContent = `Utiliser ${candidate.name} et explorer`;
      button.onclick = () => save(candidate);
      row.append(button);
      }
      (artistChoiceRank(candidate.entity || candidate, group.query) >= 2 ? section : alternatives).append(row);
      }
      if (alternatives.children.length > 1) section.append(alternatives);
      if (!artistDeparture && group.candidates.length) {
        const label = document.createElement("label"), skip = document.createElement("input"); skip.type = "radio"; skip.name = `participant-${groupIndex}`; skip.checked = !selected.has(group.query);
        skip.onchange = () => { selected.delete(group.query); updateSelection(); };
        label.append(skip, document.createTextNode(" Ne pas explorer ce participant pour le moment")); section.append(label);
      }
    }
    if (candidates.length) {
      const none = document.createElement("button"); none.type = "button"; none.textContent = "Aucun de ces artistes";
      none.onclick = () => { revision++; selected.clear(); results.replaceChildren(); searchStatus.textContent = "Aucune fiche retenue. Vos noms restent conservés ; vous pouvez préciser la recherche ou coller la bonne fiche ci-dessous."; };
      results.append(none);
    }
    const unavailable = Object.entries(remote?.sourceStates || {}).filter(([, state]) => state !== "ok").map(([source, state]) => `${source} : ${state === "not_configured" ? "à connecter dans Bibliothèque & sources" : "indisponible, réessayez"}`);
    if (unavailable.length) searchStatus.textContent += ` Sources non consultées : ${unavailable.join(" ; ")}.`;
  };
  input.oninput = () => { revision++; participantSelections.clear(); refreshReferenceParticipants(); searchButton.disabled = false; status.textContent = artistDeparture ? "Recherche modifiée ; aucune fiche sélectionnée." : "Modification non enregistrée."; show(); };
  form.onsubmit = event => { event.preventDefault(); return artistDeparture ? searchButton.onclick() : save(null); };
  searchButton.onclick = async () => {
    const attempt = ++revision, generation = compositionGeneration, query = input.value.trim();
    if (query.length < 2) { searchStatus.textContent = "Saisissez au moins deux caractères pour la recherche catalogue. Un nom plus court peut être enregistré."; return; }
    searchButton.disabled = true; searchStatus.textContent = "Recherche de fiches artiste…";
    try {
      const registry = await searchDepartureArtistChoices(query);
      if (!current() || attempt !== revision || generation !== compositionGeneration) return;
      show(registry);
    } catch (error) { if (current() && attempt === revision) searchStatus.textContent = error.message; }
    finally { if (current() && attempt === revision) searchButton.disabled = false; }
  };
  const direct = document.createElement("details"); direct.className = "identity-direct-link";
  direct.innerHTML = '<summary>J’ai un lien vers la bonne fiche artiste</summary><label>Fiche Discogs ou MusicBrainz<input type="url" placeholder="https://www.discogs.com/artist/…" aria-label="Lien de la fiche artiste"></label><button type="button">Vérifier cette fiche</button><p role="status"></p>';
  const referenceParticipant = document.createElement("select"); referenceParticipant.setAttribute("aria-label", "Participant concerné par la fiche");
  const refreshReferenceParticipants = () => {
    const previous = referenceParticipant.value;
    referenceParticipant.replaceChildren(...splitArtistNames(input.value).map(name => new Option(name, name)));
    if ([...referenceParticipant.options].some(option => option.value === previous)) referenceParticipant.value = previous;
  };
  refreshReferenceParticipants();
  if (!artistDeparture) direct.querySelector("button").before(referenceParticipant);
  direct.querySelector("button").onclick = async event => {
    if (saving) return;
    const value = direct.querySelector("input").value, message = direct.querySelector('[role="status"]');
    if (!catalogueArtistReference(value)) { message.textContent = "Une URL de fiche artiste Discogs ou MusicBrainz est requise."; return; }
    const attempt = ++revision, query = referenceParticipant.value || input.value;
    event.currentTarget.disabled = true; message.textContent = "Vérification de la fiche…";
    try {
      const response = await fetch(`/api/music/artist-choices?${new URLSearchParams({ reference: value })}`, { signal: AbortSignal.timeout(16000) });
      if (!response.ok) throw new Error("Cette fiche n’a pas pu être lue.");
      const data = await response.json();
      if (current() && attempt === revision) {
        const groups = [...(lastRegistry?.groups || splitArtistNames(input.value).map(name => ({ query: name, candidates: catalogueArtistChoices(explorationGraph, name) })))];
        if (!groups.some(group => group.query === query)) groups.push({ query, candidates: [] });
        show(artistDeparture ? data : { candidates: [...(lastRegistry?.candidates || []), ...(data.candidates || [])], sourceStates: data.sourceStates, groups: groups.map(group => group.query === query ? { ...group, candidates: [...new Map([...group.candidates, ...(data.candidates || [])].map(candidate => [candidate.id, candidate])).values()] } : group) });
        message.textContent = "Fiche ajoutée aux propositions du participant. Vérifiez-la puis sélectionnez-la ; les autres choix restent conservés.";
      }
    } catch (error) { if (current()) message.textContent = error.message; }
    finally { direct.querySelector("button").disabled = false; }
  };
  const controls = document.createElement("div"); controls.className = "departure-identity-controls"; controls.dataset.seedId = expectedSeedId;
  controls.dataset.choicesReady = form.dataset.choicesReady;
  controls.append(form, direct); host.append(controls);
  show(activeDig.identityChoices?.seedId === expectedSeedId ? activeDig.identityChoices.registry : null);
}

async function searchDepartureArtistChoices(query) {
  const generation = compositionGeneration, seedId = activeDig.seed?.id;
  return searchCreditChoices(query, async name => {
    const response = await fetch(`/api/music/artist-choices?${new URLSearchParams({ name })}`, { signal: AbortSignal.timeout(16000) });
    if (!response.ok) throw new Error("La recherche catalogue est indisponible. Réessayez.");
    return response.json();
  }, { isCurrent: () => generation === compositionGeneration && seedId === activeDig.seed?.id });
}

function participantSearchPool() {
  const draft = activeDig.participantDraft;
  if (draft?.seedId !== activeDig.seed?.id || !draft?.launched) return [];
  return participantResults(draft.launched).map(result => ({
    ...result.item, participantNameSearch: true, participantVia: result.via,
    artist: '', artistIds: [],
    explanation: `Recherche par nom : ${result.via.join(', ')} · identité et crédits à vérifier.`,
    evidence: ['Recherche YouTube par nom ; aucun crédit confirmé par cette recherche.']
  }));
}

function decodeYoutubeTitle(value = '') {
  // Decode entities only, never interpret remote markup as DOM content.
  const decoder = document.createElement('textarea');
  return String(value).replace(/&(?:#\d+|#x[\da-f]+|[a-z]+);/gi, entity => {
    decoder.innerHTML = entity;
    return decoder.value;
  });
}

function participantVideoQuery(row, rows) {
  const name = row.query.trim() || row.name;
  const quoted = value => `"${value.replaceAll('"', '').trim()}"`;
  if ([...name.replace(/[^\p{L}\p{N}]/gu, '')].length > 3) return `${quoted(name)} music`;
  const peer = rows.find(other => other !== row && other.name.toLocaleLowerCase('fr') !== row.name.toLocaleLowerCase('fr')
    && [...other.name.replace(/[^\p{L}\p{N}]/gu, '')].length > 3);
  return `${quoted(name)} ${quoted(peer?.name || activeDig.seed?.label || '')} music`;
}

async function searchSuggestedParticipants(draft) {
  const generation = compositionGeneration;
  const current = () => generation === compositionGeneration && activeDig.seed?.id === draft.seedId
    && activeDig.participantDraft === draft && !activeDig.reviewRequired;
  const available = (accessToken && Date.now() < tokenExpiresAt - 15000) || nodes.apiKey.value.trim();
  // These are search hints only: never ingest credits or choose catalogue identities.
  for (const row of draft.launched) {
    if (!current()) return;
    if (!available) { row.videoStatus = 'accès YouTube non configuré ; lien de recherche disponible'; continue; }
    row.videoStatus = 'recherche YouTube en cours'; renderCommonParticipantResults();
    try {
      const data = await youtube('search', { part: 'snippet', type: 'video', videoCategoryId: '10', q: participantVideoQuery(row, draft.launched), maxResults: 6 });
      if (!current()) return;
      row.videos = (data.items || []).filter(item => /^[\w-]{11}$/.test(item.id?.videoId || '')).map(item => ({
        id: `video:youtube:${item.id.videoId}`, type: 'video', title: decodeYoutubeTitle(item.snippet?.title || 'Vidéo'), artist: '', source: 'youtube',
        channelId: item.snippet?.channelId || '', channelTitle: item.snippet?.channelTitle || '', publishedAt: item.snippet?.publishedAt || '',
        listen: { kind: 'video', videoId: item.id.videoId, url: `https://www.youtube.com/watch?v=${item.id.videoId}` }
      }));
      row.videoStatus = row.videos.length ? `${row.videos.length} pistes par nom à vérifier` : 'aucune vidéo trouvée pour cette requête';
    } catch (error) {
      if (!current()) return;
      row.videoStatus = `recherche indisponible : ${error.message}`;
    }
    if (current()) renderCommonParticipantResults();
  }
  if (current()) renderCommonParticipantResults();
}

async function searchSuggestedParticipantIdentities(draft) {
  const generation = compositionGeneration;
  const isCurrent = () => generation === compositionGeneration && activeDig.seed?.id === draft.seedId
    && activeDig.participantDraft === draft && !activeDig.reviewRequired;
  let next = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (isCurrent() && next < draft.rows.length) {
      const row = draft.rows[next++];
      if (row.candidate) continue;
      const revision = ++row.revision;
      row.searching = true;
      row.status = 'Recherche automatique de fiches…';
      renderCommonParticipantResults();
      try {
        const data = await searchDepartureArtistChoices(row.query.trim() || row.name);
        if (!isCurrent() || row.revision !== revision) continue;
        row.candidates = [...new Map([...(row.candidates || []), ...(data.candidates || [])]
          .map(candidate => [candidate.id, candidate])).values()];
        row.status = row.candidates.length
          ? 'Choisissez la fiche correspondante pour explorer ses liens catalogue.'
          : 'Aucune fiche trouvée dans les sources consultées. La recherche par nom reste disponible.';
        const failures = Object.entries(data.sourceStates || {}).filter(([, state]) => state !== 'ok');
        if (failures.length) row.status += ' Sources non consultées : ' + failures.map(([source, state]) => `${source} (${state})`).join(', ');
      } catch (error) {
        if (isCurrent() && row.revision === revision) row.status = `Recherche de fiches indisponible : ${error.message}`;
      } finally {
        if (row.revision === revision) row.searching = false;
        if (isCurrent()) renderCommonParticipantResults();
      }
    }
  }));
}

function renderCommonParticipantResults() {
  const anchor = document.querySelector('#seed-action');
  if (!anchor) return;
  let host = document.querySelector('#participant-common-results');
  if (!host) { host = document.createElement('div'); host.id = 'participant-common-results'; anchor.after(host); }
  host.replaceChildren();
  const draft = activeDig.participantDraft;
  host.hidden = !activeDig.seed || draft?.seedId !== activeDig.seed.id || !draft?.launched;
  if (host.hidden) return;
  if (draft.automatic && !activeDig.reviewRequired) {
    renderRecordingParticipants(host, draft.seedId, declaredDepartureArtist(explorationGraph, draft.seedId) || draft.rows.map(row => row.name).join(', '), { compact: true });
  }
  renderParticipantResults(host, draft, Object.values(activeDig.catalogueGroups || {}).flatMap(group => group.items || []), { summaryOnly: true });
  if (participantSearchPool().length && createScoutPatch(activeDig.synthPatch).otherArtistsOnly && !createScoutPatch(activeDig.synthPatch).includeUnknownArtists) {
    const reveal = document.createElement('button'); reveal.type = 'button';
    reveal.textContent = 'Inclure les recherches par nom dans les résultats — à vérifier';
    reveal.onclick = () => { setScoutMixerParameter('scope.unknownArtists', true); renderCommonParticipantResults(); };
    host.append(reveal);
  }
  // This function also runs as each participant's asynchronous search finishes.
  renderScoutMixerPanel();
  renderCollaborationAtlas();
  if (draft.launched && !activeDig.reviewRequired) {
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Modifier les participants et leurs recherches'; edit.disabled = draft.busy;
    edit.onclick = () => { edit.disabled = true; renderRecordingParticipants(host, activeDig.seed.id, declaredDepartureArtist(explorationGraph, activeDig.seed.id) || draft.rows.map(row => row.name).join(', ')); };
    host.append(edit);
  }
}

function participantProposalMatches(candidate, name, query, count) {
  return count === 1 || Boolean(artistChoiceRank({ ...candidate, type: 'artist' }, name))
    || Boolean(artistChoiceRank({ ...candidate, type: 'artist' }, query));
}

function renderRecordingParticipants(host, expectedSeedId, credit, { compact = false } = {}) {
  const draft = participantDraft(expectedSeedId, splitArtistNames(credit), activeDig.participantDraft);
  activeDig.participantDraft = draft;
  for (const row of draft.rows) {
    const registry = activeDig.identityChoices?.seedId === expectedSeedId ? activeDig.identityChoices.registry : null;
    const proposals = (currentJourneyGuidance().candidates || []).filter(candidate =>
      participantProposalMatches(candidate, row.name, row.query, draft.rows.length));
    // Merge late proposals too. An empty registry must not hide graph cards,
    // and refreshing proposals must never select or clear a user's identity.
    row.candidates = [...new Map([
      ...proposals,
      ...catalogueArtistChoices(explorationGraph, row.name),
      ...(registry?.groups?.find(group => group.query === row.name)?.candidates || []),
      ...(row.candidates || []),
      ...(row.candidate ? [row.candidate] : [])
    ].map(candidate => [candidate.id, candidate])).values()];
    if (row.candidates.length && row.status === 'Non identifié') {
      row.status = 'Propositions à vérifier — choisissez une fiche, ou continuez sans fiche.';
    }
  }
  const isCurrent = () => activeDig.seed?.id === expectedSeedId && activeDig.participantDraft === draft && !activeDig.reviewRequired;
  const shell = document.createElement('div'); host.append(shell);
  let firstRender = true;
  const refresh = () => {
    if (!isCurrent()) return;
    // The parent guidance panel is assembled off-DOM on its first render.
    // Only a later detached panel needs the current active seed rendered again.
    if (!firstRender && !shell.isConnected) { renderActiveSeed(); return; }
    firstRender = false;
    shell.replaceChildren();
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Corriger le titre ou les crédits'; edit.disabled = draft.busy; edit.onclick = beginDepartureReview; if (!compact) shell.append(edit);
    mountParticipantPicker(shell, { draft, isCurrent, refresh, compact,
      search: query => searchDepartureArtistChoices(query),
      reference: async url => {
        if (!catalogueArtistReference(url)) throw new Error('Indiquez une fiche artiste MusicBrainz ou Discogs valide.');
        const response = await fetch(`/api/music/artist-choices?${new URLSearchParams({ reference: url })}`, { signal: AbortSignal.timeout(16000) });
        if (!response.ok) throw new Error('Fiche indisponible ; le participant reste sélectionnable sans fiche.');
        return response.json();
      },
      explore: async rows => {
        draft.automatic = false;
        const generation = compositionGeneration, seed = activeDig.seed;
        for (const row of draft.rows) row.revision++;
        const selected = rows.map(row => ({ name: row.name, query: row.query.trim() || row.name, candidate: row.candidate, videos: [], videoStatus: 'en attente' }));
        const candidates = selected.map(row => row.candidate).filter(Boolean);
        const delta = candidates.length ? departureArtistsUpdate(explorationGraph, seed, credit, candidates) : departureArtistUpdate(explorationGraph, seed, credit);
        if (!candidates.length) delta.edges = confirmedSeedArtistEdges(expectedSeedId).map(({ edge }) => ({ ...edge, status: 'rejected_user', evidence: [...(edge.evidence || []), 'user_rejection'] }));
        const response = await fetch('/api/graph/ingest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(delta) });
        if (!response.ok) throw new Error('Sélection non enregistrée. Les recherches n’ont pas été lancées.');
        if (!isCurrent() || generation !== compositionGeneration) return;
        await refreshExplorationGraph(expectedSeedId);
        if (!isCurrent() || generation !== compositionGeneration) return;
        // Keep results supported by a still-selected identity. Coverage/cursors
        // belong to the old selection, so rebuild them for the new search scope.
        activeDig.catalogueGroups = Object.fromEntries(Object.entries(activeDig.catalogueGroups || {}).map(([direction, group]) => {
          const items = direction === 'curator' ? [...(group.items || [])] :
            [...new Map(selected.flatMap(row => participantCatalogueItems(row, group.items || [])).map(item => [item.id, item])).values()];
          return [direction, { items, selectedIds: [], seenIds: [], turn: 0, coverage: { state: 'not_checked' } }];
        }));
        draft.launched = selected;
        draft.message = 'Participants sélectionnés ; lecture des liens catalogue et recherche YouTube par nom.';
        if (candidates.length) {
          try { await openExploration({ seed, preserveLineage: true, lineage: explorationSession?.lineage || [] }); }
          catch (error) { draft.message = `Lecture des catalogues interrompue : ${error.message}`; return; }
        }
        if (!isCurrent()) return;
        const searchGeneration = compositionGeneration;
        const stillCurrent = () => isCurrent() && searchGeneration === compositionGeneration;
        const available = (accessToken && Date.now() < tokenExpiresAt - 15000) || nodes.apiKey.value.trim();
        let next = 0;
        const worker = async () => {
          while (next < selected.length && stillCurrent()) {
            const row = selected[next++];
            if (!available) { row.videoStatus = 'accès YouTube non configuré ; lien de recherche disponible'; continue; }
            row.videoStatus = 'recherche YouTube en cours'; renderCommonParticipantResults();
            try {
              const data = await youtube('search', { part: 'snippet', type: 'video', videoCategoryId: '10', q: participantVideoQuery(row, selected), maxResults: 6 });
              if (!stillCurrent()) return;
              row.videos = (data.items || []).filter(item => /^[\w-]{11}$/.test(item.id?.videoId || '')).map(item => ({ id: `video:youtube:${item.id.videoId}`, type: 'video', title: item.snippet?.title || 'Vidéo', artist: '', source: 'youtube', channelId: item.snippet?.channelId || '', channelTitle: item.snippet?.channelTitle || '', publishedAt: item.snippet?.publishedAt || '', listen: { kind: 'video', videoId: item.id.videoId, url: `https://www.youtube.com/watch?v=${item.id.videoId}` } }));
              row.videoStatus = row.videos.length ? `${row.videos.length} pistes par nom à vérifier` : 'aucune vidéo trouvée pour cette requête';
            } catch (error) { if (stillCurrent()) row.videoStatus = `recherche indisponible : ${error.message}`; }
            if (stillCurrent()) renderCommonParticipantResults();
          }
        };
        await Promise.all([worker(), worker()]);
        if (!stillCurrent()) return;
        draft.message = 'Recherche commune terminée. Les résultats et les limites sont détaillés pour chaque participant.';
        renderCommonParticipantResults();
      }
    });
  };
  refresh();
}

function renderSeedOptions(preferredId = "") {
  const query = document.querySelector("#seed-search").value;
  const choices = seedPickerChoices(seedCatalog, { graph: explorationGraph, library, playlists, query, type: nodes.seedType.value });
  const previous = preferredId || nodes.seedSelect.value;
  nodes.seedSelect.replaceChildren();
  if (!choices.length) {
    const option = new Option(query ? "Aucun résultat local — essayez un autre nom ou type" : "Aucun départ documenté pour ce type", "");
    nodes.seedSelect.add(option);
    nodes.startExploration.disabled = true;
    nodes.seedMetrics.textContent = "";
    workspace?.renderChoices(choices);
    return;
  }
  for (const seed of choices) nodes.seedSelect.add(new Option(`${seed.label} · ${seed.relationCount} relation${seed.relationCount > 1 ? "s" : ""}`, seed.id));
  if (choices.some(({ id }) => id === previous)) nodes.seedSelect.value = previous;
  nodes.startExploration.disabled = false;
  renderSeedMetrics();
  workspace?.renderChoices(choices);
}

function renderSeedMetrics() {
  const seed = currentSeed();
  if (!seed) return void (nodes.seedMetrics.textContent = "");
  const metrics = seedCoverage(explorationGraph, seed.id, selectedExplorationDirections(), currentExplorationDepth());
  nodes.seedMetrics.innerHTML = `<span>${metrics.documentedRelations} relation${metrics.documentedRelations > 1 ? "s" : ""} directe${metrics.documentedRelations > 1 ? "s" : ""}</span><span>${metrics.practicableBranches}/${selectedExplorationDirections().length} branche${selectedExplorationDirections().length > 1 ? "s" : ""} praticable${metrics.practicableBranches > 1 ? "s" : ""}</span><span>${metrics.reachableTargets} cible${metrics.reachableTargets > 1 ? "s" : ""} documentée${metrics.reachableTargets > 1 ? "s" : ""}</span>`;
}

async function persistLocalCollaborationGraph() {
  // Collection credits belong to the picker, not to every departure graph.
}

async function refreshExplorationGraph(preferredId = "") {
  const sequence = ++graphReadSequence;
  const generation = compositionGeneration;
  const activeLibrary = explorationLibrary({ includeExternal: false });
  const refreshPicker = snapshot => {
    const pickerState = augmentExplorationGraph(snapshot, activeLibrary, collaborationIndex);
    const pickerGraph = projectActiveCollectionGraph(pickerState, activeLibrary);
    seedCatalog = buildSeedCatalog(pickerGraph, activeLibrary, collaborationIndex);
    renderSeedOptions(preferredId || explorationSession?.seed?.id || "");
  };
  // Local collection access must not depend on a working exploration API.
  refreshPicker({ entities: {}, edges: {} });
  const response = await fetch("/api/graph");
  if (!response.ok) throw new Error("Le graphe local n’est pas accessible.");
  const snapshot = await response.json();
  if (sequence !== graphReadSequence || generation !== compositionGeneration) return explorationGraph;
  serverGraph = sanitizeExplorationGraph(snapshot);
  const seed = activeDig.seed;
  const scopedLibrary = seed ? explorationLibrary().filter(video =>
    `video:youtube:${video.id}` === seed.id ||
    seed.type === "playlist" && (video.playlistIds || []).some(id => `playlist:youtube:${id}` === seed.id) ||
    seed.type === "channel" && `channel:youtube:${video.channelId}` === seed.id ||
    Object.hasOwn(serverGraph.entities || {}, `video:youtube:${video.id}`)) : [];
  explorationGraph = departureRoutingSnapshot(augmentExplorationGraph(serverGraph, scopedLibrary, []));

  /*
   * Le picker appartient à la collection active, pas à la mémoire du graphe.
   *
   * Les externalSeeds et les découvertes restent utilisables explicitement
   * pendant un parcours, mais ne deviennent pas spontanément des départs
   * proposés lors d'un retour au picker.
   */
  refreshPicker(serverGraph);
  return explorationGraph;
}

function selectedExplorationDirections() {
  return [...nodes.explorationDirections.querySelectorAll("input:checked")].map(({ value }) => value);
}

let explorationSaveQueue = Promise.resolve();
async function persistExplorationSession() {
  if (!explorationSession) return;
  setActiveDig({ front: explorationSession });
  activeDig.engineVersion = CLIENT_VERSION;
  activeDig.derivedIds = [...currentDerivedIds];
  activeDig.derived = [...derivedPool.values()];
  try { saveLocalObject(EXPLORATION_SETTINGS_KEY, { synthPatch: activeDig.synthPatch }); } catch {}
}

function branchStatusLabel(status) {
  return ({ active: "active", ready: "pistes disponibles", loading: "recherche en cours", needs_confirmation: "à confirmer", paused: "laissée de côté", explored: "explorée", dismissed: "fermée", unexplored: "non explorée", needs_enrichment: "à compléter", source_unavailable: "source indisponible", exhausted: "parcourue" })[status] || status;
}

function evidenceLabel(value = "") {
  return String(value).split(" + ").map((source) => {
    if (source.startsWith("video:youtube:")) return "YouTube";
    if (source === "musicbrainz") return "MusicBrainz";
    if (source === "discogs") return "Discogs";
    return source.replaceAll("_", " ");
  }).filter(Boolean).join(" + ");
}

function renderPath(candidate) {
  if (!candidate?.steps?.length) return "<p class=\"branch-empty\">Aucun passage documenté.</p>";
  return `<ol class="branch-path">${candidate.steps.map((step) => `<li><strong>${escapeHtml(step.from.label)}</strong><span>${escapeHtml(step.relationLabel || RELATION_LABELS[step.relation] || step.relation)}</span><strong>${escapeHtml(step.to.label)}</strong><small>Source : ${escapeHtml(evidenceLabel(step.source) || step.relationStatus || "relation locale")}</small></li>`).join("")}</ol>`;
}

function renderExplorationSession() {
  const session = explorationSession;
  nodes.explorationBranches.replaceChildren();
  nodes.explorationLineage.replaceChildren();
  nodes.explorationResume.hidden = !session;
  nodes.explorationLineage.hidden = !session?.lineage?.length;
  nodes.refreshExploration.hidden = !session;
  nodes.clearExploration.hidden = !session;
  if (!session) {
    nodes.explorationState.textContent = "Aucune fouille ouverte";
    nodes.explorationResume.textContent = "";
    renderActiveSeed();
    renderCollaborationAtlas();
    workspace?.update();
    return;
  }
  renderActiveSeed();
  const journey = currentJourneyGuidance();
  const presentations = session.branches.map(branch => branchGuidance(branch, activeDig.catalogueGroups?.[branch.direction], journey));
  const activeCount = presentations.filter(view => ["active", "ready"].includes(view.state)).length;
  nodes.explorationState.textContent = journey.state === "needs_confirmation" && !activeCount ? "Une confirmation pour continuer" : `${session.branches.length} direction${session.branches.length > 1 ? "s" : ""} · ${activeCount} accessible${activeCount > 1 ? "s" : ""}`;
  nodes.explorationResume.innerHTML = `<strong>Front repris</strong><span>Graine : ${escapeHtml(session.seed.label)} · dernière trace ${new Date(session.updatedAt || session.createdAt).toLocaleString("fr-FR")}</span><button type="button" data-reroll-all>Changer de branche partout ↻</button>`;
  nodes.explorationResume.querySelector("button").disabled = !activeCount;
  if (session.lineage?.length) {
    const trail = [session.lineage[0].fromSeed, ...session.lineage.map(({ chosen }) => chosen)];
    nodes.explorationLineage.innerHTML = `<p>Parcours conservé</p><ol>${trail.map((entry, index) => {
      const step = index ? session.lineage[index - 1] : null;
      const relations = step?.path?.map(({ relation, relationLabel }) => relationLabel || RELATION_LABELS[relation] || relation).join(" → ") || "graine";
      return `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(step ? `${step.direction} · ${relations}` : relations)}</small></li>`;
    }).join("")}</ol>`;
  }
  // Results, proofs and direction actions are rendered once by the unified rack.
  renderCollaborationAtlas();
  workspace?.update();
}

async function fetchDiscogsProfile(identity) {
  const artistId = identity?.externalIds?.discogs;
  if (!artistId) return null;
  const response = await fetch(`/api/music/discogs/artist?id=${encodeURIComponent(artistId)}`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error("Catalogue Discogs indisponible.");
  return response.json();
}

async function hydrateExplorationSeed(seed) {
  const generation = compositionGeneration;
  let video = seedVideo(seed);

  if (["playlist", "label"].includes(seed.type)) {
    return departureCoverage(seed, { graph: explorationGraph });
  }

  if (!video && seed.type === "artist") {
    video = library.find((candidate) =>
      entityTokens(resolvedArtist(candidate)?.name || "").join("") ===
      entityTokens(seed.label).join("")
    ) || null;
  }

  /*
   * V2.7R1 — RECORDING-FIRST IDENTIFICATION
   *
   * Pour une vidéo/morceau, aucun segment du titre ne devient directement une
   * identité artiste. Les noms issus du titre, de la chaîne ou d'une ancienne
   * hypothèse ne sont que des projections de recherche pour le résolveur de
   * recording.
   */
  const graphValues = (value) =>
    Array.isArray(value) ? value : Object.values(value || {});

  const currentGraph =
    typeof explorationGraph === "undefined"
      ? {}
      : explorationGraph;

  const graphEntities = new Map(
    graphValues(currentGraph.entities)
      .filter(Boolean)
      .map((entity) => [entity.id, entity])
  );

  const trustedIdentityStatuses = new Set([
    "confirmed_cross_id",
    "confirmed_user",
    "corroborated"
  ]);

  const confirmedArtistEdge = graphValues(currentGraph.edges).find((edge) =>
    edge?.from === seed.id &&
    edge?.kind === "probable_artist" &&
    trustedIdentityStatuses.has(String(edge.status || "")) &&
    graphEntities.get(edge.to)?.type === "artist"
  );

  const confirmedArtistName =
    String(graphEntities.get(confirmedArtistEdge?.to)?.name || "").trim();

  let artistName =
    seed.type === "artist"
      ? String(seed.label || "").trim()
      : confirmedArtistName;

  let recording = null;
  let recordingConflict = false;

  if (video && seed.type !== "artist") {
    const observedArtist = resolvedArtist(video);
    // One metadata parser, including its generic-channel exclusions. A Topic
    // channel is never promoted independently of the track's actual credits.
    const strongMetadataArtist = String(declaredDepartureArtist(currentGraph, seed.id) ||
      (observedArtist?.confidence >= 0.95 ? observedArtist.name : "")).trim();

    const hints = [];
    const hintKeys = new Set();

    const addHint = (value) => {
      const cleaned = String(value || "")
        .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/gu, "")
        .replace(/^\[[^\]]+\]\s*/u, "")
        .trim();

      const key = cleaned
        .toLocaleLowerCase("fr-FR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");

      if (
        cleaned.length < 2 ||
        cleaned.length > 120 ||
        !key ||
        hintKeys.has(key)
      ) return;

      hintKeys.add(key);
      hints.push(cleaned);
    };

    addHint(confirmedArtistName);
    for (const hint of recordingArtistHints(strongMetadataArtist)) addHint(hint);

    // Une ancienne hypothèse peut aider la recherche, jamais décider l'identité.
    addHint(resolvedArtist(video)?.name || "");

    const parsed = parseTrackCandidate(video.title || "");
    if (parsed?.status === "parsed") addHint(parsed.artist);

    // Never turn a bare title (GREEN DAY, John Gotti…) into an artist query.
    if (parsed?.status === "parsed") addHint(artistSearchHint(video.title));

    setActiveDig({
      seed,
      dossier: {
        state: "loading",
        sourceStates: {},
        message: "Résolution du morceau avant toute attribution d’artiste…"
      }
    });
    renderActiveSeed();

    const probes = [], recordingQueries = hints.length ? hints : [""];
    for (let offset = 0; offset < recordingQueries.length; offset += 3) {
      if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return sourceCoverage({}, false);
      probes.push(...await Promise.allSettled(recordingQueries.slice(offset, offset + 3).map(hint => recordingDetails(video, hint))));
    }

    if (
      generation !== compositionGeneration ||
      activeDig.seed?.id !== seed.id
    ) return sourceCoverage({}, false);

    const recordings = new Map();

    for (const result of probes) {
      if (result.status !== "fulfilled") continue;
      const id = result.value?.resolved?.id ? `musicbrainz:${result.value.resolved.id}`
        : result.value?.resolvedDiscogsTrack?.id ? `discogs:${result.value.resolvedDiscogsTrack.id}` : "";
      if (!id || recordings.has(id)) continue;
      recordings.set(id, result.value);
    }

    if (recordings.size === 1) {
      recording = [...recordings.values()][0];
    } else if (recordings.size > 1) {
      recordingConflict = true;
    }

    const recordingArtist =
      (recording?.resolved || recording?.resolvedDiscogsTrack)?.artistCredits
        ?.map((credit) => String(credit?.name || "").trim())
        .find(Boolean) || "";

    /*
     * V2.7R6 — DISPUTED IDENTITY GATE
     * Sur TRACK/VIDEO, l'ancienne confirmation reste dans le graphe et dans
     * les hints de recherche, mais ne peut plus empêcher R5 de tester les
     * hypothèses concurrentes ni redevenir silencieusement l'autorité de
     * routage après recording=not_found.
     */
    artistName =
      recordingArtist ||
      strongMetadataArtist;

    /*
     * V2.7R5 — ARTIST BOOTSTRAP
     *
     * Si aucun recording unique n'a répondu, Scout peut encore tester les
     * segments déjà produits par le parseur. Il ne promeut cependant pas un
     * nom sur sa seule ressemblance textuelle : le segment doit aussi être
     * présent comme tag YouTube exact ET l'identité externe doit être
     * corroborée/résolue par le registre d'identité.
     *
     * Cela permet par exemple à "Nexxor" de devenir une identité de travail
     * sans transformer automatiquement "Space Travel" ou "Statik Travel 21"
     * en artistes.
     */
    if (!artistName && !recordingConflict) {
      const bootstrapKey = (value) =>
        String(value || "")
          .toLocaleLowerCase("fr-FR")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "");

      const youtubeTagKeys = new Set(
        (Array.isArray(video.tags) ? video.tags : [])
          .map(bootstrapKey)
          .filter(Boolean)
      );

      const strongIdentityStatuses = new Set([
        "resolved",
        "confirmed_cross_id",
        "confirmed_user"
      ]);

      for (const hint of hints.slice(0, 6)) {
        const hintKey = bootstrapKey(hint);
        if (!hintKey || !youtubeTagKeys.has(hintKey)) continue;

        const candidateIdentity = await identityDetails(hint).catch(() => null);

        if (
          generation !== compositionGeneration ||
          activeDig.seed?.id !== seed.id
        ) return sourceCoverage({}, false);

        const musicbrainzExact =
          candidateIdentity?.claims?.some((claim) =>
            claim?.source === "musicbrainz" &&
            claim?.field === "name" &&
            claim?.status === "exact_name" &&
            bootstrapKey(claim?.value) === hintKey
          ) === true;
        const discogsExact =
          candidateIdentity?.discogs?.status === "matched" &&
          candidateIdentity?.discogs?.match === "exact" &&
          bootstrapKey(candidateIdentity?.discogs?.name) === hintKey;

        if (
          candidateIdentity &&
          (
            strongIdentityStatuses.has(String(candidateIdentity.resolution?.status || "")) ||
            (musicbrainzExact && discogsExact)
          )
        ) {
          artistName = String(candidateIdentity.canonicalName || hint).trim();
          break;
        }
      }
    }

    if (!artistName) {
      const sourceStates = {
        recording: recordingConflict ? "candidate" : probes.length && probes.every(result => result.status === "rejected") ? "unavailable" : "not_found"
      };

      setActiveDig({
        seed,
        collaborationArtist: "",
        dossier: {
          state: "partial",
          artistName: "",
          videoId: video.id || "",
          sourceStates,
          suppressWeakIdentityCandidates: true,
          message: recordingConflict
            ? "Plusieurs recordings incompatibles répondent aux lectures possibles du titre. Aucun segment n’est promu en identité artiste."
            : "Aucun recording unique n’a confirmé l’artiste. Les segments du titre restent de simples hypothèses de recherche."
        }
      });
      renderActiveSeed();
      renderCollaborationAtlas();
      return sourceCoverage({}, false);
    }
  }

  if (!artistName || (!video && seed.type !== "artist")) {
    return sourceCoverage({}, false);
  }

  setActiveDig({
    seed,
    dossier: {
      state: "loading",
      sourceStates: {},
      message: video
        ? "Vérification des catalogues à partir des crédits disponibles…"
        : "Interrogation des catalogues structurés…"
    }
  });
  renderActiveSeed();

  const identityResult =
    await Promise.allSettled([identityDetails(artistName)])
      .then(([result]) => result);

  const identity =
    identityResult.status === "fulfilled"
      ? identityResult.value
      : null;

  const [musicResult, wikidataResult, recordingResult, discogsResult] =
    await Promise.allSettled([
      artistDetails(artistName),
      artistContext(artistName),
      recording
        ? Promise.resolve(recording)
        : video
          ? recordingDetails(video, artistName)
          : Promise.resolve(null),
      identity
        ? fetchDiscogsProfile(identity)
        : Promise.resolve(null)
    ]);

  if (
    generation !== compositionGeneration ||
    activeDig.seed?.id !== seed.id
  ) return sourceCoverage({}, false);

  const music =
    musicResult.status === "fulfilled"
      ? musicResult.value
      : null;

  if (music?.releases?.length) {
    const labels = await Promise.all(
      music.releases
        .slice(0, 12)
        .map((release) => releaseLabels(release.id).catch(() => []))
    );

    music.releases.forEach((release, index) => {
      if (labels[index]) release.labels = labels[index];
    });
  }

  if (
    generation !== compositionGeneration ||
    activeDig.seed?.id !== seed.id
  ) return sourceCoverage({}, false);

  const wikidata =
    wikidataResult.status === "fulfilled"
      ? wikidataResult.value
      : null;

  recording =
    recordingResult.status === "fulfilled"
      ? recordingResult.value
      : recording;

  const discogs =
    discogsResult.status === "fulfilled"
      ? discogsResult.value
      : null;

  const sourceStates = {
    ...(identity?.sourceStates || {}),
    musicbrainz:
      musicResult.status === "rejected"
        ? "unavailable"
        : identity?.sourceStates?.musicbrainz ||
          (music ? "matched" : "not_found"),
    wikidata:
      wikidataResult.status === "rejected"
        ? "unavailable"
        : identity?.sourceStates?.wikidata ||
          (wikidata ? "matched" : "not_found"),
    discogs:
      discogsResult.status === "rejected"
        ? "unavailable"
        : identity?.sourceStates?.discogs ||
          (discogs ? "matched" : "not_found"),
    ...(video
      ? {
          recording: recordingConflict
            ? "candidate"
            : (recording?.resolved?.id || recording?.resolvedDiscogsTrack?.id)
              ? "matched"
              : "not_found"
        }
      : {})
  };

  let graphPersisted = !video;

  if (video && (identity || recording)) {
    const persisted = await fetch("/api/resolution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        video,
        identity,
        recording,
        context: {
          music,
          wikidata,
          discogs,
          bandcamp:
            bandcampProfiles[artistMemoryKey(artistName)]
              ? {
                  url: bandcampProfiles[artistMemoryKey(artistName)],
                  source: "user_confirmed",
                  status: "confirmed"
                }
              : null,
          collaborations: extractCreditRelations(video)
        }
      })
    });

    graphPersisted = persisted.ok;
  }

  if (
    generation !== compositionGeneration ||
    activeDig.seed?.id !== seed.id
  ) return sourceCoverage({}, false);

  const identified = Boolean(
    (seed.type === "artist" && (identity?.externalIds?.musicbrainz || identity?.externalIds?.discogs)) ||
    hasExplicitDepartureArtist(explorationGraph, seed.id) ||
    recording?.resolved?.id || recording?.resolvedDiscogsTrack?.id
  );

  const partial =
    !identified ||
    !graphPersisted ||
    recordingConflict ||
    Object.values(sourceStates)
      .some((state) =>
        ["unavailable", "not_configured", "candidate"].includes(state)
      );

  setActiveDig({
    seed,
    collaborationArtist: artistName,
    dossier: {
      state: partial ? "partial" : "ready",
      artistName,
      videoId: video?.id || "",
      sourceStates,
      suppressWeakIdentityCandidates: recordingConflict,
      message:
        !graphPersisted
          ? "Les sources ont répondu, mais leurs relations n’ont pas pu être enregistrées dans le graphe."
          : recordingConflict
            ? "Plusieurs recordings restent incompatibles ; aucune identité supplémentaire n’a été déduite de leur conflit."
            : !identified
              ? "L’identité de ce départ reste à confirmer. Une réponse de catalogue n’est pas une identification."
              : "Les sources disponibles ont été conservées ; les directions indiquent ce qui reste à explorer."
    }
  });

  renderActiveSeed();
  renderCollaborationAtlas();

  const coverage = sourceCoverage(sourceStates, true);

  if (!video) {
    for (const direction of Object.keys(coverage)) {
      if (direction === "curator") continue;
      coverage[direction] = {
        ...coverage[direction],
        state: "partial",
        pending: ["seed_video_anchor"]
      };
    }
  }

  if (!graphPersisted) {
    for (const direction of Object.keys(coverage)) {
      if (direction === "curator") continue;
      coverage[direction] = {
        ...coverage[direction],
        state: "partial",
        pending: ["graph_persistence"]
      };
    }
  }

  return coverage;
}


async function populateDerivedFromFront(session) {
  const generation = compositionGeneration;
  const operation = { seedId: activeDig.seed?.id, generation };
  scoutMixOperation = operation;
  activeDig.catalogueGroups ||= {};
  for (const direction of session.directions) {
    activeDig.catalogueGroups[direction] ||= { items: [], selectedIds: [], seenIds: [], turn: 0, coverage: { state: "not_checked" } };
  }
  renderCatalogueGroups();
  // Fair, bounded pagination: every direction gets a turn before the next pass.
  const blocked = new Set();
  const maxCalls = 24;
  let completed = 0;
  activeDig.searchProgress = 'Recherche automatique · premier passage…';
  const isCurrent = () => generation === compositionGeneration && scoutMixOperation === operation
    && activeDig.seed?.id === operation.seedId;
  try {
    for (let pass = 0; pass < 3 && isCurrent() && completed < maxCalls; pass++) {
      const queue = session.directions.filter(direction => {
        const group = activeDig.catalogueGroups[direction];
        return !blocked.has(direction) && createScoutPatch(activeDig.synthPatch).directionWeights[direction] > 0
          && (pass === 0 || (!group?.error && group?.coverage?.hasMore && group.coverage.nextCursor
            && !group.confirmationCandidates?.length));
      });
      if (!queue.length) break;
      await Promise.all([0, 1].map(async () => {
        while (queue.length && isCurrent() && completed < maxCalls) {
          const direction = queue.shift();
          if (createScoutPatch(activeDig.synthPatch).directionWeights[direction] <= 0) continue;
          const group = activeDig.catalogueGroups[direction];
          const previousCursor = JSON.stringify(group?.coverage?.nextCursor ?? null);
          const more = Boolean(group?.coverage?.hasMore && group.coverage.nextCursor);
          completed++;
          activeDig.searchProgress = `Recherche automatique · passage ${pass + 1}/3 · ${completed}/${maxCalls} chargements lancés. Les pistes reçues restent disponibles.`;
          await loadCatalogueDirection(direction, { generation, more });
          if (!isCurrent()) return;
          const updated = activeDig.catalogueGroups[direction];
          if (updated?.error || updated?.confirmationCandidates?.length
              || (more && JSON.stringify(updated?.coverage?.nextCursor ?? null) === previousCursor)) blocked.add(direction);
        }
      }));
    }
  } finally {
    if (isCurrent()) {
      const pending = session.directions.filter(direction => createScoutPatch(activeDig.synthPatch).directionWeights[direction] > 0
        && (activeDig.catalogueGroups[direction]?.coverage?.hasMore || activeDig.catalogueGroups[direction]?.error
          || activeDig.catalogueGroups[direction]?.confirmationCandidates?.length));
      const unopened = (explorationSession?.directions || []).filter(direction =>
        createScoutPatch(activeDig.synthPatch).directionWeights[direction] > 0 && !session.directions.includes(direction));
      activeDig.searchProgress = unopened.length
        ? `Recherche partielle · ${completed} chargements. ${unopened.length} direction(s) non explorées : choisissez une fiche artiste parmi les propositions pour accéder aux liens catalogue.${pending.length ? ` ${pending.length} autre(s) direction(s) restent à poursuivre ou à vérifier.` : ''}`
        : pending.length
        ? `Recherche partielle · ${pending.length} direction(s) restent à poursuivre ou à vérifier après ${completed} chargements. Limite : 3 passages par direction, 24 appels au total. Vous pouvez reprendre la recherche.`
        : `Passage automatique terminé · ${completed} chargements. Aucun prolongement annoncé par les sources consultées ; ce n’est pas une garantie d’exhaustivité.`;
    }
    if (scoutMixOperation === operation) scoutMixOperation = null;
    if (generation === compositionGeneration) renderCatalogueGroups();
  }
}

async function loadCatalogueDirection(direction, { more = false, generation = compositionGeneration } = {}) {
  const seed = activeDig.seed;
  if (!seed) return;
  const groups = activeDig.catalogueGroups ||= {};
  const group = groups[direction] ||= { items: [], selectedIds: [], seenIds: [], turn: 0, coverage: {} };
  if (group.loading) return;
  group.loading = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("La source met trop de temps.", "TimeoutError")), 90_000);
  catalogueRequests.set(direction, controller);
  renderCatalogueGroups();
  try {
    let data;
    const sourceVideo = seedVideo(seed) || (seed.id.startsWith("video:youtube:") ? { id: seed.id.slice(14), title: seed.label } : null);
    if (direction === "curator") await connectionPanel?.ensureAccessToken();
    if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
    const youtubeReady = (accessToken && Date.now() < tokenExpiresAt - 15_000) || nodes.apiKey.value.trim();
    if (direction === "curator" && sourceVideo && youtubeReady) {
      data = await exploreCurator({ youtube, seedVideo: sourceVideo, cursor: more && group.backend === "youtube_channel" ? group.coverage?.nextCursor || "" : "" });
      if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
      group.backend = "youtube_channel";
      if (data.graphDelta?.entities?.length) {
        const stored = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data.graphDelta) });
        if (!stored.ok) throw new Error("Les publications de la chaîne ont été lues mais leurs relations n’ont pas pu être conservées.");
      }
    } else {
      const parameters = new URLSearchParams({ seedId: seed.id, direction, limit: "24" });
      const controls = createScoutPatch(activeDig.synthPatch);
      const sourceArtist = declaredDepartureArtist(explorationGraph, seed.id) || activeDig.dossier?.artistName || (sourceVideo ? resolvedArtist(sourceVideo)?.name : "") || (seed.type === "artist" ? seed.label : "") || "";
      const scope = { otherArtistsOnly: controls.otherArtistsOnly, includeDistant: controls.includeDistant, excludeLibraryVideos: true,
        includeUnknownArtists: controls.includeUnknownArtists, includeCollaborations: controls.includeCollaborations,
        seedArtist: sourceArtist.slice(0, 500), seedArtistIds: departureArtistIds(explorationGraph, seed.id).slice(0, 20),
        excludeIds: [seed.id, ...[...new Set([...(activeDig.synthMix?.seenIds || []), ...(group.seenIds || [])])].filter(id => id !== seed.id).slice(-59)],
        directLinkedIds: Object.entries(groups).filter(([id]) => ["remix", "featuring", "alias", "compilation"].includes(id) && controls.directionWeights[id] > 0).flatMap(([, row]) => (row.items || []).filter(item => !item.relationship?.distant).map(item => item.id)).slice(0, 20) };
      // Preserve the requested filter even with a long browsing history.
      while (JSON.stringify(scope).length > 8000 && (scope.excludeIds.length > 1 || scope.directLinkedIds.length)) {
        if (scope.excludeIds.length > 1) scope.excludeIds.splice(1, 1); else scope.directLinkedIds.pop();
      }
      parameters.set("viewScope", JSON.stringify(scope));
      if (more && group.backend !== "youtube_channel" && group.coverage?.nextCursor) parameters.set("cursor", group.coverage.nextCursor);
      const response = await fetch(`/api/music/branch?${parameters}`, { signal: controller.signal });
      data = await response.json();
      if (!response.ok) throw new Error(data.message || "Le catalogue ne répond pas.");
      group.backend = "catalogue";
      if (direction === "curator" && !youtubeReady) data.coverage = { ...data.coverage, complete: false, message: "Relations locales affichées. Connectez YouTube pour parcourir les autres publications de cette chaîne." };
    }
    if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
    const importedIds = new Set(library.map(video => `video:youtube:${video.id}`));
    group.items = [...new Map([...group.items, ...(data.candidates || []).filter(item => !importedIds.has(item.id))].map(item => [item.id, item])).values()];
    group.coverage = data.coverage || { state: data.status };
    group.confirmationCandidates = data.confirmationCandidates || data.coverage?.confirmationCandidates || [];
    group.error = "";
    if (!group.selectedIds.length) chooseCataloguePage(group);
    await refreshExplorationGraph(seed.id);
  } catch (error) {
    if (generation !== compositionGeneration) return;
    group.error = error.name === "TimeoutError" ? "La source met trop de temps. Vos pistes déjà chargées restent disponibles." : error.message;
  } finally {
    clearTimeout(timer);
    if (catalogueRequests.get(direction) === controller) catalogueRequests.delete(direction);
    group.loading = false;
    if (generation === compositionGeneration) {
      renderCatalogueGroups();
      await persistExplorationSession().catch(error => { nodes.explorationState.textContent = error.message; });
    }
  }
}

// SCOUT_MIX_RACK_V1: current-departure view, never a second graph or library.
function getScoutMixerView({ directionFilter = "" } = {}) {
  const seedId = activeDig.seed?.id || "";
  const guidance = currentJourneyGuidance();
  const departureProfile = createDepartureProfile(activeDig.seed || {}, { graph: explorationGraph });
  const participantItems = participantSearchPool();
  const hasParticipantSearch = activeDig.participantDraft?.seedId === seedId && Boolean(activeDig.participantDraft?.launched);
  const groups = { ...(activeDig.catalogueGroups || {}), ...(hasParticipantSearch ? {
    participants: { items: participantItems, coverage: { complete: true, hasMore: false } }
  } : {}) };
  const view = buildScoutMixView({
    seedId,
    groups,
    front: explorationSession,
    guidance: { ...guidance, catalogueIdentityRequired: Boolean(hasParticipantSearch &&
      activeDig.participantDraft?.automatic && !guidance.identityConfirmed && guidance.state !== 'loading') },
    patch: activeDig.synthPatch,
    history: activeDig.synthMix,
    routePlans: departureProfile.routes,
    focus: document.querySelector("#discovery-focus")?.value || "breadth",
    seedArtist: declaredDepartureArtist(explorationGraph, seedId) || activeDig.dossier?.artistName || (seedVideo(activeDig.seed) ? resolvedArtist(seedVideo(activeDig.seed))?.name : "") || (activeDig.seed?.type === "artist" ? activeDig.seed.label : ""),
    seedArtistIds: departureArtistIds(explorationGraph, seedId),
    limit: DERIVED_SIZE,
    directionFilter,
    select: selectDiscoveries
  });
  const previous = activeDig.navigationStack?.at(-1)?.seed
    || explorationSession?.lineage?.at(-1)?.fromSeed
    || null;
  const stackSeeds = (activeDig.navigationStack || []).map(entry => entry?.seed).filter(seed => seed?.id);
  const lineageSeeds = !stackSeeds.length
    ? (explorationSession?.lineage || []).map(entry => entry?.fromSeed).filter(seed => seed?.id)
    : [];
  const journeySeeds = [...(stackSeeds.length ? stackSeeds : lineageSeeds), activeDig.seed].filter(seed => seed?.id);
  return {
    ...view,
    workflow: hasParticipantSearch && !activeDig.reviewRequired ? (view.items.length ? 'results' : 'search')
      : departureWorkflow({ seed: activeDig.seed, dossier: activeDig.dossier, guidance, busy: Boolean(scoutMixOperation), items: view.items }),
    guidance,
    departureProfile,
    seedType: departureProfile.kind,
    canFilterArtists: Boolean(departureArtistIds(explorationGraph, seedId).length || declaredDepartureArtist(explorationGraph, seedId) || activeDig.dossier?.artistName || activeDig.seed?.type === "artist" || (seedVideo(activeDig.seed) && resolvedArtist(seedVideo(activeDig.seed))?.name)),
    seedLabel: activeDig.seed?.label || "",
    seedContext: (() => {
      const video = seedVideo(activeDig.seed), artist = video ? resolvedArtist(video) : null;
      const name = declaredDepartureArtist(explorationGraph, seedId) || activeDig.dossier?.artistName || artist?.name;
      const chosenNames = activeDig.participantDraft?.seedId === seedId && activeDig.participantDraft.launched
        ? activeDig.participantDraft.launched.map(row => `${row.name}${row.candidate ? '' : ' (sans fiche)'}`)
        : [...new Set(confirmedSeedArtistEdges(seedId).map(({artist}) => artist.name || artist.label).filter(Boolean))];
      const label = declaredDepartureArtist(explorationGraph, seedId) || artist?.basis === "correction personnelle" ? "Crédits renseignés" : guidance.identityConfirmed ? "Artiste relié au morceau" : "Artiste à vérifier";
      return [name ? `${label} : ${name}` : ["track", "video"].includes(activeDig.seed?.type) ? "Artiste à identifier" : "", chosenNames.length ? `Participants explorés : ${chosenNames.join(", ")}` : "", video?.channelTitle ? `Chaîne : ${video.channelTitle}` : ""].filter(Boolean).join(" · ");
    })(),
    previousDeparture: previous ? { id: previous.id, label: previous.label || previous.title || previous.id } : null,
    journeyTrail: journeySeeds.slice(-4).map(seed => ({ id: seed.id, label: seed.label || seed.title || seed.id })),
    sessionDepth: Number(explorationSession?.depth || currentExplorationDepth()),
    searchProgress: activeDig.searchProgress || '',
    busy: Boolean((scoutMixOperation && scoutMixOperation.seedId === seedId &&
      scoutMixOperation.generation === compositionGeneration) || Object.values(activeDig.catalogueGroups || {}).some(group => group.loading))
  };
}

function initialScoutPatch() {
  const selected = selectedExplorationDirections();
  const directions = selected.length ? selected : ["label"];
  let patch = createScoutPatch({ directionWeights: Object.fromEntries(EXPLORATION_DIRECTIONS.map(({ id }) => [id, directions.includes(id) ? 1 : 0])) });
  patch = setScoutParameter(patch, "shape.depth", Number(nodes.explorationDepth?.value || 6));
  patch = setScoutParameter(patch, "shape.spread", (document.querySelector("#discovery-focus")?.value || "breadth") === "depth" ? 0 : 1);
  return patch;
}

function setScoutMixerParameter(id, value) {
  if (!activeDig.seed) return;
  if (id === "view.shuffle") {
    activeDig.synthPatch = createScoutPatch({ ...activeDig.synthPatch, shuffleKey: value, sort: "random" });
    return;
  }
  activeDig.synthPatch = setScoutParameter(activeDig.synthPatch || initialScoutPatch(), id, value);
  if (id === "shape.depth") nodes.explorationDepth.value = String(activeDig.synthPatch.shape.depth);
  const direction = /^direction\.(\w+)\.weight$/.exec(id)?.[1];
  if (direction && Number(value) > 0) {
    const branch = explorationSession?.branches?.find(row => row.direction === direction);
    if (branch && ["paused", "explored", "dismissed"].includes(branch.status)) {
      explorationSession = setExplorationBranchStatus(explorationSession, branch.id, "active");
    }
  }
  // No fetch, persistence, reroll, seen history or identity change on a knob gesture.
}

function currentExplorationDepth() {
  if (!activeDig.seed || !activeDig.synthPatch) { const value=Number(nodes.explorationDepth?.value || 6); return [3,6,9].includes(value) ? value : 6; }
  return createScoutPatch(activeDig.synthPatch).shape.depth;
}

function resetScoutMixerParameters() {
  if (!activeDig.seed) return;
  for (const { id } of EXPLORATION_DIRECTIONS) setScoutMixerParameter(`direction.${id}.weight`, 1);
}

function renderScoutMixerPanel() {
  const parent = document.querySelector("#exploration");
  if (!parent) return;
  if (!scoutMixerRack) {
    scoutMixerRack = mountScoutMixerPanel({
      parent,
      read: getScoutMixerView,
      onParameter: setScoutMixerParameter,
      onNext: async directionFilter => {
        const view = getScoutMixerView({ directionFilter });
        if (!view.seedId || !view.items.length) return;
        activeDig.synthMix = consumeMixPage(activeDig.synthMix, view);
        renderScoutMixerPanel();
        await persistExplorationSession();
      },
      onDig: loadScoutMixerDirections,
      onBack: returnToPreviousDeparture,
      onStop: () => { cancelWorkspaceSearch(); },
      onReset: resetScoutMixerParameters,
      onRewind: async () => {
        activeDig.synthMix = null;
        for (const group of Object.values(activeDig.catalogueGroups || {})) {
          group.seenIds = []; group.turn = 0;
        }
        renderScoutMixerPanel();
        await persistExplorationSession();
      },
      renderCard: createScoutCatalogueCard
    });
  } else {
    scoutMixerRack.update();
  }
}

async function loadScoutMixerDirections() {
  const initial = getScoutMixerView();
  if (!initial.seedId || initial.busy || ["identify", "loading"].includes(initial.workflow)) return;
  activeDig.searchProgress = '';
  const operation = { seedId: initial.seedId, generation: compositionGeneration };
  scoutMixOperation = operation;
  const isCurrent = () => scoutMixOperation === operation &&
    activeDig.seed?.id === operation.seedId && compositionGeneration === operation.generation;
  renderScoutMixerPanel();

  // R11.1: execute the frontier as a feedback loop. A load mutates the graph,
  // therefore the next decision must be made from the NEW frontier, not from a
  // plan frozen before the first request.
  const used = new Map();
  const maxOperations = 8;
  const maxPerDirection = 3;
  let completed = 0;

  try {
    while (completed < maxOperations && isCurrent()) {
      const view = getScoutMixerView();
      const loadable = new Set(
        view.routes
          .filter(route => route.canLoad && (used.get(route.id) || 0) < maxPerDirection)
          .map(route => route.id)
      );
      if (!loadable.size) break;

      const frontier = explorationSession?.frontier
        ? {
            ...explorationSession.frontier,
            byDirection: Object.fromEntries(
              Object.entries(explorationSession.frontier.byDirection || {}).map(([id, value]) => [
                id,
                { ...value, canExpand: Boolean(value?.canExpand && loadable.has(id)) }
              ])
            )
          }
        : null;
      const weights = Object.fromEntries(view.routes.map(route => [route.id, route.weight]));
      const scheduled = frontier
        ? scheduleDiscoveryFrontiers(frontier, {
            weights,
            spread: Number(view.patch?.shape?.spread ?? 1),
            budget: 1,
            maxPerDirection,
            previousAllocations: Object.fromEntries(used)
          })
        : [];

      // If the graph has no frontier entry yet, open a never-tried route before
      // paginating an existing one. This is what the browser observation was
      // missing: LABEL must not starve CURATOR/REMIX/FEAT/COMP/etc.
      // Give every enabled route a turn before paginating a rich catalogue.
      // A frontier containing only LABEL must not starve unknown routes.
      const untried = [...loadable].filter(id => !used.has(id));
      let direction = untried.includes(scheduled[0]?.direction)
        ? scheduled[0].direction : untried[0] || scheduled[0]?.direction || "";
      if (!direction) {
        direction = [...loadable].sort((a, b) => {
          const au = used.get(a) || 0, bu = used.get(b) || 0;
          return au - bu || a.localeCompare(b);
        })[0] || "";
      }
      if (!direction) break;

      await runScoutMixLoad({
        directions: [direction],
        isCurrent,
        isEnabled: id => loadable.has(id),
        load: direction => exploreWorkspaceDirection(direction, { explore: true }),
        onProgress: () => renderScoutMixerPanel()
      });
      if (!isCurrent()) break;
      used.set(direction, (used.get(direction) || 0) + 1);
      completed++;
      // exploreWorkspaceDirection rebuilds explorationSession from the updated
      // graph. The while-loop deliberately reads that new session next.
    }
  } finally {
    if (scoutMixOperation === operation) scoutMixOperation = null;
    renderScoutMixerPanel();
  }
}
// END_SCOUT_MIX_RACK_V1

function createScoutCatalogueCard(item, direction) {
  if (item.source === 'youtube' || item.listen?.kind === 'video') item = { ...item, title: decodeYoutubeTitle(item.title || item.label || '') };
  item.sourceUrl = safeExternalUrl(item.sourceUrl);
  const card = document.createElement("article");
  card.className = "derived-card";
  const url = safeExternalUrl(item.listen?.url) || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.listen?.query || `${item.artist || ""} ${item.title}`)}`;
  const imageId = item.listen?.videoId || (item.id.startsWith("video:youtube:") ? item.id.slice(14) : "");
  const evidence = [...new Set((item.evidence || []).map(value => evidenceLabel(typeof value === "string" ? value : value.label || value.source || "")))].filter(Boolean).join(" · ");
  const contextProof = [
    [item.periodContext, "Période commune", "Vérifier les dates des deux côtés"],
    [item.territoryContext, "Territoire commun", "Vérifier les territoires des deux côtés"]
  ].filter(([context]) => context).map(([context, title, action]) => `<p>${title} : ${escapeHtml(context.label)}. Ce contexte s’ajoute au lien ci-dessus ; il ne le remplace pas.</p><details><summary>${action}</summary>${renderPath({ steps: context.sourcePath })}${renderPath({ steps: context.targetPath })}</details>`).join("");
  card.innerHTML = `${imageId ? `<a class="derived-thumb" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><img src="${safeThumbnail("", imageId)}" alt="${escapeHtml(item.title)}" loading="lazy"></a>` : ""}<div class="derived-copy"><p class="video-meta">${escapeHtml(dateDescription(item))}</p><h3>${escapeHtml(item.title || item.label)}</h3><p class="channel">${escapeHtml(item.artist || "Artiste non renseigné")}</p><p class="catalogue-reason">${escapeHtml(item.explanation || "Lien documenté dans le catalogue")}</p><details class="catalogue-proof"><summary>Pourquoi cette piste ?</summary><p>${escapeHtml(evidence || "Relations du catalogue documentées")}</p>${renderPath({ steps: (item.path || []).filter(step => step.from && step.to) })}${contextProof}${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Voir la source ↗</a>` : ""}</details><div class="card-actions"><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${item.listen?.kind === "video" ? "Écouter" : "Chercher l’écoute"} ↗</a><button type="button" data-keep>${notebookHas(item.id) ? "Gardée ✓" : "Garder"}</button><button type="button" data-continue>Continuer →</button></div>${item.listen?.kind !== "video" && item.artist ? `<details class="catalogue-listening"><summary>Vérifier une vidéo YouTube</summary><button type="button" data-listen>${item.listen?.status === "unconfirmed" ? "Vidéo non confirmée — réessayer" : "Trouver la vidéo exacte"}</button></details>` : ""}</div>`;
  card.querySelector("[data-keep]").onclick = event => toggleNotebook(item, "catalogue", event.currentTarget);
  const content = videoContent(item), suggestion = !item.artist && titleCreditSuggestion(item);
  if (content.kind !== "music") {
    card.querySelector(".video-meta").append(Object.assign(document.createElement("small"), { textContent: ` · ${content.label}` }));
    const listen = card.querySelector(".card-actions a");
    if (item.listen?.kind === "video") listen.textContent = "Voir / écouter la vidéo ↗";
  }
  if (suggestion) card.querySelector(".channel").textContent = `Nom suggéré par le titre : ${suggestion.name} · à vérifier en continuant`;
  const fullReason = item.participantNameSearch ? item.explanation : routeExplanation(item, direction, activeDig.seed?.label || "");
  const viaParticipant = (item.path || []).some(step => step.relation === 'probable_artist');
  card.querySelector(".catalogue-reason").textContent = item.participantNameSearch ? item.explanation
    : `${item.anchor?.label ? `Via ${item.anchor.label}` : 'Lien catalogue'}${viaParticipant ? ' · fiche d’un participant, crédit du départ non confirmé.' : '.'}`;
  const proof = card.querySelector('.catalogue-proof');
  if (!item.participantNameSearch) proof.insertBefore(Object.assign(document.createElement('p'), { textContent: fullReason }), proof.querySelector('summary').nextSibling);
  if (item.relationship?.message) proof.append(Object.assign(document.createElement("p"), { className: "relationship-note", textContent: item.relationship.message }));
  const listeningTools = card.querySelector(".catalogue-listening");
  if (listeningTools) card.querySelector(".catalogue-proof").append(listeningTools);
  card.querySelector("[data-listen]")?.addEventListener("click", event => resolveCatalogueListening(item, event.currentTarget));
  card.querySelector("[data-continue]").onclick = async () => {
    const fromSeed = activeDig.seed;
    // Name-search videos have not been ingested as catalogue identities.
    // Carry only their observed YouTube metadata into the normal review flow.
    if (item.participantNameSearch && item.id.startsWith('video:youtube:')) {
      const id = item.id.slice(14);
      externalSeeds.set(id, { ...(externalSeeds.get(id) || {}), id, title: item.title,
        channelId: item.channelId || '', channelTitle: item.channelTitle || '', publishedAt: item.publishedAt || '' });
    }
    const seed = { id: item.id, type: item.type, label: item.title || item.label, url: item.sourceUrl || "" };
    try { await openExploration({ seed, lineage: [...(explorationSession?.lineage || []), { fromSeed, chosen: seed, direction, path: item.path || [] }] }); }
    catch (error) { workspace?.notify(error.message); }
  };
  return card;
}

function chooseCataloguePage(group, reroll = false) {
  if (reroll) {
    group.seenIds = [...new Set([...(group.seenIds || []), ...(group.selectedIds || [])])];
    group.turn = Number(group.turn || 0) + 1;
  }
  const items = selectDiscoveries(group.items, { exclude: group.seenIds || [], limit: 6, focus: document.querySelector("#discovery-focus")?.value || "breadth", turn: group.turn, seedArtist: activeDig.dossier?.artistName || "" });
  group.selectedIds = items.map(item => item.id);
}

async function resolveCatalogueListening(item, button) {
  await connectionPanel?.ensureAccessToken();
  if ((!accessToken || Date.now() >= tokenExpiresAt - 15_000) && !nodes.apiKey.value.trim()) {
    button.textContent = "Connectez YouTube pour vérifier la vidéo";
    return;
  }
  button.disabled = true;
  button.textContent = "Vérification de l’écoute…";
  const generation = compositionGeneration;
  try {
    const data = await youtube("search", { part: "snippet", type: "video", q: item.listen?.query || `${item.artist || ""} ${item.title}`, maxResults: 8 });
    const videos = (data.items || []).map(entry => ({ id: entry.id.videoId, title: entry.snippet.title, channelTitle: entry.snippet.channelTitle }));
    const match = videos.find(video => matchesRecording(video, item));
    item.listen = match ? { kind: "video", url: `https://www.youtube.com/watch?v=${match.id}`, videoId: match.id, basis: "Titre, artiste et version concordants dans les métadonnées YouTube" } : { ...item.listen, status: "unconfirmed" };
    if (generation === compositionGeneration) {
      renderCatalogueGroups();
      await persistExplorationSession();
    }
  } catch (error) { button.disabled = false; button.textContent = `Réessayer : ${error.message}`; }
}

function renderCatalogueGroups() {
  nodes.discoveries.hidden = true;
  nodes.derivedVideos.replaceChildren();
  renderExplorationSession();
  renderScoutMixerPanel();
  renderCommonParticipantResults();
  workspace?.update();
  return Boolean(Object.keys(activeDig.catalogueGroups || {}).length);
}

async function openExploration({ seed = currentSeed(), preserveLineage = false, lineage = null, configure = false, reviewed = false } = {}) {
  if (!seed) return;
  // The picker chooses an object, not a hidden label-only search. Directions
  // are configured on the next screen before any catalogue branch is loaded.
  const carriedPatch = createScoutPatch(activeDig.synthPatch || {});
  const directions = EXPLORATION_DIRECTIONS.filter(({ id }) => carriedPatch.directionWeights[id] > 0).map(({ id }) => id);
  for (const input of nodes.explorationDirections.querySelectorAll("input")) input.checked = directions.includes(input.value);
  nodes.explorationDepth.value = String(carriedPatch.shape.depth);
  const changedDeparture = seed.id !== activeDig.seed?.id;
  const freshDeparture = changedDeparture || configure && !reviewed;
  const selectedVideo = seedVideo(seed);
  const chosenEntity = selectedCatalogueEntity(seed, explorationGraph.entities?.[seed.id]);
  if (changedDeparture) {
    const video = seedVideo(seed);
    if (video) {
      presented = rememberExplored(presented, video, { artist: resolvedArtist(video)?.name || "" });
      saveLocalObject(PRESENTED_KEY, presented);
    }
  }
  setActiveDig({ seed, resetContext: changedDeparture });
  activeDig.searchProgress = '';
  activeDig.synthPatch = carriedPatch;
  if (changedDeparture) activeDig.synthMix = null;
  workspace?.closePicker();
  workspace?.navigate("explore");
  document.querySelector("#departure-picker").open = false;
  resetDiscoveries();
  const generation = compositionGeneration;
  try {
  if (freshDeparture) {
    for (const cache of [artistCache, labelCache, contextCache, identityCache, recordingCache, videoSearchCache, derivedPool, externalSeeds]) cache.clear();
    if (selectedVideo) externalSeeds.set(selectedVideo.id, selectedVideo);
    searchedLabels.clear(); searchedCollaborators.clear();
    currentDerivedIds = [];
    activeDig.front = null; explorationSession = null;
    activeDig.dossier = null; activeDig.catalogueGroups = {}; activeDig.derived = [];
    serverGraph = { entities: {}, edges: {} };
    explorationGraph = departureRoutingSnapshot(serverGraph);
    await explorationTransport.start(seed.id);
    if (generation !== compositionGeneration) return;
    if (chosenEntity) {
      const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entities: [chosenEntity], edges: [] }) });
      if (!response.ok) throw new Error("Impossible de préparer le départ choisi.");
    }
    await refreshExplorationGraph(seed.id);
    if (generation !== compositionGeneration) return;
    const base = explorationGraph;
    const seeded = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entities: Object.values(base.entities || {}), edges: Object.values(base.edges || {}) }) });
    if (!seeded.ok) throw new Error("Impossible de préparer les données de ce départ.");
    if (generation !== compositionGeneration) return;
    const correctedTitle = explorationGraph.entities?.[seed.id]?.departureCorrection?.title;
    if (correctedTitle) { seed = { ...seed, label: correctedTitle }; activeDig.seed = seed; }
  }
  renderActiveSeed();
  nodes.explorationState.textContent = "Préparation des directions…";
  activeDig.catalogueGroups = { ...activeDig.catalogueGroups, ...Object.fromEntries(directions.map(direction => [direction, activeDig.catalogueGroups?.[direction] || { items: [], selectedIds: [], seenIds: [], turn: 0, coverage: { state: "not_checked", message: "Prête à être consultée au prochain clic sur Rechercher." } }])) };
  renderCatalogueGroups();
  const departureVideo = seedVideo(seed);
  const suggestedArtist = departureVideo ? resolvedArtist(departureVideo) : null;
  const searchCredit = declaredDepartureArtist(explorationGraph, seed.id)
    || (suggestedArtist?.confidence >= .95 ? suggestedArtist.name : '')
    || (departureVideo ? titleCreditSuggestion(departureVideo)?.name : '') || '';
  if (seed.id.startsWith("video:youtube:") && !reviewed && (activeDig.reviewRequired || !splitArtistNames(searchCredit).length)) {
    beginDepartureReview();
    await persistExplorationSession();
    return;
  }
  let automaticDraft = null;
  if (seed.id.startsWith('video:youtube:') && searchCredit && (changedDeparture || freshDeparture || reviewed)
      && !(activeDig.participantDraft?.seedId === seed.id && activeDig.participantDraft?.launched && !reviewed)) {
    automaticDraft = participantDraft(seed.id, splitArtistNames(searchCredit));
    automaticDraft.automatic = true;
    for (const row of automaticDraft.rows) row.selected = true;
    automaticDraft.launched = automaticDraft.rows.map(row => ({ name: row.name, query: row.query, candidate: null, videos: [], videoStatus: 'en attente' }));
    activeDig.participantDraft = automaticDraft;
  }
  await refreshExplorationGraph(seed.id);
  if (generation !== compositionGeneration) return;
  const selectedEntity = selectedCatalogueEntity(seed, explorationGraph.entities?.[seed.id]);
  if (selectedEntity && JSON.stringify(selectedEntity) !== JSON.stringify(explorationGraph.entities?.[seed.id])) {
    const stored = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entities: [selectedEntity], edges: [] }) });
    if (!stored.ok) throw new Error("La fiche choisie n’a pas pu être conservée. Réessayez ce départ.");
    await refreshExplorationGraph(seed.id);
    if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
  }
  const personalName = artistCorrections[seedVideo(seed)?.id];
  // Replaying an older text annotation is not a new identity decision. In
  // particular, spacing changes in a multi-artist credit must not reject the
  // catalogue cards the user just selected. Explicit corrections still use
  // the review flow and its revision invalidation.
  if (personalName && declaredDepartureArtist(explorationGraph, seed.id) !== personalName
      && !hasExplicitDepartureArtist(explorationGraph, seed.id)) {
    const delta = departureArtistUpdate(explorationGraph, seed, personalName);
    const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) });
    if (!response.ok) throw new Error("La correction d’artiste n’a pas pu être transmise. Elle reste conservée dans votre bibliothèque.");
    await refreshExplorationGraph(seed.id);
    if (generation !== compositionGeneration) return;
  }
  let coverage = activeDig.dossier?.sourceStates ? sourceCoverage(activeDig.dossier.sourceStates, true) : sourceCoverage({}, false);
  let nextSession = createExplorationSession({
    state: explorationGraph,
    seed,
    directions,
    depth: currentExplorationDepth(),
    coverage,
    previous: preserveLineage ? explorationSession : null,
    rerollKey: `${Date.now()}`
  });
  const seedEntity = explorationGraph.entities?.[seed.id];

  // V2.7R4: confirmed_user reste une mémoire, pas un bypass recording-first.
  const isRecordingSeed =
    seed.type === "track" ||
    ["video", "recording", "track"].includes(String(seed.sourceType || ""));

  const hasDirectStructuredIdentity =
    Boolean(seedEntity?.externalIds?.discogs || seedEntity?.externalIds?.musicbrainz) ||
    Object.values(explorationGraph.edges || {}).some(edge =>
      edge.from === seed.id && edge.kind === "embodies" && ["resolved", "confirmed_user"].includes(edge.status)
    );

  const hasTrustedArtistRelation =
    Object.values(explorationGraph.edges || {}).some(edge =>
      edge.from === seed.id &&
      edge.kind === "probable_artist" &&
      ["confirmed_user", "confirmed_cross_id", "corroborated"].includes(edge.status)
    );

  const hasCatalogueIdentity =
    hasDirectStructuredIdentity ||
    hasExplicitDepartureArtist(explorationGraph, seed.id) ||
    (!isRecordingSeed && hasTrustedArtistRelation);

  const declaredArtist = declaredDepartureArtist(explorationGraph, seed.id);
  if (declaredArtist && !hasCatalogueIdentity) setActiveDig({ dossier: { state: "partial", artistName: declaredArtist, suppressWeakIdentityCandidates: true, sourceStates: {}, message: "Nom renseigné par vous. Choisissez une fiche pour explorer ses connexions." } });
  const missingDocumentedPath =
    !hasCatalogueIdentity &&
    (reviewed || nextSession.branches.some(branch => !branch.current));
  if (missingDocumentedPath) {
    coverage = await hydrateExplorationSeed(seed);
    if (generation !== compositionGeneration) return;
    await refreshExplorationGraph(seed.id);
    if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
    nextSession = createExplorationSession({
      state: explorationGraph,
      seed,
      directions,
      depth: currentExplorationDepth(),
      coverage,
      previous: preserveLineage ? explorationSession : null,
      rerollKey: `${Date.now()}:enriched`
    });
  }
  if (!missingDocumentedPath && !activeDig.dossier) {
    setActiveDig({ seed, dossier: { state: "ready", sourceStates: {}, message: "Le front utilise uniquement les relations déjà présentes dans le graphe local ; aucune recherche externe n’a été nécessaire." } });
    renderActiveSeed();
  }
  explorationSession = nextSession;
  if (lineage) explorationSession.lineage = lineage;
  setActiveDig({ seed, front: explorationSession });
  // One explicit title/credits validation authorizes this bounded lookup.
  // It proposes catalogue choices, never auto-confirms a namesake.
  if (reviewed && declaredArtist && !currentJourneyGuidance().identityConfirmed) {
    const registry = await searchDepartureArtistChoices(declaredArtist);
    if (generation !== compositionGeneration || activeDig.seed?.id !== seed.id) return;
    activeDig.identityChoices = { seedId: seed.id, registry };
  }
  await persistExplorationSession();
  renderExplorationSession();
  if (automaticDraft) {
    await Promise.all([searchSuggestedParticipants(automaticDraft), searchSuggestedParticipantIdentities(automaticDraft)]);
    if (generation !== compositionGeneration) return;
  }
  if ((!configure || automaticDraft) && getScoutMixerView().workflow !== "identify") {
    // A name-only search does not authorize catalogue identity assertions.
    // The source channel remains usable without an identified recording.
    const sessionToLoad = automaticDraft && !currentJourneyGuidance().identityConfirmed
      ? { ...explorationSession, directions: explorationSession.directions.filter(direction => direction === 'curator') }
      : explorationSession;
    await populateDerivedFromFront(sessionToLoad).catch(error => { nodes.explorationState.textContent = error.message; });
  }
  if (generation !== compositionGeneration) return;
  const branchCoverage = { ...coverage };
  for (const [direction, group] of Object.entries(activeDig.catalogueGroups || {})) {
    branchCoverage[direction] = { state: group.error || group.coverage?.state === "source_unavailable" ? "unavailable" : group.coverage?.complete && !group.coverage?.hasMore ? "complete" : "partial", sources: Object.keys(group.coverage?.sourceStates || {}) };
  }
  explorationSession = createExplorationSession({ state: explorationGraph, seed, directions, depth: currentExplorationDepth(), coverage: branchCoverage, previous: explorationSession, rerollKey: `${Date.now()}:catalogue` });
  if (lineage) explorationSession.lineage = lineage;
  renderExplorationSession();
  await persistExplorationSession();
  workspace?.update();
  if (configure && getScoutMixerView().workflow !== "identify") {
    const settings = document.querySelector("#scout-settings");
    if (settings) settings.open = true;
  }
  } catch (error) {
    if (generation === compositionGeneration) {
      resetDiscoveries();
      explorationSession = null;
      activeDig = { schemaVersion: 2, seed: null, front: null, dossier: null, catalogueGroups: {},
        navigationStack: [], derived: [], derivedIds: [], history: [], synthPatch: carriedPatch };
      renderExplorationSession();
      renderActiveSeed();
      workspace?.update();
    }
    throw error;
  }
}

// A direction is an independent action: never restart unrelated catalogues.
async function exploreWorkspaceDirection(direction, { explore = false } = {}) {
  if (!activeDig.seed) return workspace?.openPicker();
  const generation = compositionGeneration;
  const seedId = activeDig.seed.id;
  activeDig.activeDirection = direction;
  const existing = activeDig.catalogueGroups?.[direction];
  if (!explore) { await persistExplorationSession(); return; }
  const directions = [...new Set([...(explorationSession?.directions || []), direction])];
  explorationSession = createExplorationSession({ state: explorationGraph, seed: activeDig.seed, directions, depth: currentExplorationDepth(), previous: explorationSession, coverage: explorationSession?.coverage || {}, rerollKey: `direction:${direction}` });
  for (const input of nodes.explorationDirections.querySelectorAll("input")) input.checked = directions.includes(input.value);
  renderExplorationSession();
  await loadCatalogueDirection(direction, { more: Boolean(existing?.coverage?.hasMore) });
  if (generation !== compositionGeneration || activeDig.seed?.id !== seedId || !explorationSession) return;
  const group = activeDig.catalogueGroups?.[direction];
  const coverage = { ...explorationSession.coverage, [direction]: { state: group?.error ? "unavailable" : group?.coverage?.complete ? "complete" : "partial" } };
  explorationSession = createExplorationSession({ state: explorationGraph, seed: activeDig.seed, directions: explorationSession.directions, depth: explorationSession.depth, previous: explorationSession, coverage, rerollKey: `direction:${direction}:loaded` });
  renderCatalogueGroups();
  await persistExplorationSession();
}

async function pauseWorkspaceDirection(direction) {
  const branch = explorationSession?.branches.find(item => item.direction === direction);
  if (!branch) return;
  const resume = ["paused", "explored", "dismissed"].includes(branch.status);
  explorationSession = setExplorationBranchStatus(explorationSession, branch.id, resume ? "active" : "paused");
  renderCatalogueGroups();
  await persistExplorationSession();
}

function cancelWorkspaceSearch() {
  activeDig.searchProgress = 'Recherche interrompue. Les pistes déjà chargées restent disponibles.';
  compositionGeneration += 1;
  for (const controller of catalogueRequests.values()) controller.abort();
  catalogueRequests.clear();
  for (const group of Object.values(activeDig.catalogueGroups || {})) {
    if (group.loading) { group.loading = false; group.error = "Attente interrompue. Vous pouvez réessayer cette direction."; }
  }
  if (activeDig.dossier?.state === "loading") activeDig.dossier = {
    ...activeDig.dossier, state: "partial",
    suppressWeakIdentityCandidates: ["track", "video"].includes(activeDig.seed?.type) && !currentJourneyGuidance().identityConfirmed,
    sourceStates: { ...activeDig.dossier.sourceStates, recording: "interrupted" },
    message: "Attente interrompue. Les requêtes déjà envoyées peuvent finir côté serveur."
  };
  renderCatalogueGroups();
  persistExplorationSession().catch(error => workspace?.notify(error.message, { error: true }));
}

function revalidateActivePaths() {
  if (!activeDig.front?.seed?.id) return;
  const front = activeDig.front;
  for (const [direction, group] of Object.entries(activeDig.catalogueGroups || {})) {
    const valid = new Map(catalogueCandidates(explorationGraph, front.seed.id, direction).map(item => [item.id, item]));
    // API-sourced curator candidates also carry their observed channel path.
    const previous = group.items || [];
    const rejected = previous.filter(item => !valid.has(item.id));
    if (rejected.length) group.retiredItems = [...(group.retiredItems || []), ...rejected];
    group.items = previous.filter(item => valid.has(item.id)).map(item => ({ ...item, ...valid.get(item.id), listen: item.listen || valid.get(item.id).listen }));
    group.selectedIds = (group.selectedIds || []).filter(id => valid.has(id));
    if (rejected.length || activeDig.engineVersion !== CLIENT_VERSION) group.coverage = { state: "not_checked", complete: false, message: "Parcours recalculé. Les sources de cette direction restent à consulter." };
  }
  activeDig.front = createExplorationSession({ state: explorationGraph, seed: front.seed, directions: front.directions, depth: front.depth, previous: front, coverage: activeDig.engineVersion === CLIENT_VERSION ? front.coverage : sourceCoverage({}, false), rerollKey: "path-validation" });
  explorationSession = activeDig.front;
}

async function restoreExplorationSession() {
  resumableDig = null; explorationSession = null;
  const settings = loadStoredObject(EXPLORATION_SETTINGS_KEY);
  const legacy = settings.synthPatch ? null : loadStoredObject(EXPLORATION_KEY);
  // One-way migration of preferences, never of the previous dig.
  activeDig = { schemaVersion: 2, id: "", seed: null, front: null, dossier: null,
    derived: [], derivedIds: [], catalogueGroups: {}, navigationStack: [], history: [],
    synthPatch: createScoutPatch(settings.synthPatch || legacy?.synthPatch || {}),
    collaborationArtist: "", createdAt: "", updatedAt: new Date().toISOString() };
  try { saveLocalObject(EXPLORATION_SETTINGS_KEY, { synthPatch: activeDig.synthPatch }); } catch {}
  currentDerivedIds = []; derivedPool.clear();
  renderDerived(); renderExplorationSession(); renderActiveSeed();
  return null;
}

async function useVideoAsSeed(video) {
  externalSeeds.set(video.id, video);
  if (document.querySelector("#seed-dialog")?.open) {
    const artist = resolvedArtist(video);
    workspace.selectSeed({ id: `video:youtube:${video.id}`, type: "track", label: video.title, subtitle: [artist ? `Artiste ${artist.basis === "correction personnelle" ? "renseigné" : "à vérifier"} : ${artist.name}` : "Artiste à identifier", `Chaîne : ${video.channelTitle || "non renseignée"}`].join(" · "), typeLabel: "Morceau / vidéo" });
    return;
  }
  externalSeeds.set(video.id, video);
  nodes.seedType.value = "track";
  await refreshExplorationGraph(`video:youtube:${video.id}`);
  nodes.seedSelect.value = `video:youtube:${video.id}`;
  await openExploration({ seed: currentSeed() });
  nodes.exploration.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRecoveryAction() {
  const host = document.querySelector("#workspace-empty");
  if (!host) return;
  host.querySelector("#workspace-resume")?.remove();
  if (!resumableDig?.front?.seed?.id) return;
  const button = document.createElement("button");
  button.id = "workspace-resume";
  button.type = "button";
  button.className = "outline-button";
  button.textContent = `Reprendre : ${resumableDig.seed?.label || resumableDig.front.seed.label || "dernier parcours"}`;
  button.onclick = async () => {
    if (!resumableDig?.front?.seed?.id || activeDig.seed) return;
    button.disabled = true;
    const generation = ++compositionGeneration;
    const saved = structuredClone(resumableDig);
    try {
      await refreshExplorationGraph(saved.front.seed.id);
      if (generation !== compositionGeneration || activeDig.seed) return;
      activeDig = { ...saved, seed: saved.seed || saved.front.seed };
      for (const group of Object.values(activeDig.catalogueGroups || {})) group.loading = false;
      explorationSession = activeDig.front;
      revalidateActivePaths();
      if (saved.engineVersion !== CLIENT_VERSION && activeDig.seed.id.startsWith("video:youtube:")) beginDepartureReview();
      renderActiveSeed();
      renderExplorationSession();
      renderCatalogueGroups();
      renderCollaborationAtlas();
      workspace?.update();
      await persistExplorationSession();
      resumableDig = null;
      button.remove();
    } catch (error) {
      workspace?.notify(error.message, { error: true });
      button.disabled = false;
    }
  };
  host.append(button);
}

function initializeExplorationDirections() {
  nodes.explorationDirections.replaceChildren();
  for (const direction of EXPLORATION_DIRECTIONS) {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${escapeHtml(direction.id)}"${direction.id === "label" ? " checked" : ""}><span><strong>${escapeHtml(direction.label)}</strong><small>${escapeHtml(direction.description)}</small></span>`;
    if (direction.id === "label") {
      label.querySelector("strong").textContent = "Labels reliés";
      label.querySelector("small").textContent = "Suit les labels d’une sortie ou du parcours de l’artiste.";
    }
    nodes.explorationDirections.append(label);
  }
}

function loadSeen() {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveSeen() {
  // Automatic seen history expires with the tab.
}

function loadConfig() {
  try {
    const legacy = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || "{}");
    return { ...legacy, apiKey: localStorage.getItem(API_KEY_STORAGE) ?? legacy.apiKey ?? "" };
  } catch {
    return {};
  }
}

function saveConfig() {
  connectionPanel?.saveKey();
  // Migrate the old tab-only key; never resurrect it after the user clears it.
  try { sessionStorage.removeItem(CONFIG_KEY); } catch {}
}

function validClientId(value = "") {
  return /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(String(value).trim());
}

function persistClientId({ announce = false } = {}) {
  const clientId = nodes.clientId.value.trim();
  if (!validClientId(clientId)) {
    nodes.clientIdState.textContent = "ID incomplet — non enregistré";
    if (announce) {
      nodes.clientId.focus();
      setSourceMessage("L’identifiant doit se terminer par .apps.googleusercontent.com.", "error");
    }
    return false;
  }
  try { localStorage.setItem(CLIENT_ID_KEY, clientId); }
  catch {
    nodes.clientIdState.textContent = "Mémorisation indisponible dans ce navigateur";
    if (announce) setSourceMessage("L’ID reste utilisable dans cet onglet mais ne peut pas être enregistré.", "error");
    return false;
  }
  nodes.clientIdState.textContent = "Enregistré dans ce navigateur ✓";
  if (announce) setSourceMessage("Identifiant OAuth mémorisé dans ce navigateur. L’accès temporaire vérifié sera repris dans cet onglet jusqu’à son expiration.");
  return true;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DB_STORE)) request.result.createObjectStore(DB_STORE);
      if (!request.result.objectStoreNames.contains(ENTITY_STORE)) request.result.createObjectStore(ENTITY_STORE);
      if (!request.result.objectStoreNames.contains(EVENT_STORE)) request.result.createObjectStore(EVENT_STORE, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(SYNC_STORE)) request.result.createObjectStore(SYNC_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedLibrary() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readonly");
    const request = transaction.objectStore(DB_STORE).get("videos");
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function writeCachedLibrary(videos) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(DB_STORE, "readwrite");
    transaction.objectStore(DB_STORE).put(videos, "videos");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function commitLibraryImport(videos, syncState) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([DB_STORE, SYNC_STORE], "readwrite");
      transaction.objectStore(DB_STORE).put(videos, "videos");
      transaction.objectStore(SYNC_STORE).put(syncState, "youtube-library");
      if (!syncState.truncated) transaction.objectStore(SYNC_STORE).delete("youtube-import-progress");
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("Enregistrement de l’import interrompu."));
    });
  } finally { database.close(); }
}

async function clearCachedLibrary() {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction([DB_STORE, ENTITY_STORE, EVENT_STORE, SYNC_STORE], "readwrite");
    transaction.objectStore(DB_STORE).clear();
    transaction.objectStore(ENTITY_STORE).clear();
    transaction.objectStore(EVENT_STORE).clear();
    transaction.objectStore(SYNC_STORE).clear();
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readCachedIdentity() { return null; }
async function writeCachedIdentity() { /* Identity cache belongs to this departure only. */ }

async function writeLocalEvent(event) {
  if (event.kind === "opened") return;
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(EVENT_STORE, "readwrite");
    transaction.objectStore(EVENT_STORE).put(event);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function writeSyncState(scope, state) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SYNC_STORE, "readwrite");
    transaction.objectStore(SYNC_STORE).put(state, scope);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function readSyncState(scope) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SYNC_STORE, "readonly");
    const request = transaction.objectStore(SYNC_STORE).get(scope);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function readBackupStores() {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const output = { entities: [], events: [], sync: [] };
      const transaction = database.transaction([ENTITY_STORE, EVENT_STORE, SYNC_STORE], "readonly");
      for (const [store, name] of [[ENTITY_STORE, "entities"], [EVENT_STORE, "events"], [SYNC_STORE, "sync"]]) {
        const cursor = transaction.objectStore(store).openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          output[name].push(name === "events" ? entry.value : [String(entry.key), entry.value]);
          entry.continue();
        };
      }
      transaction.oncomplete = () => resolve(output);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("Lecture du stockage interrompue."));
    });
  } finally { database.close(); }
}

async function writeBackupStores(videos, indexed) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([DB_STORE, ENTITY_STORE, EVENT_STORE, SYNC_STORE], "readwrite");
      transaction.oncomplete = resolve;
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error("Restauration du stockage interrompue."));
      transaction.objectStore(DB_STORE).put(videos, "videos");
      for (const [store, name] of [[ENTITY_STORE, "entities"], [EVENT_STORE, "events"], [SYNC_STORE, "sync"]]) {
        const target = transaction.objectStore(store);
        if (name === "entities") continue; // Legacy identity archive stays offline, not erased.
        const oldDig = name === "sync" ? target.get("youtube-active-dig") : null;
        target.clear();
        if (oldDig) oldDig.onsuccess = () => { if (oldDig.result) target.put(oldDig.result, "youtube-active-dig"); };
        for (const item of indexed[name] || []) {
          if (name === "events") target.put(item);
          else target.put(item[1], item[0]);
        }
      }
    });
  } finally { database.close(); }
}

function backupLocalKeys() {
  return { artistCorrections: CORRECTIONS_KEY, feedback: FEEDBACK_KEY, bandcampProfiles: BANDCAMP_KEY, discogsArtists: DISCOGS_ARTIST_KEY, sourceCharacter: SOURCE_CHARACTER_KEY, explorationSettings: EXPLORATION_SETTINGS_KEY };
}

function backupStatus(message, error = false) {
  const status = document.querySelector("#backup-status");
  if (status) { status.textContent = message; status.classList.toggle("error", error); }
  else setSourceMessage(message, error ? "error" : "info");
}

async function exportBackup() {
  const button = document.querySelector("#export-backup");
  if (button) button.disabled = true;
  backupStatus("Préparation de la sauvegarde locale…");
  try {
    const indexed = await readBackupStores();
    const response = await fetch("/api/personal/graph");
    if (!response.ok) throw new Error("Le graphe du serveur est inaccessible : sauvegarde annulée pour éviter un fichier incomplet.");
    const graph = await response.json();
    const local = Object.fromEntries(Object.entries(backupLocalKeys()).map(([name, key]) => [name, name === "seen" ? loadStoredArray(key) : loadStoredObject(key)]));
    local.sourceCharacter = currentSourceCharacter();
    const payload = createBackup({ library, notebook, local, indexed, graph, playlists, navigation: { mission: currentMission, seedType: nodes.seedType.value, depth: currentExplorationDepth(), directions: selectedExplorationDirections(), maxDuration: Number(document.querySelector("#max-duration").value), hideSeen: document.querySelector("#hide-seen").checked, selectedPlaylistIds: [...nodes.playlists.querySelectorAll("input:checked")].map(({ value }) => value) } });
    downloadLocalJson(personalBackup(payload), "sauvegarde");
    backupStatus(`Sauvegarde exportée : ${library.length} vidéos, ${notebook.length} pistes du carnet et choix personnels. Les fouilles éphémères et les jetons ne sont pas inclus.`);
  } catch (error) { backupStatus(error.message, true); }
  finally { if (button) button.disabled = false; }
}

async function restoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.disabled = true;
  try {
    if (libraryImportInProgress) throw new Error("Attendez la fin de l’import avant de restaurer une sauvegarde.");
    if (file.size > 80_000_000) throw new Error("Sauvegarde trop volumineuse (80 Mo maximum).");
    const payload = personalBackup(validateBackup(JSON.parse(await file.text())));
    if (!confirm(`Restaurer ${payload.library.length} vidéos et ${payload.notebook.length} pistes du carnet ? La bibliothèque et le carnet locaux seront remplacés par ce fichier ; les identifiants de connexion restent inchangés.`)) return;
    // Cancel stale responses, but retain visible results until storage commits.
    cancelDiscoveryRequests();
    await explorationSaveQueue.catch(() => {});
    const restoredDig = {
      ...(payload.local.activeDig || {})
    };
    const localKeys = backupLocalKeys();
    const rollback = { library: await readCachedLibrary(), indexed: await readBackupStores(), local: Object.fromEntries([...Object.values(localKeys), NOTEBOOK_KEY].map((key) => [key, localStorage.getItem(key)])) };
    let databaseWritten = false;
    try {
      await writeBackupStores(payload.library, payload.indexed);
      databaseWritten = true;
      for (const [name, key] of Object.entries(localKeys)) {
        const value = payload.local[name] || (name === "seen" ? [] : {});
        if (name === "activeDig") {
          // The complete session is already committed in IndexedDB; this is only a secondary copy.
          try { localStorage.setItem(key, JSON.stringify(restoredDig)); }
          catch { localStorage.removeItem(key); }
        } else localStorage.setItem(key, JSON.stringify(value));
      }
      localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(payload.notebook));
    } catch (error) {
      let recovered = true;
      if (databaseWritten) await writeBackupStores(rollback.library, rollback.indexed).catch(() => { recovered = false; });
      for (const [key, value] of Object.entries(rollback.local)) {
        try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { recovered = false; }
      }
      throw new Error(recovered ? `Restauration annulée, état précédent rétabli. ${error.message}` : "La restauration et son retour arrière ont échoué. Conservez le fichier de sauvegarde et réessayez après avoir libéré du stockage.");
    }
    resetDiscoveries();
    await explorationTransport.start();
    const warnings = [];
    // Graph restoration is additive: never delete the server’s previously documented relations.
    for (const name of ["entities", "claims", "edges"]) {
      for (let offset = 0; offset < payload.graph[name].length; offset += 150) {
        try {
          const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ [name]: payload.graph[name].slice(offset, offset + 150) }) });
          if (!response.ok) throw new Error("Graphe non restauré entièrement sur le serveur");
        } catch (error) { warnings.push(error.message); break; }
      }
    }
    const dig = restoredDig;
    try {
      const response = await fetch("/api/exploration/session", dig.front?.seed?.id ? { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: dig }) } : { method: "DELETE" });
      if (!response.ok) throw new Error("Parcours sauvegardé dans le navigateur, copie serveur non mise à jour");
    } catch (error) { warnings.push(error.message); }
    library = payload.library;
    notebook = payload.notebook;
    seen = [];
    presented = {};
    artistCorrections = loadStoredObject(CORRECTIONS_KEY);
    feedback = loadStoredObject(FEEDBACK_KEY);
    bandcampProfiles = loadStoredObject(BANDCAMP_KEY);
    discogsArtistConfirmations = loadStoredObject(DISCOGS_ARTIST_KEY);
    currentProgramme = [];
    currentRanked = [];
    currentFiltersState = null;
    pinnedIds.clear();
    identityCache.clear();
    recordingCache.clear();
    contextCache.clear();
    artistCache.clear();
    labelCache.clear();
    videoSearchCache.clear();
    searchedLabels.clear();
    searchedCollaborators.clear();
    externalSeeds.clear();
    derivedPool.clear();
    currentDerivedIds = [];
    resumableDig =
      dig?.schemaVersion === 2 &&
      dig?.front?.seed?.id &&
      Array.isArray(dig.front.branches)
        ? dig
        : null;

    activeDig = {
      schemaVersion: 2,
      id: "",
      seed: null,
      front: null,
      dossier: null,
      derived: [],
      derivedIds: [],
      catalogueGroups: {},
      navigationStack: [],
      collaborationArtist: "",
      history: [],
      createdAt: "",
      updatedAt: new Date().toISOString()
    };

    explorationSession = null;
    playlists = payload.playlists || [];
    renderPlaylists();
    const selected = new Set(payload.navigation?.selectedPlaylistIds || playlists.map(({ id }) => id));
    for (const input of nodes.playlists.querySelectorAll("input")) input.checked = selected.has(input.value);
    updatePlaylistSelectionSummary();
    const mission = payload.navigation?.mission;
    if (payload.local.sourceCharacter && Object.keys(payload.local.sourceCharacter).length) {
      sourceCharacterState = normalizedSourceCharacter(payload.local.sourceCharacter);
      if (sourceCharacterState.preset) currentMission = sourceCharacterState.preset;
      persistSourceCharacterPatch();
      syncSourceCharacterUi();
    } else if (Object.hasOwn(MISSIONS, mission)) {
      applyMission(mission, document.querySelector(`[data-mission="${mission}"]`));
    }
    if (["track", "artist", "label", "playlist"].includes(payload.navigation?.seedType)) nodes.seedType.value = payload.navigation.seedType;
    if ([3, 6, 9].includes(payload.navigation?.depth)) nodes.explorationDepth.value = String(payload.navigation.depth);
    if (Array.isArray(payload.navigation?.directions)) for (const input of nodes.explorationDirections.querySelectorAll("input")) input.checked = payload.navigation.directions.includes(input.value);
    if (Number.isFinite(payload.navigation?.maxDuration)) document.querySelector("#max-duration").value = String(Math.max(1, Math.min(1440, payload.navigation.maxDuration)));
    if (typeof payload.navigation?.hideSeen === "boolean") document.querySelector("#hide-seen").checked = payload.navigation.hideSeen;
    updateLibraryState();
    renderNotebook();
    await refreshExplorationGraph().catch((error) => { warnings.push(error.message); });
    await restoreExplorationSession();
    renderRecoveryAction();
    renderActiveSeed();
    renderCollaborationAtlas();
    nodes.videos.replaceChildren();
    nodes.resultHead.hidden = true;
    backupStatus(
      `${library.length} vidéos et ${notebook.length} pistes restaurées.${
        warnings.length
          ? ` ${[...new Set(warnings)].join(". ")}. Le fichier peut être réimporté pour compléter la copie serveur.`
          : " Connexions conservées. Explorer est prêt pour un nouveau départ."
      }`,
      warnings.length > 0
    );
  } catch (error) { backupStatus(`Restauration impossible : ${error.message}`, true); }
  finally { event.target.value = ""; event.target.disabled = false; }
}

async function recordFeedback(kind, targetId, context = {}) {
  if (kind === "opened") return; // Listening is not a durable exploration preference.
  const event = { id: `${Date.now()}-${crypto.randomUUID()}`, kind, targetId, context, at: new Date().toISOString() };
  feedback[targetId] = { kind, at: event.at };
  saveLocalObject(FEEDBACK_KEY, feedback);
  await writeLocalEvent(event).catch(() => {});
  await fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(event) }).catch(() => {});
}

function setSourceMessage(message, type = "info") {
  nodes.sourceMessage.hidden = !message;
  nodes.sourceMessage.className = `message ${type === "error" ? "error" : ""}`.trim();
  nodes.sourceMessage.textContent = message;
  if (type === "error") workspace?.notify(message, { error: true });
}

function setSourceBusy(busy, message = "") {
  nodes.connect.disabled = busy;
  nodes.inspectUrls.disabled = busy;
  nodes.importPlaylists.dataset.busy = String(busy);
  nodes.importPlaylists.disabled = busy || !nodes.playlists.querySelector("input:checked");
  if (message) setSourceMessage(message);
}

function updateLibraryState() {
  nodes.libraryCount.textContent = `${library.length} vidéo${library.length > 1 ? "s" : ""} chargée${library.length > 1 ? "s" : ""}`;
  nodes.libraryCount.classList.toggle("connected", library.length > 0);
  nodes.compose.disabled = library.length === 0;
  if (library.length) {
    nodes.empty.querySelector("p").textContent = "Cliquez sur « Me proposer quatre morceaux » pour découvrir des points de départ dans vos playlists.";
  }
  collaborationIndex = buildCollaborationIndex(library, artistCorrections);
  persistLocalCollaborationGraph().catch(() => {}).then(() => refreshExplorationGraph()).catch(() => {});
  renderCollaborationAtlas();
  workspace?.update();
  if (library.length && nodes.sourceBody.dataset.userExpanded !== "true") {
    nodes.sourceBody.hidden = true;
    nodes.sourcePanel.classList.add("source-ready");
    nodes.toggleSources.textContent = "Gérer les sources";
  }
}

async function waitForGoogle(timeout = 6000) {
  const started = Date.now();
  while (!globalThis.google?.accounts?.oauth2) {
    if (Date.now() - started > timeout) throw new Error("Le module de connexion Google n’a pas pu être chargé.");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return globalThis.google;
}

async function connectYouTube() {
  if (validClientId(nodes.clientId.value.trim())) persistClientId();
  saveConfig();
  await connectionPanel?.connect();
}

function disconnectLocally() {
  connectionPanel?.forget();
}

async function youtube(endpoint, parameters = {}, attempts = 3, mayRenew = true) {
  const apiKey = nodes.apiKey.value.trim();
  await connectionPanel?.ensureAccessToken();
  const usableToken = accessToken && Date.now() < tokenExpiresAt - 15_000 ? accessToken : "";
  if (!usableToken && !apiKey) throw new Error("Connectez YouTube ou ajoutez une clé API pour lire ces playlists.");
  const url = new URL(`${API_ROOT}/${endpoint}`);
  for (const [name, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  }
  if (!usableToken) url.searchParams.set("key", apiKey);
  try {
    const response = await fetch(url, {
      headers: usableToken ? { authorization: `Bearer ${usableToken}` } : {},
      signal: AbortSignal.timeout(20_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const reason = data.error?.message || `YouTube a répondu ${response.status}.`;
      if (response.status === 401 && usableToken) {
        if (mayRenew) {
          const renewed = await connectionPanel?.ensureAccessToken({ force: true, rejectedToken: usableToken });
          if (renewed) return youtube(endpoint, parameters, attempts, false);
          // A transient refresh outage retains its grant and retry timer. The
          // panel owns the unavailable/expired distinction, not this API call.
        } else connectionPanel?.invalidateOAuth(usableToken, { renew: false });
      }
      if (attempts > 1 && (response.status === 429 || response.status >= 500)) {
        await new Promise((resolve) => setTimeout(resolve, (4 - attempts) * 600));
        return youtube(endpoint, parameters, attempts - 1, mayRenew);
      }
      throw new Error(reason);
    }
    connectionPanel?.accept({ accessToken: usableToken, apiKey });
    return data;
  } catch (error) {
    if (attempts > 1 && (error.name === "TimeoutError" || error.name === "TypeError")) {
      await new Promise((resolve) => setTimeout(resolve, (4 - attempts) * 600));
      return youtube(endpoint, parameters, attempts - 1, mayRenew);
    }
    throw error;
  }
}

async function fetchAll(endpoint, parameters, limit = MAX_IMPORTED_VIDEOS) {
  const items = [];
  let pageToken = "";
  do {
    const data = await youtube(endpoint, { ...parameters, maxResults: 50, pageToken });
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken && items.length < limit);
  return { items: items.slice(0, limit), truncated: Boolean(pageToken) };
}

function normalizePlaylist(item) {
  return {
    id: item.id,
    title: item.snippet?.title || "Playlist sans titre",
    description: item.snippet?.description || "",
    itemCount: Number(item.contentDetails?.itemCount || 0),
    privacyStatus: item.status?.privacyStatus || ""
  };
}

function mergePlaylists(incoming) {
  playlists = [...new Map([...playlists, ...incoming].map((playlist) => [playlist.id, playlist])).values()];
  playlists.sort((left, right) => left.title.localeCompare(right.title, "fr"));
  renderPlaylists();
  workspace?.update();
}

function renderPlaylists() {
  nodes.playlists.replaceChildren();
  for (const playlist of playlists) {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${escapeHtml(playlist.id)}" checked>
      <span><strong>${escapeHtml(playlist.title)}</strong><small>${playlist.itemCount} vidéo${playlist.itemCount > 1 ? "s" : ""}${playlist.privacyStatus ? ` · ${escapeHtml(playlist.privacyStatus)}` : ""}</small></span>`;
    nodes.playlists.append(label);
  }
  nodes.playlistPicker.hidden = playlists.length === 0;
  updatePlaylistSelectionSummary();
}

function updatePlaylistSelectionSummary() {
  const selectedIds = new Set([...nodes.playlists.querySelectorAll("input:checked")].map((input) => input.value));
  const selected = playlists.filter(({ id }) => selectedIds.has(id));
  nodes.importPlaylists.disabled = nodes.importPlaylists.dataset.busy === "true" || selected.length === 0;
  const declared = selected.reduce((sum, { itemCount }) => sum + Number(itemCount || 0), 0);
  nodes.importLabel.textContent = selected.length ? `Parcourir ${selected.length} playlist${selected.length > 1 ? "s" : ""}` : "Importer la sélection";
  nodes.selectionSummary.textContent = selected.length
    ? `${declared.toLocaleString("fr-FR")} entrées annoncées${declared > MAX_IMPORTED_VIDEOS ? ` · plafond de ${MAX_IMPORTED_VIDEOS.toLocaleString("fr-FR")} vidéos uniques` : " · dédoublonnage à l’import"}`
    : "Aucune playlist sélectionnée";
}

async function loadOwnedPlaylists() {
  const requestedToken = accessToken;
  if (!requestedToken) return;
  setSourceBusy(true, "Lecture de vos playlists…");
  try {
    const { items } = await fetchAll("playlists", { part: "snippet,contentDetails,status", mine: true }, 500);
    if (accessToken !== requestedToken) return;
    mergePlaylists(items.map(normalizePlaylist));
    setSourceMessage(`${items.length} playlist${items.length > 1 ? "s" : ""} accessible${items.length > 1 ? "s" : ""}. Choisissez celles que le Scout doit parcourir.`);
  } catch (error) {
    setSourceMessage(error.message, "error");
  } finally {
    setSourceBusy(false);
  }
}

async function inspectPlaylistUrls() {
  const ids = [...new Set(nodes.playlistUrls.value.split(/[\s,;]+/).map(extractPlaylistId).filter(Boolean))];
  if (!ids.length) {
    nodes.playlistUrls.focus();
    setSourceMessage("Aucun identifiant de playlist valide n’a été trouvé.", "error");
    return;
  }
  saveConfig();
  setSourceBusy(true, "Vérification des playlists…");
  try {
    const found = [];
    for (let index = 0; index < ids.length; index += 50) {
      const data = await youtube("playlists", { part: "snippet,contentDetails,status", id: ids.slice(index, index + 50).join(",") });
      found.push(...(data.items || []));
    }
    mergePlaylists(found.map(normalizePlaylist));
    const missing = ids.length - found.length;
    setSourceMessage(`${found.length} playlist${found.length > 1 ? "s" : ""} ajoutée${found.length > 1 ? "s" : ""}${missing ? ` ; ${missing} inaccessible${missing > 1 ? "s" : ""}.` : "."}`);
  } catch (error) {
    setSourceMessage(error.message, "error");
  } finally {
    setSourceBusy(false);
  }
}

function mergePlaylistItem(target, item, playlist, previous = new Map()) {
  const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
  if (!videoId) return;
  const title = item.snippet?.title || "";
  const unavailable = /^(Private|Deleted) video$/i.test(title);
  const current = target.get(videoId);
  if (current) {
    if (["deleted", "private", "unavailable"].includes(current.availability) && !unavailable) {
      current.title = title;
      current.availability = "public";
      current.description = String(item.snippet?.description || current.description || "").slice(0, 2400);
      current.channelId = item.snippet?.videoOwnerChannelId || current.channelId || "";
      current.channelTitle = item.snippet?.videoOwnerChannelTitle || current.channelTitle || "";
      current.thumbnail = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || current.thumbnail;
    }
    current.playlistIds = [...new Set([...current.playlistIds, playlist.id])];
    current.playlistNames = [...new Set([...current.playlistNames, playlist.title])];
    current.position = Math.min(current.position, Number(item.snippet?.position || 0));
    if (Date.parse(item.snippet?.publishedAt || "") < Date.parse(current.addedAt || "")) current.addedAt = item.snippet.publishedAt;
    return;
  }
  target.set(videoId, {
    ...(previous.get(videoId) || {}),
    id: videoId,
    title,
    description: String(item.snippet?.description || "").slice(0, 2400),
    channelId: item.snippet?.videoOwnerChannelId || "",
    channelTitle: item.snippet?.videoOwnerChannelTitle || "",
    publishedAt: item.contentDetails?.videoPublishedAt || "",
    addedAt: item.snippet?.publishedAt || "",
    position: Number(item.snippet?.position || 0),
    playlistIds: [playlist.id],
    playlistNames: [playlist.title],
    availability: unavailable ? "unavailable" : "public",
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || previous.get(videoId)?.thumbnail || ""
  });
}

async function enrichVideos(videoMap, ids = [...videoMap.keys()], checkpoint = null) {
  const batches = [];
  for (let index = 0; index < ids.length; index += 50) batches.push(ids.slice(index, index + 50));
  let completed = 0;
  while (batches.length) {
    const group = batches.splice(0, VIDEO_ENRICHMENT_CONCURRENCY);
    const results = await Promise.allSettled(group.map((batch) => youtube("videos", { part: "snippet,contentDetails,statistics,status", id: batch.join(",") })));
    let failure = null;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const batch = group[index];
      if (result.status === "rejected") { failure ||= result.reason; continue; }
      const data = result.value;
      const found = new Set((data.items || []).map(({ id }) => id));
      for (const id of batch) if (!found.has(id) && videoMap.has(id)) videoMap.get(id).availability = "unavailable";
      for (const item of data.items || []) {
        const video = videoMap.get(item.id);
        if (!video) continue;
        video.title = item.snippet?.title || video.title;
        video.description = String(item.snippet?.description || video.description || "").slice(0, 2400);
        video.channelId = item.snippet?.channelId || video.channelId;
        video.channelTitle = item.snippet?.channelTitle || video.channelTitle;
        video.categoryId = item.snippet?.categoryId || video.categoryId || "";
        video.publishedAt = item.snippet?.publishedAt || video.publishedAt;
        video.durationSeconds = parseIsoDuration(item.contentDetails?.duration);
        video.tags = (item.snippet?.tags || []).slice(0, 30);
        video.viewCount = Number(item.statistics?.viewCount || 0);
        video.thumbnail = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || video.thumbnail;
        video.availability = item.status?.uploadStatus === "processed" ? "public" : item.status?.uploadStatus || video.availability;
        video.enrichedAt = new Date().toISOString();
      }
      completed += batch.length;
      if (checkpoint) {
        const done = new Set(batch);
        checkpoint.pendingEnrichment = checkpoint.pendingEnrichment.filter((id) => !done.has(id));
        checkpoint.refreshed = Number(checkpoint.refreshed || 0) + batch.length;
      }
    }
    if (checkpoint) {
      checkpoint.videos = [...videoMap.values()];
      checkpoint.updatedAt = new Date().toISOString();
      await writeSyncState("youtube-import-progress", checkpoint);
    }
    setSourceMessage(`Détails actualisés : ${completed}/${ids.length}. Progression enregistrée.`);
    if (failure) throw failure;
  }
}

async function readSelectedPlaylists(selected, checkpoint, previous = new Map()) {
  return scanImportPages(checkpoint, {
    limit: MAX_IMPORTED_VIDEOS,
    concurrency: VIDEO_ENRICHMENT_CONCURRENCY,
    fetchPage: (state) => youtube("playlistItems", {
          part: "snippet,contentDetails,status",
          playlistId: state.playlist.id,
          maxResults: 50,
          pageToken: state.pageToken
    }),
    mergeItem: (target, item, playlist) => mergePlaylistItem(target, item, playlist, previous),
    saveCheckpoint: async (state) => {
      await writeSyncState("youtube-import-progress", state);
      setSourceMessage(`${state.entriesRead} entrées lues · ${state.videos.length} vidéos uniques · ${state.pagesRead} pages enregistrées. Reprise possible en cas d’interruption.`);
    }
  });
}

let libraryImportInProgress = false;

async function importSelectedPlaylists() {
  if (libraryImportInProgress) return;
  const selectedIds = [...nodes.playlists.querySelectorAll("input:checked")].map((input) => input.value);
  const selected = playlists.filter((playlist) => selectedIds.includes(playlist.id));
  if (!selected.length) {
    setSourceMessage("Sélectionnez au moins une playlist.", "error");
    return;
  }
  libraryImportInProgress = true;
  const resumeButton = document.querySelector("#import-resume");
  if (resumeButton) resumeButton.disabled = true;
  setSourceBusy(true, "Préparation de l’import…");
  nodes.importLabel.textContent = "Parcours en cours…";
  nodes.playlistPicker.setAttribute("aria-busy", "true");
  let checkpoint = null;
  try {
    const previousLibrary = new Map(library.map((video) => [video.id, video]));
    const pending = await readSyncState("youtube-import-progress");
    checkpoint = reusableImportCheckpoint(pending, selected) ? pending : createImportCheckpoint(selected);
    if (checkpoint.pagesRead) setSourceMessage(`Reprise à partir de ${checkpoint.pagesRead} pages déjà enregistrées.`);
    await writeSyncState("youtube-import-progress", checkpoint);
    const videoMap = checkpoint.phase === "pages" ? await readSelectedPlaylists(selected, checkpoint, previousLibrary) : new Map(checkpoint.videos.map((video) => [video.id, video]));
    const staleBefore = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (!checkpoint.enrichmentPrepared) {
      checkpoint.pendingEnrichment = [...videoMap.values()].filter((video) => video.availability !== "unavailable" && (!previousLibrary.has(video.id) || !video.durationSeconds || !(Date.parse(video.enrichedAt || "") >= staleBefore))).map(({ id }) => id);
      checkpoint.enrichmentPrepared = true;
      checkpoint.enrichmentTotal = checkpoint.pendingEnrichment.length;
      await writeSyncState("youtube-import-progress", checkpoint);
    }
    await enrichVideos(videoMap, checkpoint.pendingEnrichment, checkpoint);
    const result = finalizeLibraryImport(library, [...videoMap.values()], { complete: !checkpoint.truncated, selectedIds, limit: MAX_IMPORTED_VIDEOS });
    const reused = Math.max(0, result.videos.length - Number(checkpoint.refreshed || 0));
    const syncState = { ...result, videos: result.videos.length, at: new Date().toISOString(), playlists, selectedPlaylistIds: selectedIds, refreshed: Number(checkpoint.refreshed || 0), reused, truncated: checkpoint.truncated, entriesRead: checkpoint.entriesRead, uniqueScanned: videoMap.size, duplicates: checkpoint.duplicates || 0, pagesRead: checkpoint.pagesRead };
    await commitLibraryImport(result.videos, syncState);
    library = result.videos;
    await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope: "youtube-library", state: syncState }) }).catch(() => {});
    updateLibraryState();
    await refreshExplorationGraph().catch(() => {});
    nodes.librarySync.textContent = importSummary(syncState);
    setSourceMessage(importSummary(syncState));
    document.querySelector("#import-resume")?.setAttribute("hidden", "");
  } catch (error) {
    setSourceMessage(`${error.message} La bibliothèque précédente reste disponible. ${checkpoint?.pagesRead ? `${checkpoint.pagesRead} pages enregistrées ; relancez la même sélection pour reprendre.` : "Relancez l’import après avoir rétabli l’accès."}`, "error");
    const resume = document.querySelector("#import-resume");
    if (resume && checkpoint?.pagesRead) { resume.hidden = false; resume.textContent = `Reprendre l’import (${checkpoint.pagesRead} pages enregistrées)`; }
  } finally {
    libraryImportInProgress = false;
    if (resumeButton) resumeButton.disabled = false;
    setSourceBusy(false);
    nodes.playlistPicker.removeAttribute("aria-busy");
    updatePlaylistSelectionSummary();
  }
}

function importSummary(state) {
  const details = [`${state.videos} vidéos dans la bibliothèque`, `${state.entriesRead || 0} entrées lues`, `${state.duplicates || 0} doublons regroupés`, `${state.added || 0} nouvelles`];
  if (state.unavailable) details.push(`${state.unavailable} indisponibles lors de la lecture`);
  if (state.outOfSelection) details.push(`${state.outOfSelection} sorties de la sélection locale`);
  if (state.absentFromSelection) details.push(`${state.absentFromSelection} absentes des playlists parcourues`);
  if (state.truncated) details.push(`Plafond de ${MAX_IMPORTED_VIDEOS} identifiants atteint : parcours partiel, aucune ancienne vidéo retirée. Réduisez la sélection pour un parcours complet`);
  return `${details.join(" · ")}. Aucune modification de vos playlists YouTube.`;
}

async function resumeLibraryImport() {
  const pending = await readSyncState("youtube-import-progress").catch(() => null);
  if (!pending?.states?.length) return;
  mergePlaylists(pending.states.map(({ playlist }) => playlist));
  const selected = new Set(pending.states.map(({ playlist }) => playlist.id));
  for (const input of nodes.playlists.querySelectorAll("input")) input.checked = selected.has(input.value);
  updatePlaylistSelectionSummary();
  await importSelectedPlaylists();
}

function formatDuration(seconds) {
  const totalMinutes = Math.max(1, Math.round(Number(seconds || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours} h${minutes ? ` ${minutes}` : ""}` : `${minutes} min`;
}

function diggingSourceLinks(name) {
  const query = encodeURIComponent(name);
  const pairQuery = encodeURIComponent(`"${name}"`);
  const confirmedBandcamp = bandcampProfiles[artistMemoryKey(name)] || "";
  return [
    [confirmedBandcamp ? "Bandcamp confirmé" : "Bandcamp", confirmedBandcamp || `https://bandcamp.com/search?q=${query}`, confirmedBandcamp ? "profil confirmé localement" : "catalogue"],
    ["Discogs", `https://www.discogs.com/search/?q=${query}&type=artist`, "catalogue"],
    ["Spotify", `https://open.spotify.com/search/${query}`, "streaming"],
    ["Apple Music", `https://music.apple.com/fr/search?term=${query}`, "streaming"],
    ["SoundCloud", `https://soundcloud.com/search?q=${query}`, "uploads"],
    ["Mixcloud", `https://www.mixcloud.com/search/?q=${query}`, "sets"],
    ["Beatport", `https://www.beatport.com/search?q=${query}`, "précommandes"],
    ["Bleep", `https://bleep.com/search/query?q=${query}`, "précommandes"],
    ["Boomkat", `https://boomkat.com/search?q=${query}`, "sélection"],
    ["NTS", `https://www.nts.live/find?q=${query}`, "radio"],
    ["Last.fm", `https://www.last.fm/search?q=${query}`, "voisinages"],
    ["WhoSampled", `https://www.whosampled.com/search/?q=${pairQuery}`, "samples/remixes"]
  ];
}

function sourceLinkMarkup(name, compact = false) {
  const links = diggingSourceLinks(name);
  const visible = compact ? links.slice(0, 4) : links;
  return visible.map(([label, href, role]) => `<a${label.startsWith("Bandcamp") ? " data-bandcamp-link" : ""} href="${htmlUrl(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}${compact ? "" : ` · ${escapeHtml(role)}`} ↗</a>`).join("");
}

function collaborationKinds(kinds = {}) {
  return [
    Number(kinds.featuring || 0) ? `${Number(kinds.featuring)} feat.` : "",
    Number(kinds.remix || 0) ? `${Number(kinds.remix)} remix` : ""
  ].filter(Boolean).join(" · ");
}

function renderCollaborationAtlas() {
  if (!nodes.collaborations) return;
  if (!activeDig.seed?.id) {
    nodes.collaborations.hidden = true;
    nodes.collaborationEdges.replaceChildren();
    nodes.collaborationSummary.replaceChildren();
    return;
  }
  const sourceVideo = seedVideo();
  const localArtistName = activeDig.dossier?.artistName || (sourceVideo ? resolvedArtist(sourceVideo)?.name : "") || "";
  const draft = activeDig.participantDraft;
  const participants = draft?.seedId === activeDig.seed.id && Array.isArray(draft?.launched)
    ? draft.launched.map(row => ({ name: row.name, query: row.candidate?.name || row.query || row.name }))
    : splitArtistNames(declaredDepartureArtist(explorationGraph, activeDig.seed?.id) || activeDig.collaborationArtist
      || (activeDig.seed?.type === 'artist' ? activeDig.seed.label : '')
      || (activeDig.dossier?.suppressWeakIdentityCandidates ? '' : localArtistName)).map(name => ({ name, query: name }));
  const contexts = participants.map(row => ({ ...row, ...collaborationContext({
    seed: activeDig.seed, artistName: activeDig.collaborationNameChoices?.[`${activeDig.seed?.id}:${row.name}`] || row.query, index: collaborationIndex
  }) }));
  const activeKeys = new Set(contexts.flatMap(context => [context.activeKey, entityTokens(context.name).join('')]));
  const artistName = participants.map(row => row.name).join(', ');
  const visibleIndex = [...new Map(contexts.flatMap(context => context.edges).map(edge =>
    [(edge.artistKeys || edge.artists.map(name => entityTokens(name).join(''))).slice().sort().join('|'), edge])).values()]
    .sort((a, b) => b.count - a.count);
  const contextKey = `${activeDig.seed?.id || ""}:${[...activeKeys].join('|')}`;
  if (collaborationDisplay.key !== contextKey) collaborationDisplay = { key: contextKey, limit: 6 };
  nodes.collaborations.hidden = !activeDig.seed;
  nodes.collaborationEdges.replaceChildren();
  nodes.collaborationSummary.replaceChildren();
  if (!activeDig.seed) return;
  document.querySelector("#collaborations-title").textContent = artistName ? `Collaborateurs de ${artistName}` : "Collaborateurs du départ";
  const participantNotes = document.createElement('div');
  participantNotes.className = 'collaboration-participant-notes';
  if (contexts.length) nodes.collaborationEdges.append(participantNotes);
  for (const context of contexts) {
    const note = document.createElement('p'); note.className = 'collaboration-context-note';
    note.textContent = `${context.name} : ${context.edges.length} lien(s) dans les playlists · recherche sous « ${context.artistName} ». Ce rapprochement par nom ne confirme pas le crédit du morceau de départ.`;
    participantNotes.append(note);
    if (!context.edges.length && /\s+667$/u.test(context.query)) {
      const shorter = context.query.replace(/\s+667$/u, '');
      const alternative = collaborationContext({ seed: activeDig.seed, artistName: shorter, index: collaborationIndex });
      if (alternative.edges.length) {
        const choose = document.createElement('button'); choose.type = 'button';
        choose.textContent = `Voir les co-crédits sous « ${shorter} » — nom à vérifier`;
        choose.onclick = () => { activeDig.collaborationNameChoices = { ...activeDig.collaborationNameChoices, [`${activeDig.seed.id}:${context.name}`]: shorter }; renderCollaborationAtlas(); };
        note.append(choose);
      }
    }
  }
  if (!visibleIndex.length) {
    const note = document.createElement("p");
    note.className = "collaboration-context-note";
    note.textContent = artistName ? `Aucun co-crédit explicite de ${artistName} n’est présent dans vos playlists importées. Les autres collaborations de votre bibliothèque ne sont pas des liens avec ce départ.` : "Les collaborateurs apparaîtront quand l’artiste de ce départ sera identifié. Le réseau global de vos playlists n’est pas une recommandation pour ce morceau.";
    nodes.collaborationEdges.append(note);
    return;
  }

  const artists = new Set(visibleIndex.flatMap(({ artistKeys }) => artistKeys));
  const observations = visibleIndex.reduce((sum, { count }) => sum + count, 0);
  const scope = `Autour de ${artistName}`;
  for (const label of [scope, `${visibleIndex.length} liens`, `${observations} co-crédits observés`]) {
    const chip = document.createElement("span");
    chip.textContent = label;
    nodes.collaborationSummary.append(chip);
  }

  for (const edge of visibleIndex.slice(0, collaborationDisplay.limit)) {
    const [left, right] = edge.artists;
    const example = edge.examples[0];
    const query = encodeURIComponent(`"${left}" "${right}" music`);
    const card = document.createElement("article");
    card.className = "collaboration-card";
    card.innerHTML = `
      <p class="collaboration-count">${edge.count} co-crédit${edge.count > 1 ? "s" : ""}</p>
      <h3>${escapeHtml(left)} <span>↔</span> ${escapeHtml(right)}</h3>
      <p class="collaboration-kinds">${escapeHtml(collaborationKinds(edge.kinds) || "crédit explicite")}</p>
      <p class="collaboration-evidence">Exemple : <a href="https://www.youtube.com/watch?v=${encodeURIComponent(example.id)}" target="_blank" rel="noreferrer">${escapeHtml(example.title)} ↗</a></p>
      <div class="collaboration-actions"><a href="https://www.youtube.com/results?search_query=${query}" target="_blank" rel="noreferrer">Chercher le duo ↗</a><a href="https://www.discogs.com/search/?q=${encodeURIComponent(`${left} ${right}`)}&type=all" target="_blank" rel="noreferrer">Discogs ↗</a></div>`;
    const partner = edge.artists.find((name) => !activeKeys.has(entityTokens(name).join(""))) || null;
    if (partner) {
      const explore = document.createElement("button");
      explore.textContent = `Explorer ${partner} →`;
      explore.onclick = async () => {
        nodes.seedType.value = "artist";
        document.querySelector("#seed-search").value = "";
        await refreshExplorationGraph();
        const seed = seedCatalog.artist.find(({ label }) => entityTokens(label).join("") === entityTokens(partner).join(""));
        if (seed) { nodes.seedSelect.value = seed.id; await openExploration({ seed }); }
        else { workspace?.openPicker(); document.querySelector("#departure-picker").open = true; document.querySelector("#seed-search").value = partner; renderSeedOptions(); }
      };
      card.querySelector(".collaboration-actions").replaceChildren(explore);
    }
    nodes.collaborationEdges.append(card);
  }
  if (visibleIndex.length > collaborationDisplay.limit) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "outline-button";
    more.textContent = `Voir les ${visibleIndex.length - collaborationDisplay.limit} autres collaborations de ${artistName}`;
    more.onclick = () => { collaborationDisplay.limit += 6; renderCollaborationAtlas(); };
    nodes.collaborationEdges.append(more);
  }
  if (artistName) {
    const bridges = [...new Map(contexts.flatMap(context => artistCollaborationProfile(collaborationIndex, context.artistName).secondDegree || [])
      .filter(bridge => !activeKeys.has(entityTokens(bridge.partner).join('')))
      .map(bridge => [`${bridge.partner}|${bridge.via}`, bridge])).values()];
    for (const bridge of bridges.slice(0, 3)) {
      const card = document.createElement("article");
      card.className = "collaboration-card";
      card.innerHTML = `<p class="collaboration-count">À deux connexions</p><h3>${escapeHtml(bridge.partner)}</h3><p>Via ${escapeHtml(bridge.via)} · ${bridge.count} morceau(s) crédité(s)</p><div class="collaboration-actions"><button type="button">Explorer ce partenaire →</button></div>`;
      card.querySelector("button").onclick = async () => {
        nodes.seedType.value = "artist";
        document.querySelector("#seed-search").value = bridge.partner;
        renderSeedOptions();
        document.querySelector("#departure-picker").open = true;
        workspace?.openPicker();
        nodes.seedSelect.focus();
      };
      nodes.collaborationEdges.append(card);
    }
  }
}

function safeThumbnail(value, videoId) {
  const id = String(videoId || "").trim();
  if (/^[A-Za-z0-9_-]{6,20}$/.test(id)) return `/api/youtube/thumbnail/${encodeURIComponent(id)}`;
  return "/thumbnail-placeholder.svg";
}

function artistDetails(name) {
  const key = name.toLocaleLowerCase("fr-FR").trim();
  if (!artistCache.has(key)) {
    const request = fetch(`/api/music/artist?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(25_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "La discographie n’est pas accessible.");
        return data;
      })
      .catch((error) => {
        artistCache.delete(key);
        throw error;
      });
    artistCache.set(key, request);
  }
  return artistCache.get(key);
}

function releaseLabels(releaseGroupId) {
  if (!labelCache.has(releaseGroupId)) {
    const request = fetch(`/api/music/labels?releaseGroup=${encodeURIComponent(releaseGroupId)}`, { signal: AbortSignal.timeout(60_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Labels indisponibles.");
        return data.labels || [];
      })
      .catch((error) => {
        labelCache.delete(releaseGroupId);
        throw error;
      });
    labelCache.set(releaseGroupId, request);
  }
  return labelCache.get(releaseGroupId);
}

function artistContext(name) {
  const key = name.toLocaleLowerCase("fr-FR").trim();
  if (!contextCache.has(key)) {
    const request = fetch(`/api/music/context?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(15_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Contexte Wikidata indisponible.");
        return data;
      })
      .catch((error) => {
        contextCache.delete(key);
        throw error;
      });
    contextCache.set(key, request);
  }
  return contextCache.get(key);
}

function identityDetails(name) {
  const confirmedDiscogsId = String(discogsArtistConfirmations[artistMemoryKey(name)] || "");
  const key = JSON.stringify([artistMemoryKey(name), confirmedDiscogsId]);
  if (!identityCache.has(key)) {
    const parameters = new URLSearchParams({ name });
    if (confirmedDiscogsId) parameters.set("discogsId", confirmedDiscogsId);
    const request = fetch(`/api/music/identity?${parameters}`, { signal: AbortSignal.timeout(35_000) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Le registre d’identité n’est pas accessible.");
        await writeCachedIdentity(name, { ...data, confirmedDiscogsId, resolverVersion: CLIENT_VERSION }).catch(() => {});
        return data;
      })
      .catch(async (error) => {
        const cached = await readCachedIdentity(name).catch(() => null);
        if (cached?.resolverVersion === CLIENT_VERSION && cached.requestedName === name && String(cached.confirmedDiscogsId || "") === confirmedDiscogsId) return { ...cached, cacheFallback: true };
        identityCache.delete(key);
        throw error;
      });
    identityCache.set(key, request);
  }
  return identityCache.get(key);
}

function recordingDetails(video, artist) {
  const bandcamp =
    bandcampProfiles[artistMemoryKey(artist)] || "";

  /*
   * V2.7R1: deux hypothèses artiste pour un même titre sont deux requêtes
   * distinctes. Le cache ne doit pas les rabattre l'une sur l'autre via le
   * résultat d'un parseur préliminaire.
   */
  const key = JSON.stringify([
    video.title || "",
    artist || "",
    Number(video.durationSeconds || 0),
    bandcamp, video.channelTitle || "", video.description || ""
  ]);

  if (!recordingCache.has(key)) {
    const parameters = new URLSearchParams({
      title: video.title,
      artist,
      duration: String(video.durationSeconds || 0),
      channelTitle: String(video.channelTitle || "").slice(0, 300),
      description: String(video.description || "").slice(0, 1200)
    });

    if (bandcamp) parameters.set("bandcamp", bandcamp);

    const request =
      fetch(`/api/music/recording?${parameters}`, {
        signal: AbortSignal.timeout(25_000)
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              data.message ||
              "Le résolveur de morceau n’est pas accessible."
            );
          }
          return data;
        })
        .catch((error) => {
          recordingCache.delete(key);
          throw error;
        });

    recordingCache.set(key, request);
  }

  return recordingCache.get(key);
}


async function loadRecordingResolution(container, video, guess) {
  try {
    const data = await recordingDetails(video, guess.name);
    const parsed = data.parsed || {};
    if (parsed.status !== "parsed") {
      container.innerHTML = '<p class="source-title">Résolveur de morceau</p><p>Titre non décomposable sans supposition. Aucun morceau n’a été fusionné.</p>';
      return null;
    }
    const statusLabels = {
      resolved: "Correspondance exacte unique",
      resolved_track: "Piste identifiée dans une tracklist Discogs",
      ambiguous: "Plusieurs correspondances exactes : aucune fusion automatique",
      candidates: "Candidats à vérifier",
      not_found: "Aucun morceau identifié dans les catalogues consultés"
    };
    const candidateRows = (data.candidates || []).slice(0, 5).map((candidate) => {
      const artists = (candidate.artistCredits || []).map(({ name }) => name).join(" + ");
      const match = candidate.accepted ? " · titre et artiste concordants" : " · candidat non fusionné";
      return `<li><div><strong>${escapeHtml(candidate.title)}</strong><span>${escapeHtml([artists, candidate.firstReleaseDate].filter(Boolean).join(" · "))}</span><small>Recherche MusicBrainz ${Number(candidate.sourceScore || 0)}${escapeHtml(match)}</small></div><a href="${htmlUrl(candidate.musicBrainzUrl)}" target="_blank" rel="noreferrer">Recording ↗</a></li>`;
    }).join("");
    const discogsRows = (data.discogsCandidates || []).slice(0, 5).map((candidate) => `<li><div><strong>${escapeHtml(candidate.title)}</strong><span>${escapeHtml([candidate.year, ...(candidate.labels || []), candidate.catalogueNumber].filter(Boolean).join(" · "))}</span><small>Résultat de recherche d’édition ; ne confirme pas à lui seul le morceau.</small></div><div class="release-links"><a href="${htmlUrl(candidate.discogsUrl)}" target="_blank" rel="noreferrer">Édition ↗</a><button type="button" data-discogs-release="${escapeHtml(candidate.id)}">Lire crédits</button></div></li>`).join("");
    const discogsTrackRows = (data.discogsTrackCandidates || []).slice(0, 5).map(candidate => `<li><div><strong>${escapeHtml(candidate.title)}</strong><span>${escapeHtml([...(candidate.artists || []), candidate.position].filter(Boolean).join(" · "))}</span><small>${candidate.id === data.resolvedDiscogsTrack?.id ? "Piste retenue · artiste, titre et détails compatibles" : "Piste documentée · correspondance non confirmée"}</small></div><a href="${htmlUrl(candidate.url)}" target="_blank" rel="noreferrer">Tracklist ↗</a></li>`).join("");
    const corroboration = [
      data.corroboration?.musicbrainz === "resolved" ? "MusicBrainz · artiste + titre exacts" : "",
      data.corroboration?.discogs === "tracklist_match" ? "Discogs · piste et crédits documentés" : "",
      data.corroboration?.bandcamp === "artist_profile_only" ? "Bandcamp · profil artiste confirmé seulement" : ""
    ].filter(Boolean).map((label) => `<span>${escapeHtml(label)}</span>`).join("");
    const query = encodeURIComponent(`${parsed.artist} ${parsed.title}${parsed.mix ? ` ${parsed.mix}` : ""}`);
    container.innerHTML = `
      <div class="source-title-row"><p class="source-title">Résolveur de morceau</p><strong>${escapeHtml(statusLabels[data.status] || data.status)}</strong></div>
      <p><strong>${escapeHtml(parsed.artist)}</strong> — ${escapeHtml(parsed.title)}${parsed.mix ? ` <span>(${escapeHtml(parsed.mix)})</span>` : ""}</p>
      ${corroboration ? `<div class="corroboration-strip">${corroboration}</div>` : ""}
      ${parsed.discarded?.length ? `<p class="identity-note">Segments écartés du titre : ${escapeHtml(parsed.discarded.join(" · "))}</p>` : ""}
      <nav class="source-links"><a href="https://bandcamp.com/search?q=${query}" target="_blank" rel="noreferrer">Vérifier sur Bandcamp ↗</a><a href="https://www.discogs.com/search/?q=${query}&type=all" target="_blank" rel="noreferrer">Vérifier sur Discogs ↗</a></nav>
      ${candidateRows ? `<p class="source-title">MusicBrainz · recordings</p><ol class="release-list">${candidateRows}</ol>` : ""}
      ${discogsTrackRows ? `<p class="source-title">Discogs · pistes lues dans les tracklists</p><ol class="release-list">${discogsTrackRows}</ol>` : ""}
      ${data.discogsTrackCoverage?.attempted ? `<p class="identity-note">${Number(data.discogsTrackCoverage.loaded)} édition(s) lue(s) sur ${Number(data.discogsTrackCoverage.attempted)} tentée(s).${data.discogsTrackCoverage.complete ? "" : " Lecture partielle : toutes les éditions candidates n’ont pas été lues."}</p>` : ""}
      ${discogsRows ? `<p class="source-title">Discogs · éditions possibles</p><ol class="discogs-release-list">${discogsRows}</ol>` : ""}
      ${!candidateRows && !discogsRows && !discogsTrackRows ? "<p>Aucun catalogue n’a fourni de candidat exploitable.</p>" : ""}
      ${data.resolved?.id ? `<div class="structured-discovery"><button type="button" data-structured-discovery="${escapeHtml(data.resolved.id)}" data-source-video="${escapeHtml(video.id)}">Chercher des enregistrements voisins</button><div data-structured-results></div></div>` : ""}
      ${data.resolved?.isrcs?.[0] ? `<div class="platform-availability"><button type="button" data-platform-isrc="${escapeHtml(data.resolved.isrcs[0])}">Vérifier les plateformes par ISRC</button><div data-platform-results></div></div>` : ""}
      <p class="artist-footnote">Le parseur sépare artiste, titre et version. Le moteur vérifie leur concordance et les détails disponibles ; une ambiguïté reste à confirmer. Les identifiants des catalogues restent distincts.</p>`;
    for (const button of container.querySelectorAll("[data-discogs-release]")) {
      button.addEventListener("click", () => loadDiscogsRelease(button, button.dataset.discogsRelease));
    }
    container.querySelector("[data-structured-discovery]")?.addEventListener("click", (event) => loadStructuredDiscovery(event.currentTarget, data.resolved.id));
    container.querySelector("[data-platform-isrc]")?.addEventListener("click", (event) => loadPlatformAvailability(event.currentTarget, event.currentTarget.dataset.platformIsrc, video.id));
    return data;
  } catch (error) {
    container.innerHTML = `<p class="source-title">Résolveur de morceau</p><p class="artist-error">${escapeHtml(error.message)}</p>`;
    return null;
  }
}

async function loadPlatformAvailability(button, isrc, videoId) {
  const results = button.parentElement.querySelector("[data-platform-results]");
  button.disabled = true;
  button.textContent = "Vérification…";
  try {
    const parameters = new URLSearchParams({ isrc, territory: "FR", video: videoId });
    const response = await fetch(`/api/platform/availability?${parameters}`, { signal: AbortSignal.timeout(25_000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Comparaison indisponible.");
    const names = { youtube: "YouTube", applemusic: "Apple Music", spotify: "Spotify" };
    const states = { observed: "présence observée", not_found: "ISRC non trouvé", not_configured: "non configuré", unavailable: "indisponible" };
    const rows = data.observations.map((item) => item.url
      ? `<a href="${htmlUrl(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(names[item.platform] || item.platform)} · ${escapeHtml(states[item.status] || item.status)} ↗</a>`
      : `<span>${escapeHtml(names[item.platform] || item.platform)} · ${escapeHtml(states[item.status] || item.status)}</span>`).join("");
    results.innerHTML = `${rows}<p class="availability-differential">${escapeHtml(data.differential.statement)}</p><p class="availability-verdict">Exclusivité non établie. ${escapeHtml(data.exclusivity.statement)}</p>`;
    button.textContent = `ISRC ${isrc} · France`;
  } catch (error) {
    results.innerHTML = `<p class="artist-error">${escapeHtml(error.message)}</p>`;
    button.disabled = false;
    button.textContent = "Réessayer la comparaison";
  }
}

async function loadDiscogsRelease(button, releaseId) {
  button.disabled = true;
  button.textContent = "Lecture…";
  try {
    const response = await fetch(`/api/music/discogs/release?id=${encodeURIComponent(releaseId)}`, { signal: AbortSignal.timeout(25_000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Édition indisponible.");
    const details = document.createElement("div");
    details.className = "release-evidence";
    details.innerHTML = `<strong>${escapeHtml(data.title)} · ${escapeHtml(String(data.year || "année inconnue"))}</strong><span>${escapeHtml((data.catalogueNumbers || []).map((label) => [label.name, label.catno].filter(Boolean).join(" ")).join(" · ") || "Label non renseigné")}</span><p>${escapeHtml((data.tracks || []).slice(0, 12).map((track) => `${track.position} ${track.title}${track.credits?.length ? ` — ${track.credits.map((credit) => `${credit.name} (${credit.role})`).join(", ")}` : ""}`).join(" · "))}</p>`;
    button.closest("li").append(details);
    button.textContent = "Crédits lus ✓";
  } catch (error) {
    button.disabled = false;
    button.textContent = "Réessayer";
    button.title = error.message;
  }
}

async function loadStructuredDiscovery(button, recordingMbid) {
  const generation = compositionGeneration;
  const results = button.parentElement.querySelector("[data-structured-results]");
  button.disabled = true;
  button.textContent = "Lecture ListenBrainz…";
  try {
    const response = await fetch(`/api/music/discover?recording=${encodeURIComponent(recordingMbid)}`, { signal: AbortSignal.timeout(30_000) });
    const data = await response.json();
    if (generation !== compositionGeneration) return;
    if (!response.ok) throw new Error(data.message || "Voisinage indisponible.");
    results.innerHTML = (data.candidates || []).slice(0, 12).map((candidate) => `<article><div><strong>${escapeHtml(candidate.artist)}</strong><span>${escapeHtml(candidate.title)}</span></div><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(`${candidate.artist} ${candidate.title}`)}" target="_blank" rel="noreferrer">Chercher sur YouTube ↗</a></article>`).join("") || "<p>Aucun voisin structuré disponible pour cet enregistrement.</p>";
    const sourceVideo = currentProgramme.find(({ id }) => id === button.dataset.sourceVideo);
    if (sourceVideo) {
      const resolved = (await Promise.all((data.candidates || []).slice(0, 4).map(async (candidate) => ({
        candidate,
        video: await findTrackVideo(candidate.artist, candidate.title)
      })))).filter(({ video }) => video);
      if (generation !== compositionGeneration) return;
      for (const { candidate, video } of resolved) registerDerived([video], {
        kind: "similar",
        entity: `${candidate.artist} — ${candidate.title}`,
        sourceVideoId: sourceVideo.id,
        sourceTitle: sourceVideo.title,
        detail: `voisin ListenBrainz : ${candidate.artist} — ${candidate.title}`,
        source: "ListenBrainz + recherche YouTube vérifiée",
        generation
      });
    }
    button.textContent = `${(data.candidates || []).length} voisins structurés`;
  } catch (error) {
    results.innerHTML = `<p class="artist-error">${escapeHtml(error.message)}</p>`;
    button.disabled = false;
    button.textContent = "Réessayer ListenBrainz";
  }
}

function sourceStateLabel(source, state) {
  const names = { musicbrainz: "MusicBrainz", wikidata: "Wikidata", discogs: "Discogs" };
  const states = { matched: "relié", candidate: "candidat non fusionné", not_found: "sans correspondance", not_configured: "non configuré", unavailable: "indisponible" };
  return `${names[source] || source} · ${states[state] || state}`;
}

async function loadCanonicalIdentity(container, guess) {
  try {
    const identity = await identityDetails(guess.name);
    const sourceStates = Object.entries(identity.sourceStates || {}).map(([source, state]) => `<span>${escapeHtml(sourceStateLabel(source, state))}</span>`).join("");
    const claims = (identity.claims || []).filter(({ field, source, status }) => field === "name" && source !== "youtube" && status !== "candidate");
    const claimRows = claims.map((item) => `<li><span>${escapeHtml(sourceStateLabel(item.source, "matched").replace(" · relié", ""))}</span><a href="${htmlUrl(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.value)} ↗</a></li>`).join("");
    const conflictRows = (identity.conflicts || []).map((item) => `<li>${escapeHtml(item.conflictingValue)} · ${escapeHtml(item.source)}</li>`).join("");
    const discogs = identity.discogs || {};
    const resolutionLabels = {
      confirmed_cross_id: "Identité reliée par identifiant structuré",
      confirmed_user: "Profil Discogs confirmé par vous",
      corroborated: "Nom corroboré par plusieurs catalogues",
      single_source: "Une seule source structurée concorde",
      unresolved: "Identité non résolue"
    };
    const discogsNote = discogs.status === "not_configured"
      ? `<p class="identity-note">Discogs non interrogé : enregistrez votre jeton dans « Gérer les sources ». <a href="${htmlUrl(discogs.searchUrl)}" target="_blank" rel="noreferrer">Recherche manuelle ↗</a></p>`
      : discogs.match === "candidate"
        ? `<p class="identity-note identity-warning">Discogs propose « ${escapeHtml(discogs.name)} », conservé comme candidat non fusionné. <a href="${htmlUrl(discogs.discogsUrl)}" target="_blank" rel="noreferrer">Vérifier ↗</a>${discogs.id ? ` <button type="button" data-confirm-discogs="${escapeHtml(String(discogs.id))}">C’est bien cet artiste</button>` : ""}</p>`
        : discogs.status === "not_found"
          ? `<p class="identity-note">Aucune correspondance Discogs exacte. <a href="${htmlUrl(discogs.searchUrl)}" target="_blank" rel="noreferrer">Recherche manuelle ↗</a></p>`
          : "";
    container.innerHTML = `
      <p class="source-title">Registre canonique local${identity.cacheFallback ? " · copie locale" : ""}</p>
      <div class="identity-heading"><strong>${escapeHtml(identity.canonicalName)}</strong><span>${escapeHtml(resolutionLabels[identity.resolution?.status] || "Résolution prudente")}</span></div>
      <div class="identity-states">${sourceStates}</div>
      ${claimRows ? `<ul class="identity-claims">${claimRows}</ul>` : ""}
      ${conflictRows ? `<div class="identity-conflicts"><strong>À résoudre, sans fusion automatique :</strong><ul>${conflictRows}</ul></div>` : ""}
      ${discogsNote}
      <p class="artist-footnote">Chaque nom et identifiant conserve sa source. Aucun pourcentage global n’est calculé.</p>`;
    container.querySelector("[data-confirm-discogs]")?.addEventListener("click", async (event) => {
      const id = event.currentTarget.dataset.confirmDiscogs;
      discogsArtistConfirmations[artistMemoryKey(guess.name)] = id;
      saveLocalObject(DISCOGS_ARTIST_KEY, discogsArtistConfirmations);
      identityCache.clear();
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = "Confirmation enregistrée…";
      await loadCanonicalIdentity(container, guess);
      if (activeDig.seed && activeDig.dossier?.artistName === guess.name) {
        await openExploration({ seed: activeDig.seed, preserveLineage: true, lineage: explorationSession?.lineage || [] });
      }
    });
    return identity;
  } catch (error) {
    container.innerHTML = `<p class="source-title">Registre canonique local</p><p class="artist-error">${escapeHtml(error.message)} La fiche reste utilisable sans fusion d’identité.</p>`;
    return null;
  }
}

async function loadDiscogsCatalogue(container, identity) {
  const artistId = identity?.externalIds?.discogs;
  if (!artistId) {
    container.innerHTML = '<p class="source-title">Discogs</p><p>Identité Discogs non établie : aucune sortie n’est fusionnée automatiquement.</p>';
    return null;
  }
  try {
    const response = await fetch(`/api/music/discogs/artist?id=${encodeURIComponent(artistId)}`, { signal: AbortSignal.timeout(18_000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Catalogue Discogs indisponible.");
    const rows = (data.releases || []).slice(0, 10).map((release) => `<li><div><strong>${escapeHtml(release.title)}</strong><span>${escapeHtml([release.year || "date inconnue", release.label, release.format, release.role].filter(Boolean).join(" · "))}</span></div><a href="${htmlUrl(release.discogsUrl)}" target="_blank" rel="noreferrer">${escapeHtml(release.type)} ↗</a></li>`).join("");
    container.innerHTML = `<div class="source-title-row"><p class="source-title">Discogs · éditions et apparitions</p><a href="${htmlUrl(data.discogsUrl)}" target="_blank" rel="noreferrer">Profil ↗</a></div>${data.realName ? `<p><strong>Nom :</strong> ${escapeHtml(data.realName)}</p>` : ""}${rows ? `<ol class="discogs-release-list">${rows}</ol>` : "<p>Aucune sortie Discogs trouvée.</p>"}`;
    return data;
  } catch (error) {
    container.innerHTML = `<p class="source-title">Discogs</p><p class="artist-error">${escapeHtml(error.message)}</p>`;
    return null;
  }
}

async function findDiscoveryVideos(entityName, kind = "artist") {
  if ((!accessToken || Date.now() >= tokenExpiresAt - 15_000) && !nodes.apiKey.value.trim()) return null;
  const order = ["date", "relevance", "viewCount"][compositionGeneration % 3];
  const key = `${kind}\u0000${entityName}\u0000${order}`.toLocaleLowerCase("fr-FR");
  if (!videoSearchCache.has(key)) {
    const request = youtube("search", {
      part: "snippet",
      q: kind === "label" ? `"${entityName}" label music` : `"${entityName}" music`,
      type: "video",
      videoCategoryId: "10",
      order,
      maxResults: 25
    }).then(async (data) => {
      const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean);
      if (!ids.length) return [];
      const details = await youtube("videos", { part: "snippet,contentDetails,statistics,status", id: ids.join(",") });
      return (details.items || []).map((item) => ({
        id: item.id,
        title: item.snippet?.title || "Vidéo musicale",
        channelTitle: item.snippet?.channelTitle || "",
        description: item.snippet?.description || "",
        publishedAt: item.snippet?.publishedAt || "",
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        durationSeconds: parseIsoDuration(item.contentDetails?.duration),
        viewCount: Number(item.statistics?.viewCount || 0)
      })).filter((video) => video.durationSeconds >= 45 && !/#shorts?\b/i.test(video.title) && mentionsEntity(video, entityName, kind)).sort((left, right) => {
        const leftTitle = entityTokens(left.title).filter((token) => entityTokens(entityName).includes(token)).length;
        const rightTitle = entityTokens(right.title).filter((token) => entityTokens(entityName).includes(token)).length;
        return rightTitle - leftTitle || String(right.publishedAt).localeCompare(String(left.publishedAt));
      });
    }).catch(() => []);
    videoSearchCache.set(key, request);
  }
  return videoSearchCache.get(key);
}

async function findTrackVideo(artist, title) {
  if ((!accessToken || Date.now() >= tokenExpiresAt - 15_000) && !nodes.apiKey.value.trim()) return null;
  const order = ["relevance", "date", "viewCount"][compositionGeneration % 3];
  const key = `track\u0000${artist}\u0000${title}\u0000${order}`.toLocaleLowerCase("fr-FR");
  if (!videoSearchCache.has(key)) {
    const request = youtube("search", {
      part: "snippet",
      q: `"${artist}" "${title}"`,
      type: "video",
      videoCategoryId: "10",
      order,
      maxResults: 8
    }).then(async (data) => {
      const ids = (data.items || []).map((item) => item.id?.videoId).filter(Boolean);
      if (!ids.length) return null;
      const details = await youtube("videos", { part: "snippet,contentDetails,statistics,status", id: ids.join(",") });
      const titleTokens = entityTokens(title).filter((token) => token.length > 2);
      return (details.items || []).map((item) => ({
        id: item.id,
        title: item.snippet?.title || "Vidéo musicale",
        channelTitle: item.snippet?.channelTitle || "",
        description: item.snippet?.description || "",
        publishedAt: item.snippet?.publishedAt || "",
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        durationSeconds: parseIsoDuration(item.contentDetails?.duration),
        viewCount: Number(item.statistics?.viewCount || 0),
        artist
      })).find((video) => video.durationSeconds >= 45
        && !/#shorts?\b/i.test(video.title)
        && mentionsEntity(video, artist)
        && titleTokens.filter((token) => entityTokens(video.title).includes(token)).length >= Math.min(2, titleTokens.length)) || null;
    }).catch(() => null);
    videoSearchCache.set(key, request);
  }
  return videoSearchCache.get(key);
}

function findArtistVideos(artistName) {
  return findDiscoveryVideos(artistName, "artist");
}

function registerDerived(videos, path) {
  if (path.generation !== compositionGeneration) return;
  const activeSourceId = activeDig.dossier?.videoId || seedVideo()?.id || "";
  if (activeSourceId && path.sourceVideoId !== activeSourceId) return;
  const sourceIds = new Set(library.map(({ id }) => id));
  for (const video of videos || []) {
    if (!video?.id || sourceIds.has(video.id)) continue;
    const current = derivedPool.get(video.id) || { ...video, paths: [] };
    const signature = `${path.kind}:${path.entity}:${path.sourceVideoId}`;
    if (!current.paths.some((candidate) => candidate.signature === signature)) current.paths.push({ ...path, signature });
    derivedPool.set(video.id, current);
  }
  renderDerived();
}

async function discoverLabel(label, sourceVideo, artistName, generation) {
  const key = label.toLocaleLowerCase("fr-FR").trim();
  if (!key || searchedLabels.has(key) || searchedLabels.size >= 3) return;
  searchedLabels.add(key);
  const videos = await findDiscoveryVideos(label, "label");
  registerDerived(videos, {
    kind: "label",
    entity: label,
    sourceVideoId: sourceVideo.id,
    sourceTitle: sourceVideo.title,
    detail: `${artistName} → label ${label}`,
    source: "MusicBrainz + recherche YouTube vérifiée",
    generation
  });
}

async function discoverCollaborators(sourceVideo, generation) {
  for (const collaborator of extractCreditArtists(sourceVideo).slice(0, 2)) {
    const key = collaborator.toLocaleLowerCase("fr-FR");
    if (searchedCollaborators.has(key) || searchedCollaborators.size >= 2) continue;
    searchedCollaborators.add(key);
    const videos = await findArtistVideos(collaborator);
    registerDerived(videos, {
      kind: "credit",
      entity: collaborator,
      sourceVideoId: sourceVideo.id,
      sourceTitle: sourceVideo.title,
      detail: `crédit commun : ${collaborator}`,
      source: "Crédit explicite du titre + recherche YouTube vérifiée",
      generation
    });
  }
}

async function discoverNetworkCollaborator(sourceVideo, artistName, connection, generation, button) {
  const key = connection.partner.toLocaleLowerCase("fr-FR");
  if (searchedCollaborators.has(key) || searchedCollaborators.size >= 4) {
    if (button) button.textContent = searchedCollaborators.has(key) ? "Déjà cherchée" : "Quota de session atteint";
    return;
  }
  searchedCollaborators.add(key);
  if (button) {
    button.disabled = true;
    button.textContent = "Recherche…";
  }
  const videos = await findArtistVideos(connection.partner);
  registerDerived(videos, {
    kind: "network",
    entity: connection.partner,
    sourceVideoId: sourceVideo.id,
    sourceTitle: sourceVideo.title,
    detail: `${artistName} ↔ ${connection.partner} · ${connection.count} co-crédit${connection.count > 1 ? "s" : ""} dans vos playlists`,
    source: "Graphe local des crédits + recherche YouTube vérifiée",
    generation
  });
  if (button) button.textContent = videos?.length ? `${videos.length} piste${videos.length > 1 ? "s" : ""} trouvée${videos.length > 1 ? "s" : ""}` : "Aucune piste";
}

function renderArtistCollaborations(container, guess, sourceVideo, generation) {
  const profile = artistCollaborationProfile(collaborationIndex, guess.name);
  if (!profile.connections.length) {
    container.innerHTML = '<p class="source-title">Réseau dans vos playlists</p><p>Aucun featuring ou remix explicite détecté pour cet artiste. Cela ne prouve pas l’absence de collaboration.</p>';
    return;
  }
  container.innerHTML = `
    <p class="source-title">Réseau dans vos playlists · ${profile.partnerCount} partenaire${profile.partnerCount > 1 ? "s" : ""} · ${profile.occurrenceCount} co-crédit${profile.occurrenceCount > 1 ? "s" : ""}</p>
    <ul class="collaboration-list">${profile.connections.slice(0, 6).map((connection, index) => `
      <li><div><strong>${escapeHtml(connection.partner)}</strong><span>${connection.count} occurrence${connection.count > 1 ? "s" : ""} · ${escapeHtml(collaborationKinds(connection.kinds))}</span></div><button type="button" data-network-index="${index}">Creuser ↗</button></li>`).join("")}</ul>
    <p class="artist-footnote">Indice local fondé sur les mentions « feat. », « with » et crédits de remix dans les titres importés.</p>`;
  for (const button of container.querySelectorAll("[data-network-index]")) {
    const connection = profile.connections[Number(button.dataset.networkIndex)];
    button.addEventListener("click", () => discoverNetworkCollaborator(sourceVideo, guess.name, connection, generation, button));
  }
}

function releaseType(release) {
  return [release.type, ...(release.secondaryTypes || [])].filter(Boolean).join(" · ") || "Sortie";
}

function normalizedMediaTitle(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function releaseNode(body, releaseId) {
  return [...body.querySelectorAll(".release-item")].find((item) => item.dataset.releaseId === releaseId);
}

async function enrichReleaseRows(body, data, videosPromise, sourceVideo, generation) {
  const videos = await videosPromise.catch(() => []);
  await Promise.all((data.releases || []).map(async (release) => {
    try {
      const labels = await releaseLabels(release.id);
      release.labels = labels;
      const labelNode = releaseNode(body, release.id)?.querySelector("[data-release-labels]");
      if (labelNode) labelNode.textContent = labels.length ? labels.join(" · ") : "Label non renseigné";
      for (const label of labels.slice(0, 1)) discoverLabel(label, sourceVideo, data.artist.name, generation);
    } catch {
      release.labels = [];
      const labelNode = releaseNode(body, release.id)?.querySelector("[data-release-labels]");
      if (labelNode) labelNode.textContent = "Label indisponible";
    }

    const releaseTitle = normalizedMediaTitle(release.title);
    const artistName = normalizedMediaTitle(data.artist.name);
    const video = (videos || []).find((candidate) => {
      const title = normalizedMediaTitle(candidate.title);
      return releaseTitle.length >= 4 && title.includes(releaseTitle) && title.includes(artistName);
    });
    if (!video) return;
    const link = releaseNode(body, release.id)?.querySelector("[data-youtube-link]");
    if (!link) return;
    link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    link.textContent = "Vidéo musicale ↗";
  }));
  return data;
}

async function loadWikidataContext(container, guess) {
  try {
    const context = await artistContext(guess.name);
    const labels = context.labels?.length ? `<p><strong>Labels associés :</strong> ${escapeHtml(context.labels.join(" · "))}</p>` : "";
    container.innerHTML = `
      <p>${escapeHtml(context.description || "Fiche trouvée dans Wikidata.")}</p>
      ${labels}
      <div class="context-links">
        ${context.wikipediaUrl ? `<a href="${htmlUrl(context.wikipediaUrl)}" target="_blank" rel="noreferrer">Wikipédia ↗</a>` : ""}
        <a href="${htmlUrl(context.wikidataUrl)}" target="_blank" rel="noreferrer">Wikidata ↗</a>
        ${context.bandcampUrl ? `<a href="${htmlUrl(context.bandcampUrl)}" target="_blank" rel="noreferrer">Profil Bandcamp ↗</a>` : ""}
      </div>`;
    const bandcampLink = container.closest(".artist-body")?.querySelector("[data-bandcamp-link]");
    if (bandcampLink && context.bandcampUrl) {
      bandcampLink.href = safeExternalUrl(context.bandcampUrl) || "#";
      bandcampLink.textContent = "Profil Bandcamp ↗";
    }
    return context;
  } catch {
    container.innerHTML = '<p>Aucune fiche Wikidata suffisamment fiable. Les recherches directes restent disponibles.</p>';
    return null;
  }
}

async function loadLatestVideos(container, guess, sourceVideo, generation) {
  const videos = await findArtistVideos(guess.name);
  if (!videos) {
    container.innerHTML = '<p>Connectez YouTube ou ajoutez une clé API pour obtenir les vidéos récentes ici.</p>';
    return [];
  }
  if (!videos.length) {
    container.innerHTML = '<p>Aucune vidéo musicale récente suffisamment proche n’a été trouvée.</p>';
    return [];
  }
  container.innerHTML = `<p class="source-title">Vidéos musicales récentes — recherche à confirmer</p><ul class="recent-video-list">${videos.slice(0, 5).map((video) => `
    <li><a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noreferrer">${escapeHtml(video.title)} ↗</a><span>${escapeHtml(video.channelTitle)} · ${escapeHtml(String(video.publishedAt).slice(0, 10))}</span></li>`).join("")}</ul>`;
  registerDerived(videos, {
    kind: "artist",
    entity: guess.name,
    sourceVideoId: sourceVideo.id,
    sourceTitle: sourceVideo.title,
    detail: `même artiste : ${guess.name}`,
    source: "Recherche YouTube filtrée sur l’artiste",
    generation
  });
  return videos;
}

async function loadMusicBrainzDiscography(container, body, guess, videosPromise, sourceVideo, generation) {
  try {
    const data = await artistDetails(guess.name);
    const releases = data.releases || [];
    const artistNote = [data.artist.disambiguation, data.artist.country].filter(Boolean).join(" · ");
    const items = releases.map((release) => {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${data.artist.name} ${release.title}`)}`;
      return `<li class="release-item" data-release-id="${escapeHtml(release.id)}">
        <div><strong>${escapeHtml(release.title)}</strong><span>${escapeHtml(release.date || "Date inconnue")} · ${escapeHtml(releaseType(release))}</span><small data-release-labels>Label en cours…</small></div>
        <div class="release-links"><a href="${htmlUrl(release.musicBrainzUrl)}" target="_blank" rel="noreferrer">Fiche ↗</a><a data-youtube-link href="${searchUrl}" target="_blank" rel="noreferrer">Chercher sur YouTube ↗</a></div>
      </li>`;
    }).join("");
    container.innerHTML = `
      <div class="artist-match"><span>Correspondance MusicBrainz ${data.artist.score}%${artistNote ? ` · ${escapeHtml(artistNote)}` : ""}</span><a href="${htmlUrl(data.artist.musicBrainzUrl)}" target="_blank" rel="noreferrer">${escapeHtml(data.artist.name)} ↗</a></div>
      ${items ? `<ol class="release-list">${items}</ol>` : '<p class="artist-status">Aucune sortie officielle datée n’a été trouvée.</p>'}`;
    await enrichReleaseRows(body, data, videosPromise, sourceVideo, generation);
    return data;
  } catch (error) {
    const message = error.name === "TimeoutError" ? "MusicBrainz est trop lent ou indisponible." : error.message;
    container.innerHTML = `<p class="artist-status artist-error">${escapeHtml(message)} Les autres sources restent utilisables.</p>`;
    return null;
  }
}

async function loadArtistDetails(card, guess, sourceVideo) {
  const panel = card.querySelector("[data-artist-panel]");
  const body = panel?.querySelector(".artist-body");
  const button = panel?.querySelector(".artist-load");
  if (!panel || !body || panel.dataset.state === "loading") return;
  panel.dataset.state = "loading";
  button.disabled = true;
  button.textContent = "Recherche…";
  const generation = compositionGeneration;
  let completedResolution = null;
  const persistCompletedResolution = () => completedResolution && fetch("/api/resolution", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(completedResolution)
  }).then(() => refreshExplorationGraph()).catch(() => {});
  const wikipediaSearch = `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(guess.name)}`;
  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${guess.name} music`)}`;
  body.innerHTML = `
    <nav class="source-links" aria-label="Recherches externes">
      ${sourceLinkMarkup(guess.name, true)}
      <a href="${wikipediaSearch}" target="_blank" rel="noreferrer">Chercher sur Wikipédia ↗</a>
      <a href="${youtubeSearch}" target="_blank" rel="noreferrer">Chercher sur YouTube ↗</a>
    </nav>
    <details class="digging-sources"><summary>Ouvrir les autres terrains de digging</summary><div class="digging-source-grid">${sourceLinkMarkup(guess.name)}</div><p>Ces liens ouvrent des recherches à vérifier. Ils ne signifient pas que le Scout a lu ou validé les catalogues correspondants.</p></details>
    ${(bandcampProfiles[registryStorageKey(guess.name)] && !bandcampProfiles[artistMemoryKey(guess.name)]) || (discogsArtistConfirmations[registryStorageKey(guess.name)] && !discogsArtistConfirmations[artistMemoryKey(guess.name)]) ? '<p class="identity-note">Une ancienne confirmation liée à un nom simplifié est conservée. Vérifiez à nouveau le profil avant de la réutiliser pour cet artiste.</p>' : ""}
    <form class="bandcamp-confirm"><label>Profil Bandcamp vérifié par vous<input name="bandcamp-url" type="url" value="${escapeHtml(bandcampProfiles[artistMemoryKey(guess.name)] || "")}" placeholder="https://artiste.bandcamp.com/"></label><button type="submit">Mémoriser ce lien</button><small>Le Scout ne scrape pas silencieusement Bandcamp ; ce lien confirmé devient une preuve locale réutilisable.</small></form>
    <section class="source-block identity-block" data-identity><p>Résolution de l’identité canonique…</p></section>
    <section class="source-block recording-block" data-recording><p>Résolution du morceau…</p></section>
    <section class="source-block discogs-block" data-discogs><p>Lecture des éditions et apparitions Discogs…</p></section>
    <section class="source-block" data-collaborations></section>
    <section class="source-block" data-wikidata><p>Vérification Wikidata…</p></section>
    <section class="source-block" data-latest-videos><p>Recherche des vidéos récentes…</p></section>
    <section class="source-block discography-block" data-discography><p>Lecture de la discographie MusicBrainz…</p></section>
    <p class="artist-footnote">Sources indépendantes · correspondances à confirmer · aucune donnée écrite sur vos comptes</p>`;
  body.querySelector(".bandcamp-confirm").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = String(event.currentTarget.elements["bandcamp-url"].value || "").trim();
    let valid = false;
    try { const url = new URL(value); valid = url.protocol === "https:" && /(^|\.)bandcamp\.com$/i.test(url.hostname); } catch { valid = false; }
    if (!valid) return event.currentTarget.elements["bandcamp-url"].setCustomValidity("Utilisez une URL HTTPS bandcamp.com valide."), event.currentTarget.reportValidity();
    event.currentTarget.elements["bandcamp-url"].setCustomValidity("");
    bandcampProfiles[artistMemoryKey(guess.name)] = value;
    saveLocalObject(BANDCAMP_KEY, bandcampProfiles);
    recordingCache.clear();
    event.currentTarget.querySelector("button").textContent = "Lien mémorisé ✓";
    const link = body.querySelector("[data-bandcamp-link]");
    if (link) { link.href = value; link.textContent = "Profil Bandcamp confirmé ↗"; }
    if (completedResolution) {
      completedResolution.context.bandcamp = { url: value, source: "user_confirmed", status: "confirmed" };
      persistCompletedResolution();
    }
  });
  renderArtistCollaborations(body.querySelector("[data-collaborations]"), guess, sourceVideo, generation);
  const videosPromise = loadLatestVideos(body.querySelector("[data-latest-videos]"), guess, sourceVideo, generation);
  discoverCollaborators(sourceVideo, generation);
  const musicPromise = loadMusicBrainzDiscography(body.querySelector("[data-discography]"), body, guess, videosPromise, sourceVideo, generation);
  const contextPromise = loadWikidataContext(body.querySelector("[data-wikidata]"), guess);
  const identityPromise = loadCanonicalIdentity(body.querySelector("[data-identity]"), guess);
  const recordingPromise = loadRecordingResolution(body.querySelector("[data-recording]"), sourceVideo, guess);
  const discogsPromise = identityPromise.then((identity) => loadDiscogsCatalogue(body.querySelector("[data-discogs]"), identity));
  const [music, wikidata, identity, recording, discogs] = await Promise.all([
    musicPromise,
    contextPromise,
    identityPromise,
    recordingPromise,
    discogsPromise,
    videosPromise
  ]);
  if (identity || recording) {
    const confirmedBandcamp = bandcampProfiles[artistMemoryKey(guess.name)] || "";
    const context = {
      music,
      wikidata,
      discogs,
      bandcamp: confirmedBandcamp
        ? { url: confirmedBandcamp, source: "user_confirmed", status: "confirmed" }
        : wikidata?.bandcampUrl
          ? { url: wikidata.bandcampUrl, source: "wikidata", status: "structured" }
          : null,
      collaborations: extractCreditRelations(sourceVideo)
    };
    for (const label of [...new Set((discogs?.releases || []).map(({ label }) => label).filter(Boolean))].slice(0, 2)) {
      discoverLabel(label, sourceVideo, guess.name, generation);
    }
    completedResolution = { video: sourceVideo, identity, recording, context };
    persistCompletedResolution();
  }
  if (music) {
    panel.dataset.state = "done";
    button.hidden = true;
  } else {
    panel.dataset.state = "error";
    button.disabled = false;
    button.textContent = "Réessayer MusicBrainz";
  }
}

async function updateArtistCorrection(video, value) {
  const name = String(value || "").trim();
  if (name.length > 120) { workspace?.notify("Le nom est limité à 120 caractères.", { error: true }); return; }
  const seed = { id: `video:youtube:${video.id}`, type: "track" };
  if (explorationGraph.entities?.[seed.id]) {
    const delta = name ? departureArtistUpdate(explorationGraph, seed, name) : { entities: [{ ...explorationGraph.entities[seed.id], departureArtist: null }], edges: [] };
    try {
      const response = await fetch("/api/graph/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(delta) });
      if (!response.ok) throw new Error("La correction n’a pas été enregistrée. Réessayez.");
      explorationGraph = departureRoutingSnapshot({ ...explorationGraph, entities: { ...explorationGraph.entities, ...Object.fromEntries(delta.entities.map(entity => [entity.id, entity])) } });
    } catch (error) { workspace?.notify(error.message, { error: true }); return; }
  }
  if (name) artistCorrections[video.id] = name;
  else delete artistCorrections[video.id];
  saveLocalObject(CORRECTIONS_KEY, artistCorrections);
  if (name) recordFeedback("wrong_identity", video.id, { previous: guessArtist(video)?.name || "", corrected: name }).catch(() => {});
  collaborationIndex = buildCollaborationIndex(library, artistCorrections);
  renderCollaborationAtlas();
  resetDiscoveries();
  renderProgramme(currentProgramme, currentFiltersState, false);
}

function renderProgramme(programme, filters, shouldScroll = true) {
  nodes.empty.hidden = true;
  nodes.resultHead.hidden = false;
  nodes.videos.replaceChildren();
  const libraryIds = new Set(library.map(({ id }) => id));
  const sourceExposureCount = Object.keys(presented).filter((id) => libraryIds.has(id)).length;
  const labels = [
    `${library.length} vidéos sources`,
    sourceCharacterLabel(),
    `≤ ${filters.maxDuration} min`,
    `${sourceExposureCount} sources déjà proposées`
  ];
  nodes.applied.replaceChildren(...labels.map((label) => {
    const chip = document.createElement("span");
    chip.textContent = label;
    return chip;
  }));
  const renewal = document.createElement("p");
  renewal.className = "suggestion-renewal-note";
  renewal.textContent = suggestionRenewalMessage(programme);
  nodes.applied.append(renewal);

  for (const video of sortMusic(programme.map(video => ({ ...video, artist: resolvedArtist(video)?.name || "" })), document.querySelector("#seed-sort")?.value || "random", { shuffleKey: seedShuffleKey })) {
    const index = programme.findIndex(item => item.id === video.id);
    const card = document.createElement("article");
    card.className = "video-card";
    const role = video.role;
    const reasons = (video.why || []).map((reason) => `<span>${escapeHtml(reason)}</span>`).join("");
    const playlistTags = (video.playlistNames || []).slice(0, 3).map((name) => `<span>${escapeHtml(name)}</span>`).join("");
    const artist = resolvedArtist(video);
    const year = musicalReleaseDate(video) ? `Sortie : ${musicalReleaseDate(video)}` : `Publication YouTube : ${String(video.publishedAt || "").slice(0, 4) || "inconnue"}`;
    card.innerHTML = `
      <div class="thumb">
        <img src="${safeThumbnail(video.thumbnail, video.id)}" alt="Miniature de ${escapeHtml(video.title)}" loading="lazy">
        <span class="rank">${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div class="video-copy">
        <div class="programme-role"><div><p>${escapeHtml(role.label)}</p><span>${escapeHtml(role.description)}</span></div><div class="card-tools"><button class="pin-button${pinnedIds.has(video.id) ? " active" : ""}" type="button">${pinnedIds.has(video.id) ? "Épinglée" : "Épingler"}</button><button class="reroll-card" type="button">Relancer ↻</button></div></div>
        <p class="video-meta">${year}<span>•</span>${formatDuration(video.durationSeconds)}<span>•</span>${Number(video.viewCount || 0).toLocaleString("fr-FR")} vues</p>
        <h3>${escapeHtml(video.title)}</h3>
        <p class="channel">${escapeHtml(video.channelTitle || "Chaîne inconnue")}</p>
        ${reasons ? `<div class="why">${reasons}</div>` : ""}
        ${playlistTags ? `<div class="playlist-tags">${playlistTags}</div>` : ""}
        <p class="description">${escapeHtml(video.description || "Aucune description disponible.")}</p>
        <section class="artist-panel" data-artist-panel>
          <div class="artist-heading">
            <div><span class="artist-kicker">${artist?.basis === "correction personnelle" ? "Artiste renseigné par vous · pour ce morceau" : artist ? `Artiste à vérifier · ${escapeHtml(artist.basis)}` : "Artiste non identifié"}</span><strong>${escapeHtml(artist?.name || "À préciser")}</strong></div>
            <div class="artist-actions"><button class="artist-edit" type="button">Corriger</button></div>
          </div>
          <form class="artist-correction" hidden><label>Nom exact de l’artiste<input name="artist-name" type="text" value="${escapeHtml(artist?.name || "")}" autocomplete="off"></label><div><button type="submit">Appliquer</button>${artistCorrections[video.id] ? '<button class="artist-reset" type="button">Revenir à la détection</button>' : ""}</div></form>
          <div class="artist-body"><p class="artist-status">${artist ? "Ce nom accompagnera le morceau. La fiche catalogue reste à vérifier au lancement." : "Vous pouvez préciser l’artiste ; le titre seul ne suffit pas à l’identifier."}</p></div>
        </section>
        <div class="feedback-row" aria-label="Retour sur cette proposition">
          <span>Cette piste :</span>
          <button data-feedback="not_now" type="button">Pas maintenant</button>
          <button data-feedback="too_obvious" type="button">Trop évidente</button>
          <button data-feedback="wrong_path" type="button">Mauvaise direction</button>
        </div>
        <div class="card-actions">
          <a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noreferrer">Regarder sur YouTube ↗</a>
          <button class="seed-button" type="button">Choisir ce départ</button>
          <span class="seed-library-badge">Dans votre bibliothèque</span>
        </div>
      </div>`;
    card.querySelector(".seed-button").dataset.seedId = `video:youtube:${video.id}`;
    card.querySelector(".seed-button").addEventListener("click", () => useVideoAsSeed(video));
    card.querySelector(".pin-button").addEventListener("click", () => {
      if (pinnedIds.has(video.id)) pinnedIds.delete(video.id);
      else pinnedIds.add(video.id);
      renderProgramme(currentProgramme, currentFiltersState, false);
    });
    card.querySelector(".reroll-card").addEventListener("click", () => rerollProgrammeCard(index));
    card.querySelector(".card-actions a").addEventListener("click", () => recordFeedback("opened", video.id, { origin: "programme", title: video.title }).catch(() => {}));
    for (const feedbackButton of card.querySelectorAll("[data-feedback]")) {
      feedbackButton.addEventListener("click", async () => {
        await recordFeedback(feedbackButton.dataset.feedback, video.id, { mission: currentSourceCharacter().preset || "custom", title: video.title });
        feedbackButton.textContent = "Noté ✓";
        rerollProgrammeCard(index);
      });
    }
    const correctionForm = card.querySelector(".artist-correction");
    card.querySelector(".artist-edit").addEventListener("click", () => {
      correctionForm.hidden = !correctionForm.hidden;
      if (!correctionForm.hidden) correctionForm.elements["artist-name"].focus();
    });
    correctionForm.addEventListener("submit", (event) => {
      event.preventDefault();
      updateArtistCorrection(video, correctionForm.elements["artist-name"].value);
    });
    correctionForm.querySelector(".artist-reset")?.addEventListener("click", () => updateArtistCorrection(video, ""));
    const extra = document.createElement("details"); extra.className = "suggestion-card-details";
    extra.append(Object.assign(document.createElement("summary"), { textContent: "Détails et options de cette suggestion" }));
    for (const node of card.querySelectorAll(".programme-role, .why, .playlist-tags, .description, .artist-panel, .feedback-row")) extra.append(node);
    card.querySelector(".card-actions").before(extra);
    nodes.videos.append(card);
    // Les recherches externes sont déclenchées par l’utilisateur : une composition
    // ne consomme donc pas silencieusement plusieurs requêtes de catalogue.
  }
  const reserve = renderReserve(programme);
  workspace?.syncSuggestionSelection([...programme, ...reserve].map(video => `video:youtube:${video.id}`));
  if (shouldScroll) nodes.results?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function renderReserve(programme) {
  const selected = new Set(programme.map(({ id }) => id));
  const reserve = sortMusic(currentRanked.filter(({ id }) => !selected.has(id)).map(video => ({ ...video, artist: resolvedArtist(video)?.name || "" })), document.querySelector("#seed-sort")?.value || "random", { shuffleKey: seedShuffleKey }).slice(0, 12);
  nodes.reservePanel.hidden = reserve.length === 0;
  nodes.reserveSummary.textContent = `${reserve.length} autres départs dans votre bibliothèque`;
  nodes.reserveList.replaceChildren();
  for (const video of reserve) {
    const row = document.createElement("article");
    const artist = resolvedArtist(video);
    row.innerHTML = `<div><p>Dans votre bibliothèque</p><h3>${escapeHtml(video.title)}</h3><span>${escapeHtml(artist?.name || video.channelTitle || "Artiste à identifier")}</span></div><div><button class="seed-button" type="button">Choisir ce départ</button><a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noreferrer">Écouter ↗</a></div>`;
    row.querySelector("button").dataset.seedId = `video:youtube:${video.id}`;
    row.querySelector("button").addEventListener("click", () => useVideoAsSeed(video));
    nodes.reserveList.append(row);
  }
  return reserve;
}

function currentFilters() {
  const character = currentSourceCharacter();
  return {
    maxDuration: document.querySelector("#max-duration").value,
    temperature: character.temperature,
    hideSeen: document.querySelector("#hide-seen").checked,
    seen,
    lenses: character.lenses
  };
}

function buildRanked(filters) {
  rerollCounter += 1;
  const rejected = new Set(Object.entries(feedback).filter(([, value]) => ["not_now", "too_obvious", "wrong_path"].includes(value?.kind)).map(([id]) => id));
  const usableLibrary = library.filter((video) => !rejected.has(video.id));
  const context = { exposureCounts: exposureCounts(), rerollKey: `${Date.now()}:${rerollCounter}` };
  return rankFreshDepartures(rankVideos(usableLibrary, filters, context), {
    history: presented, artistFor: video => resolvedArtist(video)?.name || "",
    avoidIds: currentProgramme.map(video => video.id),
    recentLimit: Math.min(80, Math.max(8, Math.floor(library.length * .25)))
  });
}

function composeSession({ scroll = true, preservePinned = true } = {}) {
  currentRanked = buildRanked(currentFiltersState);
  let programme = composeProgramme(currentRanked.slice(0, 4));
  if (preservePinned && currentProgramme.length && pinnedIds.size) {
    const selected = new Set();
    programme = currentProgramme.map((previous, index) => {
      if (pinnedIds.has(previous.id)) {
        selected.add(previous.id);
        return previous;
      }
      const candidate = currentRanked.find((video) => !selected.has(video.id) && !pinnedIds.has(video.id));
      if (!candidate) return previous;
      selected.add(candidate.id);
      return { ...candidate, role: previous.role || programme[index]?.role };
    });
  }
  if (!programme.length) {
    currentProgramme = [];
    nodes.resultHead.hidden = true;
    nodes.videos.replaceChildren();
    nodes.reserveList.replaceChildren();
    nodes.empty.hidden = false;
    nodes.empty.querySelector("p").textContent = "Aucune vidéo ne traverse ces contraintes. Élargissez la durée ou réaffichez les vidéos déjà vues.";
    return;
  }
  const previousIds = new Set(currentProgramme.map(({ id }) => id));
  currentProgramme = programme;
  markPresented(programme.filter(({ id }) => !previousIds.has(id)));
  renderProgramme(programme, currentFiltersState, scroll);
}

function rerollProgrammeCard(index) {
  const used = new Set(currentProgramme.map(({ id }) => id));
  currentRanked = buildRanked(currentFiltersState);
  const candidate = currentRanked.find((video) => !used.has(video.id));
  if (!candidate) return;
  const previous = currentProgramme[index];
  pinnedIds.delete(previous.id);
  currentProgramme[index] = { ...candidate, role: previous.role };
  markPresented([candidate]);
  renderProgramme(currentProgramme, currentFiltersState, false);
}

function compose(event) {
  event.preventDefault();
  currentFiltersState = currentFilters();
  pinnedIds.clear();
  currentProgramme = [];
  composeSession({ preservePinned: false });
}

function derivedPath(path) {
  const names = { label: "Label commun", credit: "Featuring ou remix", network: "Réseau local", similar: "Voisin musical", artist: "Même artiste" };
  return `<span><b>${escapeHtml(names[path.kind] || path.kind)}</b> · ${escapeHtml(path.sourceTitle)} → ${escapeHtml(String(path.detail || "").replaceAll("Même label", "Label relié au parcours"))}${path.source ? `<small>Source de la piste : ${escapeHtml(path.source)}</small>` : ""}</span>`;
}

function selectDerived(force = false) {
  const all = [...derivedPool.values()];
  if (!all.length) return [];
  const existing = force ? [] : currentDerivedIds.map((id) => derivedPool.get(id)).filter(Boolean);
  const used = new Set(existing.map(({ id }) => id));
  const old = new Set(currentDerivedIds);
  let sorted = rankDerivedCandidates(all, {
    limit: DERIVED_SIZE,
    exposureCounts: exposureCounts(),
    recentIds: recentPresentedIds(),
    excludeIds: force && all.length > DERIVED_SIZE ? old : used,
    rerollKey: `${compositionGeneration}:${derivedRerollCounter}`
  });
  let selected = [...existing, ...sorted].slice(0, DERIVED_SIZE);
  if (force && all.length > DERIVED_SIZE) {
    selected = sorted;
  } else if (force && selected.length < Math.min(DERIVED_SIZE, all.length)) {
    sorted = rankDerivedCandidates(all, { limit: DERIVED_SIZE, exposureCounts: exposureCounts(), recentIds: recentPresentedIds(), rerollKey: `${compositionGeneration}:${derivedRerollCounter}:fallback` });
    selected = sorted;
  }
  return selected;
}

function renderDerived(force = false) {
  if (Object.keys(activeDig.catalogueGroups || {}).length) {
    if (force) for (const group of Object.values(activeDig.catalogueGroups)) chooseCataloguePage(group, true);
    renderCatalogueGroups();
    return;
  }
  const selected = selectDerived(force);
  nodes.discoveries.hidden = selected.length === 0;
  if (!selected.length) return;
  const prior = new Set(currentDerivedIds);
  currentDerivedIds = selected.map(({ id }) => id);
  activeDig.derivedIds = [...currentDerivedIds];
  activeDig.derived = [...derivedPool.values()];
  activeDig.updatedAt = new Date().toISOString();
  // Derived results live only in this tab's current departure.
  markPresented(selected.filter(({ id }) => !prior.has(id)));
  nodes.derivedVideos.replaceChildren();
  for (const [index, video] of selected.entries()) {
    const card = document.createElement("article");
    card.className = "derived-card";
    card.innerHTML = `
      <a class="derived-thumb" href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noreferrer"><img src="${safeThumbnail(video.thumbnail, video.id)}" alt="Miniature de ${escapeHtml(video.title)}" loading="lazy"><span>Hors playlist</span></a>
      <div class="derived-copy"><p class="video-meta">${escapeHtml(String(video.publishedAt || "").slice(0, 10) || "Date inconnue")}</p><h3>${escapeHtml(video.title)}</h3><p class="channel">${escapeHtml(video.channelTitle || "Chaîne inconnue")}</p><p class="path-heading">Pourquoi cette piste ?</p><div class="discovery-paths">${video.paths.slice(0, 3).map(derivedPath).join("")}</div><div class="card-actions"><a href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noreferrer">Écouter sur YouTube ↗</a><button class="seed-button" type="button">Creuser ici</button><button class="keep-button" type="button">${notebookHas(video.id) ? "Gardée ✓" : "Garder"}</button><button class="reroll-derived" type="button">Autre piste ↻</button></div></div>`;
    card.querySelector(".keep-button").addEventListener("click", (event) => toggleNotebook(video, "dérivée", event.currentTarget));
    card.querySelector(".seed-button").addEventListener("click", () => useVideoAsSeed(video));
    card.querySelector(".reroll-derived").addEventListener("click", () => rerollDerivedCard(index));
    nodes.derivedVideos.append(card);
  }
}

function rerollDerivedCard(index) {
  const used = new Set(currentDerivedIds);
  derivedRerollCounter += 1;
  const candidate = rankDerivedCandidates([...derivedPool.values()], {
    limit: 1,
    exposureCounts: exposureCounts(),
    recentIds: recentPresentedIds(),
    excludeIds: used,
    rerollKey: `${compositionGeneration}:card:${derivedRerollCounter}`
  })[0];
  if (!candidate) return;
  currentDerivedIds[index] = candidate.id;
  markPresented([candidate]);
  renderDerived();
}

const MISSIONS = {
  fresh: { label: "Récentes dans mes playlists", summary: "Publications déjà importées, classées des plus récentes aux plus anciennes, sans prétendre couvrir toutes les sorties.", lenses: ["fresh"], temperature: 0 },
  network: { label: "Connexions", summary: "Featurings et remixes explicitement crédités, puis croisements entre playlists.", lenses: ["network", "crossroads"], temperature: 20 },
  archive: { label: "Archives profondes", summary: "Ajouts anciens et peu vus, avec une faible variation entre les relances.", lenses: ["forgotten", "deep-cut"], temperature: 15 },
  surprise: { label: "Décentrer", summary: "Chaînes rares dans votre sélection et forte variation à chaque relance.", lenses: ["off-center", "wildcard"], temperature: 100 }
};

const SOURCE_LENS_IDS = new Set(LENSES.map(({ id }) => id));

function normalizedSourceCharacter(input = {}) {
  return createSourceCharacterPatch(input, {
    lensIds: [...SOURCE_LENS_IDS],
    presets: MISSIONS,
    defaultPreset: "archive"
  });
}

function sameLensSet(left = [], right = []) {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function matchingSourcePreset(state) {
  return sourceCharacterPresetMatch(state, MISSIONS);
}

function loadSourceCharacterPatch() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(SOURCE_CHARACTER_KEY) || "null"); } catch {}
  return normalizedSourceCharacter(raw || { preset: currentMission });
}

function persistSourceCharacterPatch() {
  sourceCharacterState = normalizedSourceCharacter(sourceCharacterState || { preset: currentMission });
  try { localStorage.setItem(SOURCE_CHARACTER_KEY, JSON.stringify(sourceCharacterState)); } catch {}
  return sourceCharacterState;
}

function currentSourceCharacter() {
  if (!sourceCharacterState) {
    const mission = MISSIONS[currentMission] || MISSIONS.archive;
    sourceCharacterState = normalizedSourceCharacter({ preset: currentMission, lenses: mission.lenses, temperature: mission.temperature });
  }
  return normalizedSourceCharacter(sourceCharacterState);
}

function sourceCharacterLabel() {
  const state = currentSourceCharacter();
  return state.preset && MISSIONS[state.preset] ? MISSIONS[state.preset].label : "Réglage personnalisé";
}

function sourceCharacterSummary() {
  const state = currentSourceCharacter();
  if (state.preset && MISSIONS[state.preset]) return `${MISSIONS[state.preset].label} : ${MISSIONS[state.preset].summary}`;
  const labels = state.lenses.map(id => LENSES.find(lens => lens.id === id)?.label || id);
  return `Personnalisé : ${labels.length ? labels.join(" · ") : "aucune lentille"} · température ${state.temperature}.`;
}

function syncSourceCharacterUi() {
  const state = currentSourceCharacter();

  for (const button of document.querySelectorAll("[data-mission]")) {
    const active = Boolean(state.preset && button.dataset.mission === state.preset);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  for (const input of nodes.sourceCharacterLenses?.querySelectorAll("input[data-source-lens]") || []) {
    input.checked = state.lenses.includes(input.dataset.sourceLens);
  }

  if (sourceTemperatureDial) sourceTemperatureDial.set(state.temperature);
  else {
    if (nodes.sourceTemperature) nodes.sourceTemperature.value = String(state.temperature);
    if (nodes.sourceTemperatureValue) nodes.sourceTemperatureValue.textContent = String(state.temperature);
  }
  if (nodes.sourceCharacterBank) nodes.sourceCharacterBank.dataset.preset = state.preset || "custom";
  nodes.missionSummary.textContent = sourceCharacterSummary();
  nodes.composeLabel.textContent = "Me proposer quatre morceaux";
}

function renderSourceCharacterControls() {
  if (!nodes.sourceCharacterLenses) return;
  nodes.sourceCharacterLenses.replaceChildren();

  for (const lens of LENSES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const body = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("small");

    input.type = "checkbox";
    input.dataset.sourceLens = lens.id;
    title.textContent = lens.label;
    description.textContent = lens.description;
    body.append(title, description);
    label.append(input, body);
    nodes.sourceCharacterLenses.append(label);
  }

  if (!sourceTemperatureDial && nodes.sourceTemperature) {
    sourceTemperatureDial = enhanceScoutDial(nodes.sourceTemperature, {
      output: nodes.sourceTemperatureValue,
      defaultValue: 15,
      format: value => String(Math.round(value)),
      onChange: () => setSourceCharacterFromUi()
    });
  }

  syncSourceCharacterUi();
}

function setSourceCharacterFromUi() {
  const lenses = [...(nodes.sourceCharacterLenses?.querySelectorAll("input[data-source-lens]:checked") || [])].map(input => input.dataset.sourceLens);
  const temperature = Number(nodes.sourceTemperature?.value || 0);
  const next = normalizedSourceCharacter({ lenses, temperature });
  const preset = matchingSourcePreset(next);
  sourceCharacterState = { ...next, preset };

  if (preset) currentMission = preset;
  persistSourceCharacterPatch();
  syncSourceCharacterUi();
  if (library.length && currentProgramme.length) {
    currentFiltersState = currentFilters();
    composeSession({ scroll: false });
  }
}


function renderRuntimeStatus(status) {
  const capabilities = status.capabilities || {};
  const ready = ["youtube", "musicbrainz", "wikidata", "listenbrainz"].filter((source) => capabilities[source]);
  const optional = ["discogs", "applemusic", "spotify", "soundcloud"].filter((source) => capabilities[source]);
  const mismatch = status.version !== CLIENT_VERSION;
  nodes.runtimeStatus.classList.toggle("warning", mismatch);
  nodes.runtimeStatus.innerHTML = `<strong>Scout ${escapeHtml(status.version || "inconnu")}</strong><span>${mismatch ? `Interface ${CLIENT_VERSION} / serveur ${escapeHtml(status.version || "inconnu")} : redémarrage requis` : "interface et serveur alignés"}</span><span>Socle : ${escapeHtml(ready.join(" · "))}</span><span>Optionnelles actives : ${escapeHtml(optional.join(" · ") || "aucune")}</span><span>Graphe : ${Number(status.graph?.entities || 0)} entités · ${Number(status.graph?.edges || 0)} liens</span>`;
}

function renderDiscogsCredential(status) {
  const source = status.discogsCredentialSource || "none";
  const labels = {
    local_file: "jeton mémorisé sur cette machine",
    environment: "configuré au lancement",
    none: "non configuré"
  };
  nodes.discogsState.textContent = labels[source] || labels.none;
  nodes.discogsState.classList.toggle("configured", source !== "none");
  nodes.removeDiscogsToken.hidden = source !== "local_file";
  nodes.saveDiscogsToken.disabled = source === "environment";
  nodes.discogsToken.disabled = source === "environment";
  nodes.discogsToken.placeholder = source === "environment"
    ? "Géré par DISCOGS_TOKEN au lancement"
    : source === "local_file" ? "Jeton local enregistré — valeur masquée" : "Collez votre jeton personnel";
  if (source === "local_file") nodes.discogsTokenMessage.textContent = "Persistant après redémarrage · fichier local non chiffré, permissions 0600.";
  else if (source === "environment") nodes.discogsTokenMessage.textContent = "Le jeton actif vient de l’environnement du serveur et n’est pas modifiable ici.";
  else nodes.discogsTokenMessage.textContent = "Le jeton ne sera ni stocké dans le navigateur, ni renvoyé par l’API locale.";
}

async function refreshRuntimeStatus() {
  const response = await fetch("/api/status");
  if (!response.ok) throw new Error("Le serveur local ne répond pas.");
  const status = await response.json();
  renderRuntimeStatus(status);
  renderDiscogsCredential(status);
  return status;
}

async function saveDiscogsCredential() {
  const token = nodes.discogsToken.value.trim();
  if (!token) {
    nodes.discogsTokenMessage.textContent = "Collez d’abord le jeton créé dans les paramètres développeur Discogs.";
    nodes.discogsToken.focus();
    return;
  }
  nodes.saveDiscogsToken.disabled = true;
  nodes.discogsTokenMessage.textContent = "Vérification auprès de Discogs…";
  try {
    const response = await fetch("/api/settings/discogs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Le jeton n’a pas pu être enregistré.");
    nodes.discogsToken.value = "";
    await refreshRuntimeStatus();
    nodes.discogsTokenMessage.textContent = `Jeton vérifié${data.account?.username ? ` pour ${data.account.username}` : ""} et enregistré sur cette machine ✓`;
    nodes.discogsState.textContent = "Jeton vérifié et mémorisé ✓";
    nodes.discogsSettings.open = false;
  } catch (error) {
    nodes.discogsTokenMessage.textContent = error.message;
    nodes.saveDiscogsToken.disabled = false;
  }
}

async function removeDiscogsCredential() {
  if (!confirm("Supprimer le jeton Discogs enregistré sur cette machine ?")) return;
  nodes.removeDiscogsToken.disabled = true;
  try {
    const response = await fetch("/api/settings/discogs", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Le jeton n’a pas pu être supprimé.");
    await refreshRuntimeStatus();
    nodes.discogsTokenMessage.textContent = "Jeton local supprimé.";
  } catch (error) {
    nodes.discogsTokenMessage.textContent = error.message;
    nodes.removeDiscogsToken.disabled = false;
  }
}

function applyMission(name, button) {
  const mission = MISSIONS[name];
  if (!mission) return;
  currentMission = name;
  sourceCharacterState = { preset: name, lenses: [...mission.lenses], temperature: mission.temperature };
  sourceCharacterState = normalizedSourceCharacter(sourceCharacterState);
  persistSourceCharacterPatch();
  syncSourceCharacterUi();
  if (library.length && currentProgramme.length) {
    currentFiltersState = currentFilters();
    composeSession({ scroll: false });
  }
}

async function init() {
  const picker = document.querySelector("#departure-picker");
  picker.append(document.querySelector("#suggestion-picker"));
  picker.before(nodes.activeSeed, document.querySelector("#seed-action"));
  nodes.discoveries.after(nodes.collaborations);
  document.querySelector("#collaborations-title").textContent = "Collaborateurs à explorer";
  nodes.collaborations.querySelector(".step").textContent = "Autour de votre départ";
  nodes.activeSeedDossier.parentElement.insertBefore(Object.assign(document.createElement("details"), { className: "source-details" }), nodes.activeSeedDossier);
  const sourceDetails = nodes.activeSeed.querySelector(".source-details");
  sourceDetails.append(Object.assign(document.createElement("summary"), { textContent: "Sources et identification" }), nodes.activeSeedDossier);
  document.querySelector("#source-body")?.append(nodes.clearLibrary);
  workspace = mountWorkspace({
    getState: () => ({ seed: activeDig.seed, front: explorationSession, groups: activeDig.catalogueGroups || {}, activeDirection: activeDig.activeDirection, notebookCount: notebook.length, libraryCount: library.length, playlistCount: playlists.length, busy: activeDig.dossier?.state === "loading" || Object.values(activeDig.catalogueGroups || {}).some(group => group.loading) }),
    onStart: seed => openExploration({ seed, configure: true }),
    onSortNotebook: renderNotebook,
    onSortSuggestions: ({ shuffleKey } = {}) => {
      if (shuffleKey !== undefined) seedShuffleKey = shuffleKey;
      if (currentProgramme.length && currentFiltersState) renderProgramme(currentProgramme, currentFiltersState, false);
    },
    onSuggest: ({ shuffleKey } = {}) => {
      if (shuffleKey !== undefined) seedShuffleKey = shuffleKey;
      if (!library.length) return;
      currentFiltersState = currentFilters();
      composeSession({ scroll: false });
    }
  });
  seedShuffleKey = workspace.getSeedShuffleKey();
  const accessBanner = document.createElement("aside");
  accessBanner.className = "workspace-access-banner";
  accessBanner.id = "workspace-access-banner";
  accessBanner.hidden = true;
  accessBanner.setAttribute("role", "status");
  accessBanner.innerHTML = '<span></span><a href="#source-panel">Vérifier l’accès YouTube →</a>';
  document.querySelector(".workspace-topbar").after(accessBanner);
  const memoryNotice = document.createElement("p");
  memoryNotice.className = "branch-empty";
  memoryNotice.textContent = "Fouille éphémère : chaque départ repart à neuf. Bibliothèque, carnet, corrections et réglages conservés ; résultats non repris après rechargement.";
  document.querySelector(".workspace-topbar").after(memoryNotice);
  await refreshRuntimeStatus();
  bindCatalogueTools({ fetcher: fetch, onImported: async () => {
    await refreshExplorationGraph(activeDig.seed?.id || "");
    if (explorationSession) {
      explorationSession = createExplorationSession({ state: explorationGraph, seed: explorationSession.seed, directions: explorationSession.directions, depth: explorationSession.depth, previous: explorationSession, coverage: explorationSession.coverage, rerollKey: "bandcamp-import" });
      renderExplorationSession();
      await persistExplorationSession();
    }
  } });
  initializeExplorationDirections();
  sourceCharacterState = loadSourceCharacterPatch();
  if (sourceCharacterState.preset) currentMission = sourceCharacterState.preset;
  persistSourceCharacterPatch();
  renderSourceCharacterControls();

  const config = loadConfig();
  nodes.clientId.value = localStorage.getItem(CLIENT_ID_KEY) || config.clientId || "";
  if (nodes.clientId.value) persistClientId();
  nodes.apiKey.value = config.apiKey || "";
  connectionPanel = createConnectionPanel({
    renewable: true,
    googleProvider: waitForGoogle,
    onStatus: status => {
      accessBanner.hidden = !["expired", "unavailable", "error", "renewing"].includes(status.oauth);
      accessBanner.querySelector("span").textContent = `${status.message}. Vos playlists importées, le carnet et le parcours restent disponibles localement.`;
    },
    onToken: (value, expiry) => { accessToken = value; tokenExpiresAt = expiry; },
    onOwnedPlaylists: loadOwnedPlaylists,
    onMessage: setSourceMessage
  });
  saveConfig();
  library = await readCachedLibrary().catch(() => []);
  const syncState = await readSyncState("youtube-library").catch(() => null);
  if (syncState?.at) nodes.librarySync.textContent = syncState.entriesRead !== undefined ? importSummary(syncState) : `Dernière synchro ${new Date(syncState.at).toLocaleString("fr-FR")} · ${library.length} vidéos en cache`;
  if (syncState?.playlists?.length) {
    mergePlaylists(syncState.playlists);
    const selected = new Set(syncState.selectedPlaylistIds || []);
    for (const input of nodes.playlists.querySelectorAll("input")) input.checked = selected.has(input.value);
    updatePlaylistSelectionSummary();
  }
  const pendingImport = await readSyncState("youtube-import-progress").catch(() => null);
  const resumeButton = document.querySelector("#import-resume");
  if (resumeButton && pendingImport?.pagesRead && pendingImport.phase !== "limited") {
    resumeButton.hidden = false;
    resumeButton.textContent = `Reprendre l’import (${pendingImport.pagesRead} pages enregistrées)`;
  }
  updateLibraryState();
  renderNotebook();
  await refreshExplorationGraph().catch(error => workspace?.notify(error.message, { error: true }));
  await restoreExplorationSession();
  renderRecoveryAction();
  renderCollaborationAtlas();
  workspace.update();
  // Verify saved credentials without blocking local exploration or opening Google.
  void connectionPanel.restore().then(connected => {
    if (connected && !playlists.length) return loadOwnedPlaylists();
  });
}

nodes.connect.addEventListener("click", connectYouTube);
nodes.saveClientId.addEventListener("click", () => persistClientId({ announce: true }));
nodes.clientId.addEventListener("change", () => persistClientId());
nodes.saveDiscogsToken.addEventListener("click", saveDiscogsCredential);
nodes.removeDiscogsToken.addEventListener("click", removeDiscogsCredential);
nodes.disconnect.addEventListener("click", disconnectLocally);
nodes.inspectUrls.addEventListener("click", inspectPlaylistUrls);
nodes.importPlaylists.addEventListener("click", importSelectedPlaylists);
nodes.selectAll = document.querySelector("#select-all");
nodes.selectNone = document.querySelector("#select-none");
nodes.selectAll.addEventListener("click", () => { nodes.playlists.querySelectorAll("input").forEach((input) => { input.checked = true; }); updatePlaylistSelectionSummary(); });
nodes.selectNone.addEventListener("click", () => { nodes.playlists.querySelectorAll("input").forEach((input) => { input.checked = false; }); updatePlaylistSelectionSummary(); });
nodes.playlists.addEventListener("change", updatePlaylistSelectionSummary);
nodes.form.addEventListener("submit", compose);
nodes.rerollProgramme.addEventListener("click", () => {
  if (!currentFiltersState) return;
  composeSession({ scroll: false, preservePinned: true });
});
nodes.rerollDiscoveries.addEventListener("click", async () => {
  derivedRerollCounter += 1;
  renderDerived(true);
  for (const [direction, group] of Object.entries(activeDig.catalogueGroups || {})) if (!group.selectedIds.length && group.coverage?.hasMore) await loadCatalogueDirection(direction, { more: true });
  await persistExplorationSession().catch(error => { nodes.explorationState.textContent = error.message; });
});
document.querySelector("#discovery-focus")?.addEventListener("change", () => {
  activeDig.discoveryFocus = document.querySelector("#discovery-focus").value;
  for (const group of Object.values(activeDig.catalogueGroups || {})) chooseCataloguePage(group);
  renderCatalogueGroups();
  persistExplorationSession().catch(error => { nodes.explorationState.textContent = error.message; });
});
nodes.seedType.addEventListener("change", () => renderSeedOptions());
document.querySelector("#seed-search").addEventListener("input", () => renderSeedOptions());
nodes.seedSelect.addEventListener("change", renderSeedMetrics);
nodes.explorationDepth.addEventListener("change", renderSeedMetrics);
nodes.explorationDirections.addEventListener("change", renderSeedMetrics);
nodes.startExploration.addEventListener("click", () => openExploration().catch((error) => { nodes.explorationState.textContent = error.message; }));
nodes.refreshExploration.addEventListener("click", () => {
  if (!explorationSession) return;
  openExploration({ seed: explorationSession.seed, preserveLineage: true }).catch((error) => { nodes.explorationState.textContent = error.message; });
});
nodes.explorationResume.addEventListener("click", async (event) => {
  if (!event.target.closest("[data-reroll-all]") || !explorationSession) return;
  for (const branch of explorationSession.branches) explorationSession = rerollExplorationBranch(explorationSession, branch.id, new Date().toISOString(), { state: explorationGraph, rerollKey: `${Date.now()}:${branch.id}` });
  for (const [direction, group] of Object.entries(activeDig.catalogueGroups || {})) {
    chooseCataloguePage(group, true);
    if (!group.selectedIds.length && group.coverage?.hasMore) await loadCatalogueDirection(direction, { more: true });
  }
  renderCatalogueGroups();
  await persistExplorationSession().catch((error) => { nodes.explorationState.textContent = error.message; });
  renderExplorationSession();
});
nodes.explorationBranches.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !explorationSession) return;
  const branchId = button.dataset.branch;
  if (button.dataset.action === "continue") {
    const continued = continueFromBranch({ state: explorationGraph, session: explorationSession, branchId, rerollKey: `${Date.now()}` });
    await openExploration({ seed: continued.seed, lineage: continued.lineage });
    return;
  } else if (button.dataset.action === "enrich") {
    const direction = explorationSession.branches.find(branch => branch.id === branchId)?.direction;
    if (direction) await exploreWorkspaceDirection(direction, { explore: true });
    return;
  } else if (button.dataset.action === "reroll") {
    explorationSession = rerollExplorationBranch(explorationSession, branchId, new Date().toISOString(), { state: explorationGraph, rerollKey: `${Date.now()}:${branchId}` });
    const direction = explorationSession.branches.find(branch => branch.id === branchId)?.direction;
    const group = activeDig.catalogueGroups?.[direction];
    if (group) { chooseCataloguePage(group, true); renderCatalogueGroups(); }
  } else {
    explorationSession = setExplorationBranchStatus(explorationSession, branchId, button.dataset.action);
  }
  await persistExplorationSession().catch((error) => { nodes.explorationState.textContent = error.message; });
  renderExplorationSession();
});
nodes.clearExploration.addEventListener("click", async () => {
  if (!confirm("Fermer cette fouille éphémère ? Votre bibliothèque et vos choix personnels restent conservés.")) return;
  resetDiscoveries();
  explorationSession = null;
  activeDig = { schemaVersion: 2, id: "", seed: null, front: null, dossier: null, catalogueGroups: {}, navigationStack: [], derived: [], derivedIds: [], collaborationArtist: "", history: [], createdAt: "", updatedAt: new Date().toISOString(), closed: true };
  await explorationSaveQueue.catch(() => {});
  await explorationTransport.close();
  renderExplorationSession();
  renderActiveSeed();
  renderCollaborationAtlas();
});
nodes.clearLibrary.addEventListener("click", async () => {
  if (!confirm("Effacer les métadonnées de playlists et l’historique local du Scout ?")) return;
  library = [];
  seen = [];
  presented = {};
  artistCorrections = {};
  currentProgramme = [];
  resetDiscoveries();
  saveSeen();
  saveLocalObject(PRESENTED_KEY, presented);
  saveLocalObject(CORRECTIONS_KEY, artistCorrections);
  await clearCachedLibrary().catch(() => {});
  updateLibraryState();
  nodes.resultHead.hidden = true;
  nodes.videos.replaceChildren();
  nodes.empty.hidden = false;
  nodes.empty.querySelector("p").textContent = "Importez des playlists pour composer votre première session.";
});
nodes.clientId.addEventListener("input", () => {
  const stored = localStorage.getItem(CLIENT_ID_KEY) || "";
  nodes.clientIdState.textContent = nodes.clientId.value.trim() === stored && validClientId(stored) ? "Enregistré dans ce navigateur ✓" : "Modifié — cliquez pour enregistrer";
});
nodes.apiKey.addEventListener("change", saveConfig);
nodes.toggleSources.addEventListener("click", () => {
  nodes.sourceBody.hidden = !nodes.sourceBody.hidden;
  nodes.sourceBody.dataset.userExpanded = nodes.sourceBody.hidden ? "false" : "true";
  nodes.sourcePanel.classList.toggle("source-ready", nodes.sourceBody.hidden && library.length > 0);
  nodes.toggleSources.textContent = nodes.sourceBody.hidden ? "Gérer les sources" : "Masquer la configuration";
});
for (const button of document.querySelectorAll("[data-mission]")) button.addEventListener("click", () => applyMission(button.dataset.mission, button));
nodes.sourceCharacterLenses?.addEventListener("change", event => {
  if (!event.target.closest("input[data-source-lens]")) return;
  setSourceCharacterFromUi();
});
nodes.exportNotebook.addEventListener("click", exportNotebook);
document.querySelector("#export-backup")?.addEventListener("click", exportBackup);
document.querySelector("#restore-backup")?.addEventListener("change", restoreBackup);
document.querySelector("#import-resume")?.addEventListener("click", () => resumeLibraryImport().catch((error) => setSourceMessage(error.message, "error")));

window.addEventListener("unhandledrejection", event => {
  workspace?.notify(event.reason?.message || "L’action a échoué. Vos données conservées ne sont pas effacées.", { error: true });
});
init().catch((error) => { setSourceMessage(error.message, "error"); workspace?.notify(error.message, { error: true }); });
