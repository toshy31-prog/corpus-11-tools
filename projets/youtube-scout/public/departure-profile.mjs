import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";

export const DEPARTURE_PROFILE_SCHEMA_VERSION = 1;

export const DEPARTURE_KINDS = Object.freeze([
  "track",
  "artist",
  "label",
  "playlist"
]);

export const DEPARTURE_MODES = Object.freeze([
  "direct",
  "mediated",
  "aggregate",
  "not_applicable"
]);

export const DEPARTURE_IMPLEMENTATIONS = Object.freeze([
  "implemented",
  "implemented_local",
  "orchestration_gap",
  "source_gap",
  "not_applicable"
]);

const TRUSTED_IDENTITY = new Set([
  "confirmed_cross_id",
  "confirmed_user",
  "corroborated",
  "resolved",
  "observed",
  "user_supplied"
]);

const ROUTE_IDS = Object.freeze(SCOUT_DIRECTIONS.map(({ id }) => id));
const ROUTE_ID_SET = new Set(ROUTE_IDS);

const TYPE_FAMILY = Object.freeze({
  track: "track",
  video: "track",
  recording: "track",
  release: "track",
  release_group: "track",
  master: "track",
  artist: "artist",
  label: "label",
  playlist: "playlist"
});

const HEADLINES = Object.freeze({
  track: "MODE · MORCEAU · objet précis",
  artist: "MODE · ARTISTE · catalogue d’entité",
  label: "MODE · LABEL · catalogue éditorial",
  playlist: "MODE · PLAYLIST · analyse de corpus"
});

const BOOTSTRAPS = Object.freeze({
  track: "resolve_recording",
  artist: "resolve_artist",
  label: "open_label_catalogue",
  playlist: "analyse_playlist_members"
});

const STATIC_MATRIX = Object.freeze({
  track: Object.freeze({
    label:       ["mediated", "implemented",       "sortie → label",                       ["musicbrainz", "discogs"]],
    remix:       ["mediated", "implemented",       "recording → crédit remix/production",  ["musicbrainz", "discogs"]],
    featuring:   ["mediated", "implemented",       "recording → co-crédit explicite",      ["musicbrainz", "discogs"]],
    compilation: ["mediated", "implemented",       "recording → apparition/compilation",    ["musicbrainz", "discogs"]],
    alias:       ["mediated", "implemented",       "artiste → alias/projet",                ["musicbrainz", "discogs"]],
    curator:     ["direct",   "implemented",       "vidéo → chaîne YouTube",                ["youtube"]],
    scene:       ["mediated", "implemented",       "artiste → territoire documenté",        ["musicbrainz", "wikidata"]],
    era:         ["mediated", "implemented",       "sortie → date de sortie",               ["musicbrainz", "discogs"]]
  }),
  artist: Object.freeze({
    label:       ["direct",   "implemented",       "artiste → sorties → labels",             ["musicbrainz", "discogs"]],
    remix:       ["direct",   "implemented",       "artiste → crédits remix/production",     ["musicbrainz", "discogs"]],
    featuring:   ["direct",   "implemented",       "artiste → co-crédits explicites",        ["musicbrainz", "discogs"]],
    compilation: ["direct",   "implemented",       "artiste → apparitions/compilations",     ["musicbrainz", "discogs"]],
    alias:       ["direct",   "implemented",       "artiste → alias/groupes/projets",        ["musicbrainz", "discogs"]],
    curator:     ["mediated", "source_gap",        "artiste → vidéo exacte → chaîne",        ["youtube"]],
    scene:       ["direct",   "orchestration_gap", "artiste → territoire documenté",        ["musicbrainz", "wikidata"]],
    era:         ["aggregate","orchestration_gap", "discographie → dates de sortie",         ["musicbrainz", "discogs"]]
  }),
  label: Object.freeze({
    label:       ["direct",   "implemented",       "label → catalogue → autres artistes",    ["musicbrainz", "discogs"]],
    remix:       ["aggregate","orchestration_gap", "catalogue → sorties → remixeurs",        ["musicbrainz", "discogs"]],
    featuring:   ["aggregate","orchestration_gap", "catalogue → sorties → co-crédits",       ["musicbrainz", "discogs"]],
    compilation: ["aggregate","orchestration_gap", "catalogue → compilations/apparitions",   ["musicbrainz", "discogs"]],
    alias:       ["not_applicable","not_applicable","ALIAS décrit les identités d’artistes", []],
    curator:     ["mediated", "source_gap",        "catalogue → vidéo exacte → chaîne",      ["youtube"]],
    scene:       ["aggregate","orchestration_gap", "catalogue → artistes → territoires",     ["musicbrainz", "wikidata", "discogs"]],
    era:         ["aggregate","orchestration_gap", "catalogue → dates de sortie",             ["musicbrainz", "discogs"]]
  }),
  playlist: Object.freeze({
    label:       ["aggregate","orchestration_gap", "morceaux → sorties → labels",             ["musicbrainz", "discogs"]],
    remix:       ["aggregate","orchestration_gap", "morceaux → crédits → remixeurs",          ["musicbrainz", "discogs"]],
    featuring:   ["aggregate","orchestration_gap", "morceaux → co-crédits explicites",        ["musicbrainz", "discogs"]],
    compilation: ["aggregate","orchestration_gap", "morceaux → sorties/compilations",         ["musicbrainz", "discogs"]],
    alias:       ["aggregate","orchestration_gap", "morceaux → artistes → alias/projets",     ["musicbrainz", "discogs"]],
    curator:     ["aggregate","implemented_local", "morceaux → chaînes observées",            ["youtube_library"]],
    scene:       ["aggregate","orchestration_gap", "morceaux → artistes → territoires",       ["musicbrainz", "wikidata"]],
    era:         ["aggregate","orchestration_gap", "morceaux → dates de sortie",              ["musicbrainz", "discogs"]]
  })
});

