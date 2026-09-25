const FORMAT = "youtube-scout-backup";
export const LIBRARY_LIMIT = 5000;
export const NOTEBOOK_STATUSES = Object.freeze({ listen: "À écouter", explore: "À creuser", kept: "Gardées" });
const LOCAL_FIELDS = ["seen", "presented", "artistCorrections", "feedback", "bandcampProfiles", "discogsArtists", "activeDig", "sourceCharacter", "explorationSettings"];
const SECRET_FIELD = /^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|client[_-]?secret|client[_-]?id|discogs[_-]?token|authorization|cookie|password|credentials?|config)$/i;

function object(value) { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function text(value, limit = 2000) { return String(value || "").slice(0, limit); }

export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
    for (const key of [...url.searchParams.keys()]) if (SECRET_FIELD.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return ""; }
}

// Backups explicitly omit configuration and credentials, including nested API fields.
export function withoutCredentials(value, depth = 0) {
  if (depth > 35) throw new Error("Sauvegarde trop profondément imbriquée.");
  if (Array.isArray(value)) return value.map((item) => withoutCredentials(item, depth + 1));
  if (object(value)) {
    const result = {};
    for (const [key, item] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Clé interdite dans la sauvegarde.");
      if (SECRET_FIELD.test(key)) continue;
      result[key] = /(?:url|href)$/i.test(key) && typeof item === "string" ? safeExternalUrl(item) : withoutCredentials(item, depth + 1);
    }
    return result;
  }
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return safeExternalUrl(value);
  return value;
}

export function normalizeNotebookItem(item) {
  const id = text(item?.id, 240);
  if (!id) throw new Error("Une piste du carnet n’a pas d’identifiant.");
  const isVideo = /^[A-Za-z0-9_-]{6,20}$/.test(id);
  const url = safeExternalUrl(item.url || item.listen?.url || item.sourceUrl) || (isVideo ? `https://www.youtube.com/watch?v=${encodeURIComponent(id)}` : "");
  return {
    id, title: text(item.title || item.label || "Piste sans titre"),
    artist: text(item.artist || "", 500), channelTitle: text(item.channelTitle || "", 500),
    origin: text(item.origin || "playlist", 80), url,
    dates: Object.fromEntries(["original", "firstReleaseDate", "releaseDate", "release", "reissue"].filter(key => /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(String(item.dates?.[key] || ""))).map(key => [key, String(item.dates[key])]).concat(item.dates?.isReissue ? [["isReissue", true]] : [])),
    releaseDate: /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(String(item.releaseDate || "")) ? String(item.releaseDate) : "",
    listenKind: text(item.listenKind || item.listen?.kind || (url.includes("youtube.com/watch?") ? "video" : "source"), 60),
    status: Object.hasOwn(NOTEBOOK_STATUSES, item.status) ? item.status : "kept",
    note: text(item.note, 4000), addedAt: text(item.addedAt || new Date().toISOString(), 40),
    updatedAt: text(item.updatedAt || item.addedAt || new Date().toISOString(), 40),
    provenance: withoutCredentials(item.provenance || { sourceUrl: safeExternalUrl(item.sourceUrl), paths: item.paths || (item.path ? [{ steps: item.path }] : []) })
  };
}

export function importSelectionKey(selected) { return selected.map(({ id }) => id).sort().join("|"); }

export function createImportCheckpoint(selected, at = new Date().toISOString()) {
  return {
    schemaVersion: 1, selectionKey: importSelectionKey(selected), startedAt: at, updatedAt: at,
    phase: "pages", pagesRead: 0, entriesRead: 0, duplicates: 0, entriesWithoutId: 0, pendingEnrichment: [], videos: [],
    states: selected.map((playlist) => ({ playlist: structuredClone(playlist), pageToken: "", pendingItems: [], done: false, pages: 0 }))
  };
}

export function reusableImportCheckpoint(value, selected, now = Date.now()) {
  return Boolean(value?.schemaVersion === 1 && value.selectionKey === importSelectionKey(selected)
    && ["pages", "details", "limited"].includes(value.phase)
    && now - Date.parse(value.updatedAt) < 7 * 24 * 60 * 60 * 1000
    && Array.isArray(value.states) && Array.isArray(value.videos));
}

