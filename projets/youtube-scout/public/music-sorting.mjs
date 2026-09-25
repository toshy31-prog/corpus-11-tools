import { departureRoutingGraph } from "./departure-integrity.mjs";
import { splitArtistNames } from "./artist-names.mjs";
export const MUSIC_SORTS = Object.freeze([
  ["random", "Aléatoire"], ["explore", "Sélection équilibrée"], ["title", "Titre · 0–9, A–Z"], ["title-desc", "Titre · Z–A"],
  ["release-new", "Sortie musicale · récente d’abord"], ["release-old", "Sortie musicale · ancienne d’abord"],
  ["relation", "Pertinence du lien"], ["artist", "Artiste · A–Z"]
]);
const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const key = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/\s*\(\d+\)$/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function musicalReleaseDate(item = {}) {
  const d = item.dates || {};
  const description = String(item.description || "");
  const suppliedDate = /^Provided to YouTube by /m.test(description) ? description.match(/^Released on:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1] : "";
  const date = d.original || d.firstReleaseDate || item.originalReleaseDate || ((!d.isReissue && !d.reissue) ? d.releaseDate || d.release || item.releaseDate || suppliedDate : "");
  const value = String(date || "");
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1000 || (month !== undefined && (month < 1 || month > 12))) return "";
  if (day !== undefined && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return "";
  return value;
}
export function relationOrder(item = {}) {
  if (item.relationship?.distant) return 5;
  const direction = item.relatedVia || item.direction || item.relation;
  if (["remix", "featuring", "alias"].includes(direction)) return 0;
  if (direction === "compilation") return 1;
  if (direction === "label") return 2;
  if (direction === "curator") return 4;
  return 3;
}
// A shuffle is stable during rendering, pagination and filtering. Only an
// explicit reshuffle changes its key. No random comparator (not transitive).
export function shuffleRank(item, shuffleKey = "scout") {
  const value = `${shuffleKey}\u0000${item.id || item.title || item.label || ""}`;
  let hash = 2166136261;
  for (const character of value) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 16777619); }
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x7feb352d); hash ^= hash >>> 15;
  return hash >>> 0;
}
export function compareMusic(a, b, mode = "explore", { shuffleKey = "scout" } = {}) {
  if (mode === "random") return shuffleRank(a, shuffleKey) - shuffleRank(b, shuffleKey) || String(a.id || "").localeCompare(String(b.id || ""));
  if (mode === "explore") return 0;
  const title = item => item.title || item.label || "";
  if (mode === "title" || mode === "title-desc") return collator.compare(title(a), title(b)) * (mode === "title" ? 1 : -1);
  if (mode === "artist") {
    if (!a.artist || !b.artist) return Number(!a.artist) - Number(!b.artist);
    return collator.compare(a.artist, b.artist) || collator.compare(title(a), title(b));
  }
  if (mode.startsWith("release-")) {
    const left = musicalReleaseDate(a), right = musicalReleaseDate(b);
    if (!left || !right) return Number(!left) - Number(!right);
    return left.localeCompare(right) * (mode === "release-new" ? -1 : 1) || collator.compare(title(a), title(b));
  }
  if (mode === "relation") return relationOrder(a) - relationOrder(b) || (a.path?.length || 999) - (b.path?.length || 999);
  return 0;
}
export function sortMusic(items, mode, options) { return [...items].sort((a, b) => compareMusic(a, b, mode, options)); }

// Only documented artist links, not general neighbours (labels, collaborators).
export function departureArtistIds(graph = {}, seedId) {
  graph = departureRoutingGraph(graph);
  const entities = graph.entities || {}, edges = Object.values(graph.edges || {});
  const trusted = edge => ["resolved", "observed", "confirmed_user", "confirmed_cross_id", "corroborated", "user_supplied"].includes(edge.status);
  const targets = new Set([seedId]), artists = new Set(entities[seedId]?.type === "artist" ? [seedId] : []);
  for (const edge of edges) if (trusted(edge) && edge.from === seedId && edge.kind === "embodies") targets.add(edge.to);
  for (const edge of edges) {
    if (!trusted(edge)) continue;
    if (edge.kind === "probable_artist" && edge.status !== "observed" && targets.has(edge.from) && entities[edge.to]?.type === "artist") artists.add(edge.to);
    if (["credited_on", "credited_on_release", "primary_artist"].includes(edge.kind)) {
      if (targets.has(edge.to) && entities[edge.from]?.type === "artist") artists.add(edge.from);
      if (targets.has(edge.from) && entities[edge.to]?.type === "artist") artists.add(edge.to);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) if (edge.kind === "same_identity" && ["confirmed_user", "confirmed_cross_id", "corroborated"].includes(edge.status)) {
      for (const [from, to] of [[edge.from, edge.to], [edge.to, edge.from]]) if (artists.has(from) && !artists.has(to) && entities[to]?.type === "artist") { artists.add(to); changed = true; }
    }
  }
  return [...artists];
}

export function artistRelation(item, { artistIds = [], name = "" } = {}) {
  const sourceIds = new Set(artistIds.filter(Boolean)), ids = item.artistIds || [];
  // Known identical IDs always win over a spelling difference. Names here
  // only exclude a result from a view; they never merge graph identities.
  if (ids.some(id => sourceIds.has(id))) return ids.some(id => id && !sourceIds.has(id)) ? "collaboration" : "same";
  const sourceNames = splitArtistNames(name).map(key).filter(Boolean);
  const targetNames = splitArtistNames(item.artist).map(key).filter(n => n && !["artiste non renseigne", "unknown", "various artists", "artistes divers"].includes(n));
  if (sourceNames.some(n => targetNames.includes(n))) return targetNames.some(n => !sourceNames.includes(n)) ? "collaboration" : "same";
  if (sourceIds.size && ids.filter(Boolean).length) return "other";
  return sourceNames.length > 0 && targetNames.length > 0 ? "other" : "unknown";
}

export function isOtherArtist(item, reference = {}) {
  return artistRelation(item, reference) === "other";
}

// View/collection policy only: never assign artists or merge graph identities.
export function artistRelationAllowed(relation, { includeUnknownArtists = false, includeCollaborations = false } = {}) {
  return relation === "other" || (relation === "unknown" && includeUnknownArtists === true) || (relation === "collaboration" && includeCollaborations === true);
}