function values(value) {
  return Array.isArray(value) ? value : Object.values(value || {});
}

function validProviderId(entity = {}) {
  const discogs = String(entity.externalIds?.discogs || "");
  const musicbrainz = String(entity.externalIds?.musicbrainz || "");
  return /^[1-9]\d*$/.test(discogs) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(musicbrainz);
}

function entityTypeFromSeed(seed = {}) {
  const explicit = String(seed.type || "").trim();
  if (explicit) return explicit;
  return String(seed.id || "").split(":")[0] || "track";
}

export function normalizeDepartureKind(seed = {}) {
  return TYPE_FAMILY[entityTypeFromSeed(seed)] || "track";
}

export function departureContext(seed = {}, graph = {}) {
  const seedId = String(seed.id || "");
  const entities = new Map(values(graph.entities).filter(Boolean).map(entity => [entity.id, entity]));
  const edges = values(graph.edges).filter(Boolean);
  const entity = entities.get(seedId) || seed;
  const neighbours = edges.filter(edge => edge.from === seedId || edge.to === seedId);
  const trustedNeighbourIds = neighbours
    .filter(edge => TRUSTED_IDENTITY.has(String(edge.status || "")) || !["probable_artist", "same_identity"].includes(edge.kind))
    .map(edge => edge.from === seedId ? edge.to : edge.from);
  const catalogueIdentity = validProviderId(entity) || trustedNeighbourIds.some(id => validProviderId(entities.get(id) || {}));
  const playlistMembers = neighbours.filter(edge => edge.kind === "included_in" && (
    entities.get(edge.from)?.type === "video" || entities.get(edge.to)?.type === "video"
  )).length;
  const videoAnchor = /^video:youtube:/.test(seedId) || entityTypeFromSeed(seed) === "video";
  return Object.freeze({
    catalogueIdentity,
    playlistMembers,
    videoAnchor
  });
}

function readiness(kind, routeId, implementation, context) {
  if (implementation === "not_applicable") return "not_applicable";
  if (implementation === "source_gap") return "source_gap";
  if (implementation === "orchestration_gap") return "needs_bootstrap";
  if (kind === "track" && routeId === "curator") return context.videoAnchor ? "ready" : "needs_bootstrap";
  if (kind === "playlist") return context.playlistMembers ? "ready" : "needs_bootstrap";
  if (kind === "artist" || kind === "label") return context.catalogueIdentity ? "ready" : "needs_identity";
  if (kind === "track") return context.catalogueIdentity ? "ready" : "needs_identity";
  return "ready";
}

function routeDefinition(kind, routeId, context) {
  const row = STATIC_MATRIX[kind]?.[routeId];
  if (!row) throw new Error(`Profil de départ manquant: ${kind} × ${routeId}`);
  const [mode, implementation, via, sources] = row;
  return Object.freeze({
    direction: routeId,
    mode,
    implementation,
    readiness: readiness(kind, routeId, implementation, context),
    via,
    sources: Object.freeze([...sources]),
    explicitDigOnly: true,
    evidenceAuthority: false,
    bootstrapCountsAsDepth: false,
    releaseDateEvidenceOnly: routeId === "era",
    loadable: !["not_applicable", "source_gap"].includes(implementation)
  });
}

export function createDepartureProfile(seed = {}, { graph = {} } = {}) {
  const kind = normalizeDepartureKind(seed);
  const context = departureContext(seed, graph);
  const routes = Object.fromEntries(ROUTE_IDS.map(id => [id, routeDefinition(kind, id, context)]));
  return Object.freeze({
    schemaVersion: DEPARTURE_PROFILE_SCHEMA_VERSION,
    kind,
    objectType: entityTypeFromSeed(seed),
    seedId: String(seed.id || ""),
    headline: HEADLINES[kind],
    bootstrap: BOOTSTRAPS[kind],
    context,
    routes: Object.freeze(routes)
  });
}

export function departureRoute(seed, direction, options = {}) {
  if (!ROUTE_ID_SET.has(direction)) return null;
  return createDepartureProfile(seed, options).routes[direction];
}

/**
 * Initial coverage is deliberately conservative.
 * "Direct" or "implemented" never means "already completely searched".
 */
export function departureCoverage(seed = {}, { graph = {} } = {}) {
  const profile = createDepartureProfile(seed, { graph });
  return Object.fromEntries(ROUTE_IDS.map(direction => {
    const route = profile.routes[direction];
    const pending = route.implementation === "orchestration_gap"
      ? [profile.bootstrap]
      : route.readiness === "needs_identity"
        ? ["catalogue_identity"]
        : route.readiness === "needs_bootstrap"
          ? [profile.bootstrap]
          : [];
    return [direction, {
      state: pending.length ? "partial" : "not_checked",
      complete: false,
      sources: [...route.sources],
      pending,
      departureMode: route.mode,
      departureImplementation: route.implementation,
      departureReadiness: route.readiness
    }];
  }));
}

export function departureMatrix() {
  return Object.fromEntries(DEPARTURE_KINDS.map(kind => [
    kind,
    Object.fromEntries(ROUTE_IDS.map(id => {
      const [mode, implementation, via, sources] = STATIC_MATRIX[kind][id];
      return [id, { mode, implementation, via, sources: [...sources] }];
    }))
  ]));
}