export async function scanImportPages(checkpoint, { fetchPage, mergeItem, saveCheckpoint, limit = LIBRARY_LIMIT, concurrency = 4 }) {
  const videoMap = new Map(checkpoint.videos.map((video) => [video.id, video]));
  const save = async () => {
    checkpoint.videos = [...videoMap.values()];
    checkpoint.updatedAt = new Date().toISOString();
    await saveCheckpoint(checkpoint);
  };
  const consume = (state, items) => {
    state.pendingItems = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (id && !videoMap.has(id) && videoMap.size >= limit) {
        state.pendingItems = items.slice(index);
        break;
      }
      if (!id) checkpoint.entriesWithoutId = (checkpoint.entriesWithoutId || 0) + 1;
      else if (videoMap.has(id)) checkpoint.duplicates = (checkpoint.duplicates || 0) + 1;
      mergeItem(videoMap, item, state.playlist);
    }
    state.done = !state.pendingItems.length && !state.pageToken;
  };
  for (const state of checkpoint.states) if (state.pendingItems?.length) consume(state, state.pendingItems);
  while (checkpoint.states.some(({ done }) => !done) && videoMap.size < limit) {
    const round = checkpoint.states.filter(({ done }) => !done);
    for (let offset = 0; offset < round.length && videoMap.size < limit; offset += concurrency) {
      const group = round.slice(offset, offset + concurrency);
      const results = await Promise.allSettled(group.map((state) => fetchPage(state)));
      let error = null;
      results.forEach((result, index) => {
        const state = group[index];
        if (result.status === "rejected") { error ||= result.reason; return; }
        const data = result.value;
        if (!data || (data.items !== undefined && !Array.isArray(data.items))) { error ||= new Error("Page de playlist invalide. L’import reste reprenable."); return; }
        const requestedToken = state.pageToken || "";
        const previousTokens = state.visitedTokens || [];
        if (data.nextPageToken && (data.nextPageToken === requestedToken || previousTokens.includes(data.nextPageToken))) {
          error ||= new Error("YouTube a répété une page de playlist. Import interrompu sans effacer la bibliothèque ; réessayez plus tard.");
          return;
        }
        state.visitedTokens = [...previousTokens, requestedToken];
        checkpoint.pagesRead += 1;
        checkpoint.entriesRead += (data.items || []).length;
        state.pages += 1;
        state.pageToken = data.nextPageToken || "";
        consume(state, data.items || []);
      });
      await save();
      if (error) throw error;
    }
  }
  checkpoint.truncated = checkpoint.states.some(({ done }) => !done);
  checkpoint.phase = checkpoint.truncated ? "limited" : "details";
  await save();
  return videoMap;
}

export function finalizeLibraryImport(previous, incoming, { complete, selectedIds, limit = LIBRARY_LIMIT } = {}) {
  const old = new Map(previous.map((video) => [video.id, video]));
  const scanned = new Map(incoming.map((video) => [video.id, video]));
  const available = [...scanned.values()].filter((video) => video.title && !["deleted", "private", "unavailable"].includes(video.availability));
  // An incomplete scan cannot establish absence: keep every prior entry and update only observed videos.
  const result = complete ? new Map() : new Map(old);
  for (const video of available) {
    if (!result.has(video.id) && result.size >= limit) continue;
    const prior = !complete ? old.get(video.id) : null;
    result.set(video.id, prior ? { ...prior, ...video, playlistIds: [...new Set([...(prior.playlistIds || []), ...(video.playlistIds || [])])], playlistNames: [...new Set([...(prior.playlistNames || []), ...(video.playlistNames || [])])] } : video);
  }
  const selected = new Set(selectedIds || []);
  const removed = complete ? previous.filter(({ id }) => !result.has(id)) : [];
  const outOfSelection = removed.filter((video) => !scanned.has(video.id) && !(video.playlistIds || []).some((id) => selected.has(id))).length;
  const unavailable = [...scanned.values()].filter((video) => ["deleted", "private", "unavailable"].includes(video.availability)).length;
  const unavailableRemoved = removed.filter(({ id }) => scanned.has(id) && ["deleted", "private", "unavailable"].includes(scanned.get(id).availability)).length;
  const absentFromSelection = Math.max(0, removed.length - outOfSelection - unavailableRemoved);
  const videos = [...result.values()];
  return { videos, added: videos.filter(({ id }) => !old.has(id)).length, removed: removed.length, outOfSelection, unavailable, unavailableRemoved, absentFromSelection, retained: complete ? 0 : previous.length, omittedByLimit: Math.max(0, available.length - available.filter(({ id }) => result.has(id)).length) };
}

function requireArray(value, name, max) {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Sauvegarde invalide : ${name}.`);
  return value;
}

export function validateBackup(input) {
  if (!object(input) || input.format !== FORMAT || input.version !== 1) throw new Error("Ce fichier n’est pas une sauvegarde YouTube Scout compatible.");
  const value = withoutCredentials(input);
  requireArray(value.library, "bibliothèque (5 000 vidéos maximum)", LIBRARY_LIMIT);
  const ids = new Set();
  for (const video of value.library) {
    if (!object(video) || !/^[A-Za-z0-9_-]{6,20}$/.test(video.id || "") || typeof video.title !== "string" || ids.has(video.id)) throw new Error("Identifiant vidéo invalide ou en double dans la sauvegarde.");
    if (video.playlistIds !== undefined && (!Array.isArray(video.playlistIds) || video.playlistIds.some((id) => typeof id !== "string"))) throw new Error("Appartenance à une playlist invalide.");
    ids.add(video.id);
  }
  requireArray(value.notebook, "carnet", 5000);
  value.notebook = value.notebook.map(normalizeNotebookItem);
  if (!object(value.local) || !object(value.indexed) || !object(value.graph)) throw new Error("Sections locales de la sauvegarde manquantes.");
  for (const key of Object.keys(value.local)) if (!LOCAL_FIELDS.includes(key)) throw new Error(`Champ local non restaurable : ${key}.`);
  for (const key of LOCAL_FIELDS) {
    const item = value.local[key];
    if (item !== undefined && !(key === "seen" ? Array.isArray(item) && item.every((id) => typeof id === "string") : object(item))) throw new Error(`Format incorrect : ${key}.`);
  }
  const dig = value.local.activeDig;
  if (dig?.seed && (!dig.seed.id || !dig.front || !Array.isArray(dig.front.branches))) throw new Error("La session de fouille est incomplète.");
  if (dig?.seed && dig.seed.id !== dig.front?.seed?.id) throw new Error("La session et son parcours désignent des départs différents.");
  const sourceCharacter = value.local.sourceCharacter;
  if (sourceCharacter !== undefined) {
    if (Number(sourceCharacter.schemaVersion) !== 1) throw new Error("Version du patch SOURCE CHARACTER incompatible.");
    if (!Array.isArray(sourceCharacter.lenses) || sourceCharacter.lenses.length > 32 || sourceCharacter.lenses.some((id) => typeof id !== "string")) throw new Error("Lentilles SOURCE CHARACTER invalides.");
    if (!Number.isFinite(Number(sourceCharacter.temperature)) || Number(sourceCharacter.temperature) < 0 || Number(sourceCharacter.temperature) > 100) throw new Error("Température SOURCE CHARACTER invalide.");
    if (typeof sourceCharacter.preset !== "string") throw new Error("Preset SOURCE CHARACTER invalide.");
  }
  for (const key of ["entities", "sync"]) {
    requireArray(value.indexed[key], key, 30_000);
    for (const pair of value.indexed[key]) if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || !object(pair[1])) throw new Error(`Entrée ${key} invalide.`);
  }
  requireArray(value.indexed.events, "événements", 30_000);
  if (value.indexed.events.some((event) => !object(event) || typeof event.id !== "string")) throw new Error("Événement local invalide.");
  for (const key of ["entities", "claims", "edges"]) {
    requireArray(value.graph[key], `graphe ${key}`, 100_000);
    if (value.graph[key].some((item) => !object(item) || typeof item.id !== "string")) throw new Error(`Entrée du graphe ${key} invalide.`);
  }
  if (value.graph.entities.some((entity) => typeof entity.type !== "string")) throw new Error("Type d’entité du graphe manquant.");
  if (value.graph.claims.some((claim) => !claim.subject || !claim.field || !claim.source)) throw new Error("Provenance d’une affirmation du graphe manquante.");
  if (value.graph.edges.some((edge) => !edge.from || !edge.to || !edge.kind)) throw new Error("Relation du graphe incomplète.");
  requireArray(value.playlists || [], "playlists", 1000);
  if ((value.playlists || []).some((playlist) => !object(playlist) || typeof playlist.id !== "string" || typeof playlist.title !== "string")) throw new Error("Playlist invalide.");
  if (value.navigation !== undefined && !object(value.navigation)) throw new Error("Navigation invalide.");
  return value;
}

export function createBackup({ library = [], notebook = [], local = {}, indexed = {}, graph = {}, playlists = [], navigation = {} }, at = new Date().toISOString()) {
  return validateBackup({
    format: FORMAT, version: 1, exportedAt: at, library, notebook,
    local: Object.fromEntries(LOCAL_FIELDS.filter((key) => local[key] !== undefined).map((key) => [key, local[key]])),
    indexed: { entities: indexed.entities || [], events: indexed.events || [], sync: indexed.sync || [] },
    graph: Object.fromEntries(["entities", "claims", "edges"].map((key) => [key, Array.isArray(graph[key]) ? graph[key] : Object.values(graph[key] || {})])),
    playlists, navigation
  });
}
