import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { LENSES, PROGRAM_ROLES } from "./lib/scout.mjs";
import { artistNameMatch, buildArtistRegistryEntry, buildRecordingResolution, parseTrackCandidate, parseTrackCandidates } from "./lib/identity.mjs";
import { PersistentStore } from "./lib/persistent-store.mjs";
import { EphemeralExplorations } from "./lib/ephemeral-exploration.mjs";
import { personalGraph } from "./public/personal-memory.mjs";
import { SourceRuntime } from "./lib/source-runtime.mjs";
import { graphFromResolution, normalizeDiscoveryCandidates, summarizeGraph } from "./lib/graph.mjs";
import { LocalSecretFile, normalizeSecret } from "./lib/local-secret.mjs";
import { GoogleOAuthSession, googleOAuthConfiguration, GOOGLE_OAUTH_CALLBACK, GOOGLE_OAUTH_CLEAR_COOKIE } from "./lib/google-oauth.mjs";
import { compileAvailability } from "./lib/digging.mjs";
import { exploreCatalogueBranch, bandcampEvidenceGraph, createCatalogueEligibility } from "./lib/catalogue.mjs";
import { sanitizeExplorationGraph } from "./lib/exploration.mjs";
import { hydrateRecordingReleases } from "./lib/recording-discogs.mjs";
import { catalogueArtistChoices, catalogueArtistReference } from "./public/departure-workflow.mjs";
import { correctionDelta, departureRevision } from "./public/departure-integrity.mjs";
import {
  runtimeRecordingPlan,
  primaryRuntimeQuery,
  secondaryRuntimeQuery
} from "./lib/recording-resolution-runtime.mjs";
import {
  decideRuntimeRecording,
  applyRuntimeRecordingAuthority
} from "./lib/recording-resolution-decision.mjs";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));
const ENGINE = fileURLToPath(new URL("./lib/scout.mjs", import.meta.url));
const IDENTITY_ENGINE = fileURLToPath(new URL("./lib/identity.mjs", import.meta.url));
const DIGGING_ENGINE = fileURLToPath(new URL("./lib/digging.mjs", import.meta.url));
const EXPLORATION_ENGINE = fileURLToPath(new URL("./lib/exploration.mjs", import.meta.url));
const APP_VERSION = "0.20.1";
const PORT = Number(process.env.PORT || 4181);
const googleOAuth = await new GoogleOAuthSession({ config: googleOAuthConfiguration(process.env, PORT) }).load();
const MUSICBRAINZ_ROOT = process.env.MUSICBRAINZ_ROOT || "https://musicbrainz.org/ws/2";
const MUSICBRAINZ_INTERVAL = Number(process.env.MUSICBRAINZ_INTERVAL ?? 1050);
const WIKIDATA_ROOT = process.env.WIKIDATA_ROOT || "https://www.wikidata.org/w/api.php";
const DISCOGS_ROOT = process.env.DISCOGS_ROOT || "https://api.discogs.com";
const LISTENBRAINZ_ROOT = process.env.LISTENBRAINZ_ROOT || "https://labs.api.listenbrainz.org";
const APPLE_MUSIC_ROOT = process.env.APPLE_MUSIC_ROOT || "https://api.music.apple.com";
const SPOTIFY_ROOT = process.env.SPOTIFY_ROOT || "https://api.spotify.com";
const DISCOGS_ENV_TOKEN = String(process.env.DISCOGS_TOKEN || "").trim();
const APPLE_MUSIC_TOKEN = String(process.env.APPLE_MUSIC_TOKEN || "").trim();
const SPOTIFY_TOKEN = String(process.env.SPOTIFY_TOKEN || "").trim();
const SOUNDCLOUD_TOKEN = String(process.env.SOUNDCLOUD_TOKEN || "").trim();
const YOUTUBE_THUMBNAIL_ROOT = process.env.YOUTUBE_THUMBNAIL_ROOT || "https://i.ytimg.com";
const DATA_FILE = process.env.SCOUT_DATA_FILE || fileURLToPath(new URL("./.data/scout-store.json", import.meta.url));
const DISCOGS_TOKEN_FILE = process.env.DISCOGS_TOKEN_FILE || fileURLToPath(new URL("./.data/discogs-token", import.meta.url));
const MUSIC_CACHE_TTL = 24 * 60 * 60 * 1000;
const discogsSecret = new LocalSecretFile(DISCOGS_TOKEN_FILE);
let discogsToken = DISCOGS_ENV_TOKEN || await discogsSecret.load();
let discogsCredentialSource = DISCOGS_ENV_TOKEN ? "environment" : discogsToken ? "local_file" : "none";
// The historical file stays untouched. Only deliberate choices are projected
// out of it; automatic graph/cache/history are never loaded into a new dig.
const personalStore = await new PersistentStore(`${DATA_FILE}.personal.json`).load();
if (!Object.keys(personalStore.state.entities).length) {
  const archive = await new PersistentStore(DATA_FILE).load();
  const choices = personalGraph(archive.snapshot());
  // In-memory migration until a deliberate change needs saving.
  personalStore.state.entities = Object.fromEntries(choices.entities.map(item => [item.id, item]));
  personalStore.state.edges = Object.fromEntries(choices.edges.map(item => [item.id || `${item.from}:${item.kind}:${item.to}`, item]));
}
const explorations = new EphemeralExplorations({ personal: personalStore });
const store = explorations.store;
const musicCache = explorations.cache("music");
const musicArtistCache = explorations.cache("musicArtist");
const labelCache = explorations.cache("label");
const contextCache = explorations.cache("context");
const discogsCache = explorations.cache("discogs");
const discogsProfileCache = explorations.cache("discogsProfile");
const identityCache = explorations.cache("identity");
const recordingCache = explorations.cache("recording");
const runtime = new SourceRuntime({ store, userAgent: `YouTubeScout/${APP_VERSION} (local personal discovery tool; contact: local-user)` });
runtime.register("musicbrainz", { minIntervalMs: MUSICBRAINZ_INTERVAL, retries: 3, timeoutMs: 12_000 });
runtime.register("wikidata", { minIntervalMs: 150, retries: 2, timeoutMs: 10_000 });
runtime.register("discogs", { minIntervalMs: 1100, retries: 2, timeoutMs: 12_000, configured: Boolean(discogsToken) });
runtime.register("listenbrainz", { minIntervalMs: 250, retries: 2, timeoutMs: 12_000 });
runtime.register("applemusic", { minIntervalMs: 200, retries: 1, timeoutMs: 12_000, configured: Boolean(APPLE_MUSIC_TOKEN) });
runtime.register("spotify", { minIntervalMs: 200, retries: 1, timeoutMs: 12_000, configured: Boolean(SPOTIFY_TOKEN) });
runtime.register("soundcloud", { minIntervalMs: 200, retries: 1, timeoutMs: 12_000, configured: Boolean(SOUNDCLOUD_TOKEN) });
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const SECURITY_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    "img-src 'self' https://i.ytimg.com https://yt3.ggpht.com data:",
    "style-src 'self'",
    "script-src 'self' https://accounts.google.com/gsi/client",
    "connect-src 'self' https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self' https://accounts.google.com"
  ].join("; "),
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { ...SECURITY_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(payload));
}

const THUMBNAIL_PLACEHOLDER = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-labelledby="title description">
    <title id="title">Miniature indisponible</title>
    <desc id="description">La vidéo reste accessible malgré l’absence de miniature.</desc>
    <rect width="1280" height="720" fill="#191918"/>
    <path d="M548 270v180l170-90z" fill="#ff4f3d"/>
    <text x="640" y="535" text-anchor="middle" fill="#9d9a92" font-family="sans-serif" font-size="32">MINIATURE INDISPONIBLE</text>
  </svg>`);

async function serveYoutubeThumbnail(response, videoId) {
  for (const quality of ["hqdefault", "mqdefault", "default"]) {
    try {
      const base = `${YOUTUBE_THUMBNAIL_ROOT.replace(/\/+$/, "")}/`;
      const upstream = await fetch(new URL(`vi/${encodeURIComponent(videoId)}/${quality}.jpg`, base), {
        headers: { "user-agent": `YouTubeScout/${APP_VERSION} (local thumbnail relay)` },
        signal: AbortSignal.timeout(8_000)
      });
      if (!upstream.ok) continue;
      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) continue;
      const content = Buffer.from(await upstream.arrayBuffer());
      if (!content.length || content.length > 4_000_000) continue;
      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "content-type": contentType,
        "cache-control": "public, max-age=604800, stale-if-error=2592000",
        "content-length": String(content.length)
      });
      response.end(content);
      return;
    } catch {
      // Essaie la définition suivante avant d’afficher le repli local.
    }
  }
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "public, max-age=3600",
    "content-length": String(THUMBNAIL_PLACEHOLDER.length)
  });
  response.end(THUMBNAIL_PLACEHOLDER);
}

function queueMusicBrainz(url, attempts = 2) {
  return runtime.request("musicbrainz", url, { cacheKey: String(url), ttlMs: MUSIC_CACHE_TTL }).then(({ data }) => data);
}

function musicBrainz(resource, parameters, attempts = 2) {
  const url = new URL(`${MUSICBRAINZ_ROOT}/${resource}`);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, String(value));
  url.searchParams.set("fmt", "json");
  return queueMusicBrainz(url, attempts);
}

function withDeadline(promise, milliseconds, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} a dépassé ${Math.round(milliseconds / 1000)} s.`)), milliseconds);
    })
  ]).finally(() => clearTimeout(timer));
}

function artistQuery(name) {
  const escaped = name.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  return `artist:\"${escaped}\"`;
}

function recordingQuery(artist, title) {
  const escapedArtist = artist.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  const escapedTitle = title.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
  return `artist:\"${escapedArtist}\" AND recording:\"${escapedTitle}\"`;
}

async function wikidata(parameters) {
  const url = new URL(WIKIDATA_ROOT);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, String(value));
  url.searchParams.set("format", "json");
  return runtime.request("wikidata", url, { cacheKey: url.search, ttlMs: MUSIC_CACHE_TTL }).then(({ data }) => data);
}

function normalizedName(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

// Search identity is not fuzzy name matching. Preserve Unicode, punctuation
// and case so a prior lookup cannot answer a different query.
const artistCacheKey = name => String(name).normalize("NFC").trim();

function discogsArtistUrl(result = {}) {
  if (typeof result.uri === "string" && result.uri.startsWith("/")) return `https://www.discogs.com${result.uri}`;
  if (Number.isFinite(Number(result.id))) return `https://www.discogs.com/artist/${Number(result.id)}`;
  return "";
}

async function findDiscogsArtist(name) {
  const searchUrl = `https://www.discogs.com/search/?q=${encodeURIComponent(name)}&type=artist`;
  if (!discogsToken) return { status: "not_configured", searchUrl };
  const key = artistCacheKey(name);
  const cached = discogsCache.get(key);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.value;

  const url = new URL(`${DISCOGS_ROOT}/database/search`);
  url.searchParams.set("q", name);
  url.searchParams.set("type", "artist");
  url.searchParams.set("per_page", "10");
  const data = await runtime.request("discogs", url, {
    cacheKey: `artist-search:${key}`,
    ttlMs: MUSIC_CACHE_TTL,
    headers: { authorization: `Discogs token=${discogsToken}` }
  }).then(({ data: value }) => value);
  const results = (data.results || []).filter((result) => result.type === "artist" && result.id && result.title);
  const exactResults = results.filter((result) => normalizedName(result.title.replace(/\s*\(\d+\)$/, "")) === normalizedName(name));
  const exact = exactResults[0];
  const result = exact || results[0];
  let aliases = [];
  if (exact) {
    try {
      const profile = await discogs(`/artists/${Number(exact.id)}`);
      aliases = [...new Set([...(profile.namevariations || []), ...(profile.aliases || []).map((alias) => alias.name)].filter(Boolean))].slice(0, 30);
    } catch {
      aliases = [];
    }
  }
  const value = result ? {
    status: "matched",
    match: exact ? "exact" : "candidate",
    id: Number(result.id),
    name: result.title,
    discogsUrl: discogsArtistUrl(result),
    resourceUrl: result.resource_url || "",
    aliases,
    candidates: exactResults.map(item => ({ id: Number(item.id), name: item.title, discogsUrl: discogsArtistUrl(item) })),
    searchUrl
  } : { status: "not_found", searchUrl };
  discogsCache.set(key, { savedAt: Date.now(), value });
  return value;
}

async function discogs(pathname, parameters = {}) {
  if (!discogsToken) throw new Error("Discogs n’est pas configuré.");
  const url = new URL(`${DISCOGS_ROOT}${pathname}`);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, String(value));
  return runtime.request("discogs", url, {
    cacheKey: `${pathname}?${url.searchParams}`,
    ttlMs: MUSIC_CACHE_TTL,
    headers: { authorization: `Discogs token=${discogsToken}` }
  }).then(({ data }) => data);
}

async function discogsArtistProfile(artistId) {
  const key = String(artistId);
  const cached = discogsProfileCache.get(key);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.value;
  const [artist, releasesPage] = await Promise.all([
    discogs(`/artists/${key}`),
    discogs(`/artists/${key}/releases`, { sort: "year", sort_order: "desc", per_page: 40, page: 1 })
  ]);
  const value = {
    id: Number(artist.id || artistId),
    name: artist.name || "Artiste Discogs",
    realName: artist.realname || "",
    profile: String(artist.profile || "").replace(/\[url=[^\]]+\]|\[\/url\]/gi, "").slice(0, 1200),
    aliases: (artist.namevariations || []).slice(0, 12),
    urls: (artist.urls || []).filter((url) => /^https?:\/\//.test(url)).slice(0, 8),
    discogsUrl: artist.uri || `https://www.discogs.com/artist/${key}`,
    releases: (releasesPage.releases || []).filter((release) => release.id && release.title).map((release) => ({
      id: Number(release.id),
      title: release.title,
      type: release.type || "release",
      role: release.role || "",
      year: Number(release.year || 0) || null,
      label: release.label || "",
      format: release.format || "",
      discogsUrl: release.main_release ? `https://www.discogs.com/release/${release.main_release}` : `https://www.discogs.com/${release.type === "master" ? "master" : "release"}/${release.id}`
    })).slice(0, 20)
  };
  discogsProfileCache.set(key, { savedAt: Date.now(), value });
  return value;
}

async function findDiscogsRecordingCandidates(artist, title) {
  if (!discogsToken) return [];
  const data = await discogs("/database/search", { artist, track: title, type: "release", per_page: 10, page: 1 });
  return (data.results || []).filter((result) => result.id && result.title).map((result) => ({
    id: Number(result.id),
    title: result.title,
    year: result.year || null,
    labels: (result.label || []).slice(0, 8),
    formats: (result.format || []).slice(0, 8),
    catalogueNumber: result.catno || "",
    country: result.country || "",
    discogsUrl: discogsArtistUrl(result).replace("/artist/", "/release/")
  })).slice(0, 8);
}

async function findMusicBrainzRecordings(artist, title) {
  const data = await musicBrainz("recording", { query: recordingQuery(artist, title), limit: 10 }, 1);
  return (data.recordings || []).filter((recording) => recording.id && recording.title).map((recording) => ({
    id: recording.id,
    title: recording.title,
    sourceScore: Number(recording.score || 0),
    firstReleaseDate: recording["first-release-date"] || "",
    artistCredits: (recording["artist-credit"] || []).map((credit) => ({
      id: credit.artist?.id || "",
      name: credit.artist?.name || credit.name || ""
    })).filter(({ name }) => name),
    releases: (recording.releases || []).filter((release) => release.id && release.title).slice(0, 5).map((release) => ({
      id: release.id,
      title: release.title,
      date: release.date || "",
      country: release.country || "",
      status: release.status || "",
      musicBrainzUrl: `https://musicbrainz.org/release/${encodeURIComponent(release.id)}`
    })),
    isrcs: (recording.isrcs || []).slice(0, 12),
    lengthMs: Number(recording.length || 0) || null,
    musicBrainzUrl: `https://musicbrainz.org/recording/${encodeURIComponent(recording.id)}`
  })).slice(0, 8);
}

async function resolveRecording(videoTitle, probableArtist, durationSeconds = 0, bandcamp = null, metadata = {}) {
  /*
   * JONCTION RUNTIME v1
   *
   * L'algèbre moderne choisit désormais la projection de recherche.
   * L'ancien buildRecordingResolution reste temporairement l'adaptateur de
   * sortie HTTP afin de ne pas modifier silencieusement le contrat du front
   * ni graphFromResolution pendant la migration.
   */
  const plan = runtimeRecordingPlan({
    title: videoTitle,
    artist: probableArtist,
    durationSeconds, channelTitle: metadata.channelTitle, description: metadata.description
  });

  const primaryQuery = primaryRuntimeQuery(plan);

  /*
   * Fail closed : si l'algèbre ne produit encore aucune requête exploitable
   * avec les seules données disponibles sur cet endpoint, on conserve le
   * parse historique — uniquement comme compatibilité de transport.
   */
  const parsedVariants = parseTrackCandidates(
    videoTitle,
    probableArtist
  );

  let parsed =
    primaryQuery
      ? {
          status: "parsed",
          sourceTitle: videoTitle,
          artist: primaryQuery.artist,
          title: primaryQuery.title,
          mix: primaryQuery.version || "",
          ...(primaryQuery.catalogueCode
            ? { catalogueCode: primaryQuery.catalogueCode }
            : {}),
          discarded: [],
          basis: primaryQuery.kind,
          algebraProjected: true
        }
      : (
          parsedVariants[0] ||
          parseTrackCandidate(
            videoTitle,
            probableArtist
          )
        );

  if (parsed.status !== "parsed") {
    return buildRecordingResolution(
      parsed,
      {
        sourceStates: {
          musicbrainz: "not_queried",
          discogs: discogsToken
            ? "not_queried"
            : "not_configured"
        }
      }
    );
  }

  // Decision inputs, not just the search terms: versions and durations must
  // never reuse another video's identity decision.
  const key = JSON.stringify([videoTitle, probableArtist, durationSeconds, bandcamp, metadata, Boolean(discogsToken)]);

  const cached = recordingCache.get(key);

  if (
    cached &&
    Date.now() - cached.savedAt < cached.ttl
  ) {
    return cached.value;
  }

  const providerTitle =
    parsed.mix
      ? `${parsed.title} ${parsed.mix}`
      : parsed.title;

  let [musicBrainzResult, discogsResult] =
    await Promise.allSettled([
      withDeadline(
        findMusicBrainzRecordings(
          parsed.artist,
          providerTitle
        ),
        8_000,
        "MusicBrainz recordings"
      ),
      withDeadline(
        findDiscogsRecordingCandidates(
          parsed.artist,
          providerTitle
        ),
        8_000,
        "Discogs releases"
      )
    ]);

  /*
   * Le reroutage n'est plus basé sur parsedVariants[1] en priorité :
   * la seconde projection de l'algèbre passe devant.
   */
  if (
    musicBrainzResult.status === "fulfilled" &&
    !musicBrainzResult.value.length
  ) {
    const alternativeQuery =
      secondaryRuntimeQuery(
        plan,
        primaryQuery
      );

    const historicalAlternative =
      parsedVariants.find(
        (candidate) =>
          normalizedName(candidate.artist) !==
            normalizedName(parsed.artist) ||
          normalizedName(candidate.title) !==
            normalizedName(parsed.title) ||
          normalizedName(candidate.mix) !==
            normalizedName(parsed.mix)
      );

    const alternative =
      alternativeQuery
        ? {
            status: "parsed",
            sourceTitle: videoTitle,
            artist: alternativeQuery.artist,
            title: alternativeQuery.title,
            mix: alternativeQuery.version || "",
            ...(alternativeQuery.catalogueCode
              ? {
                  catalogueCode:
                    alternativeQuery.catalogueCode
                }
              : {}),
            basis: alternativeQuery.kind,
            algebraProjected: true
          }
        : historicalAlternative;

    if (alternative?.artist && alternative?.title) {
      const retried =
        await Promise.allSettled([
          withDeadline(
            findMusicBrainzRecordings(
              alternative.artist,
              alternative.mix
                ? `${alternative.title} ${alternative.mix}`
                : alternative.title
            ),
            8_000,
            "MusicBrainz recordings"
          )
        ]);

      if (
        retried[0].status === "fulfilled" &&
        retried[0].value.length
      ) {
        musicBrainzResult = retried[0];

        parsed = {
          ...parsed,
          ...alternative,
          alternativeBasis:
            alternative.basis ||
            "runtime_algebra_projection"
        };
      }
    }
  }

  const sourceStates = {
    musicbrainz:
      musicBrainzResult.status === "rejected"
        ? "unavailable"
        : musicBrainzResult.value.length
          ? "candidates"
          : "not_found",

    discogs:
      !discogsToken
        ? "not_configured"
        : discogsResult.status === "rejected"
          ? "unavailable"
          : discogsResult.value.length
            ? "candidates"
            : "not_found"
  };

  const musicBrainzCandidates =
    musicBrainzResult.status === "fulfilled"
      ? musicBrainzResult.value
      : [];

  const discogsCandidates =
    discogsResult.status === "fulfilled"
      ? discogsResult.value
      : [];

  const hydration = await hydrateRecordingReleases(discogsCandidates,
    id => withDeadline(discogs(`/releases/${id}`), 6_000, "Discogs tracklist"));
  if (hydration.coverage.failed) sourceStates.discogs = "partial";

  /*
   * L'adaptateur historique reste responsable de la forme HTTP :
   * parsed, candidates, discogsCandidates, corroboration, sourceStates...
   */
  const legacyValue =
    buildRecordingResolution(
      parsed,
      {
        musicBrainz:
          musicBrainzCandidates,

        discogs:
          discogsCandidates,

        durationMs:
          Number(durationSeconds || 0) * 1000,

        bandcamp,
        sourceStates
      }
    );

  /*
   * L'autorité identitaire appartient désormais au moteur moderne.
   *
   * Important :
   * Les releases de recherche restent des indices. Seules leurs pistes
   * hydratées peuvent corroborer ou identifier un morceau Discogs.
   */
  const runtimeDecision =
    decideRuntimeRecording({
      plan,
      musicBrainzCandidates,
      discogsCandidates,
      discogsTrackCandidates: hydration.tracks
    });

  /*
   * Fail closed :
   * l'ancien "resolved" ne survit que si l'algèbre auto-accepte exactement
   * le même recording MusicBrainz.
   */
  const value =
    applyRuntimeRecordingAuthority(
      legacyValue,
      runtimeDecision
    );

  value.runtimeResolution = {
    engine: "evidence_algebra_v2",
    projectionUsed:
      Boolean(parsed.algebraProjected),
    queryKind:
      parsed.basis || "",
    alternativeBasis:
      parsed.alternativeBasis || "",
    decision:
      runtimeDecision.decision?.decision || "",
    reason:
      runtimeDecision.decision?.reason || ""
  };
  value.discogsTrackCoverage = hydration.coverage;

  const complete =
    Object.values(sourceStates)
      .every(
        (state) =>
          !["unavailable", "partial"].includes(state)
      );

  recordingCache.set(
    key,
    {
      savedAt: Date.now(),
      ttl:
        complete
          ? MUSIC_CACHE_TTL
          : 5 * 60 * 1000,
      value
    }
  );

  return value;
}

async function resolveArtistIdentity(name, confirmedDiscogsId = "") {
  const key = JSON.stringify([artistCacheKey(name), confirmedDiscogsId || "unconfirmed"]);
  const cached = identityCache.get(key);
  if (cached && Date.now() - cached.savedAt < cached.ttl) return cached.value;
  let [musicBrainzResult, wikidataResult] = await Promise.allSettled([
    withDeadline(findMusicBrainzIdentity(name), 6_500, "MusicBrainz"),
    withDeadline(findWikidataContext(name), 6_500, "Wikidata")
  ]);
  const wikidataValue = wikidataResult.status === "fulfilled" ? wikidataResult.value : null;
  const wikiAnchored = Boolean(wikidataValue && artistNameMatch(name, wikidataValue.name, wikidataValue.aliases || []).accepted);
  if (wikiAnchored && wikidataValue?.musicBrainzId) {
    const currentId = musicBrainzResult.status === "fulfilled" ? musicBrainzResult.value?.artist?.id : "";
    if (String(currentId || "") !== String(wikidataValue.musicBrainzId)) {
      musicBrainzResult = await Promise.allSettled([withDeadline(findMusicBrainzIdentityById(wikidataValue.musicBrainzId), 6_500, "MusicBrainz")]).then(([result]) => result);
    }
  }
  const discogsResult = await Promise.allSettled([
    withDeadline(confirmedDiscogsId
      ? findDiscogsArtistById(confirmedDiscogsId, name).then((artist) => ({ ...artist, match: "user_confirmed" }))
      : wikiAnchored && wikidataValue?.discogsId
        ? findDiscogsArtistById(wikidataValue.discogsId, name)
        : findDiscogsArtist(name), 6_500, "Discogs")
  ]).then(([result]) => result);
  const sourceStates = {
    musicbrainz: musicBrainzResult.status === "rejected" ? "unavailable" : musicBrainzResult.value ? "matched" : "not_found",
    wikidata: wikidataResult.status === "rejected" ? "unavailable" : wikidataResult.value ? "matched" : "not_found",
    discogs: discogsResult.status === "rejected" ? "unavailable" : discogsResult.value?.status || "not_found"
  };
  const value = buildArtistRegistryEntry(name, {
    musicBrainz: musicBrainzResult.status === "fulfilled" ? musicBrainzResult.value : null,
    wikidata: wikidataResult.status === "fulfilled" ? wikidataResult.value : null,
    discogs: discogsResult.status === "fulfilled" ? discogsResult.value : { status: "unavailable", searchUrl: `https://www.discogs.com/search/?q=${encodeURIComponent(name)}&type=artist` },
    sourceStates
  });
  const resolvedSources = new Set((value.resolution?.evidence || []).map(({ source }) => source));
  for (const source of Object.keys(sourceStates)) {
    if (sourceStates[source] === "matched" && !resolvedSources.has(source)) sourceStates[source] = "candidate";
  }
  value.sourceStates = sourceStates;
  const complete = Object.values(sourceStates).every((state) => state !== "unavailable");
  identityCache.set(key, { savedAt: Date.now(), ttl: complete ? MUSIC_CACHE_TTL : 5 * 60 * 1000, value });
  return value;
}

function claimValues(entity, property) {
  return (entity.claims?.[property] || []).map((claim) => claim.mainsnak?.datavalue?.value).filter(Boolean);
}

function localizedValue(values = {}) {
  return values.fr?.value || values.en?.value || Object.values(values)[0]?.value || "";
}

async function findWikidataContext(name) {
  const key = artistCacheKey(name);
  const cached = contextCache.get(key);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.value;

  const search = await wikidata({
    action: "wbsearchentities",
    search: name,
    language: "fr",
    uselang: "fr",
    type: "item",
    limit: 8
  });
  const musicDescription = /musicien|musician|chanteu|singer|rappeur|rapper|disc jockey|\bdj\b|producteur.*musique|music producer|groupe.*musique|musical group|band|compositeur|composer|artiste.*musique|record label/i;
  const candidates = search.search || [];
  const exact = candidates.filter((candidate) => normalizedName(candidate.label) === normalizedName(name));
  const candidate = exact.find((item) => musicDescription.test(item.description || ""))
    || candidates.find((item) => musicDescription.test(item.description || ""))
    || exact[0];
  if (!candidate?.id) {
    contextCache.set(key, { savedAt: Date.now(), value: null });
    return null;
  }

  const entityData = await wikidata({
    action: "wbgetentities",
    ids: candidate.id,
    props: "labels|aliases|descriptions|claims|sitelinks",
    languages: "fr|en",
    sitefilter: "frwiki|enwiki"
  });
  const entity = entityData.entities?.[candidate.id];
  if (!entity || entity.missing !== undefined) return null;

  const labelIds = claimValues(entity, "P264").map((value) => value.id).filter(Boolean).slice(0, 12);
  let labels = [];
  if (labelIds.length) {
    const labelData = await wikidata({
      action: "wbgetentities",
      ids: labelIds.join("|"),
      props: "labels",
      languages: "fr|en"
    });
    labels = labelIds.map((id) => localizedValue(labelData.entities?.[id]?.labels)).filter(Boolean);
  }
  const bandcampId = String(claimValues(entity, "P3283")[0] || "");
  const wikipedia = entity.sitelinks?.frwiki || entity.sitelinks?.enwiki;
  const value = {
    id: entity.id,
    name: localizedValue(entity.labels) || candidate.label || name,
    aliases: [...new Set([...(entity.aliases?.fr || []), ...(entity.aliases?.en || [])].map((alias) => alias.value).filter(Boolean))],
    description: localizedValue(entity.descriptions) || candidate.description || "",
    labels: [...new Set(labels)],
    wikidataUrl: `https://www.wikidata.org/wiki/${encodeURIComponent(entity.id)}`,
    wikipediaUrl: wikipedia ? `https://${entity.sitelinks?.frwiki ? "fr" : "en"}.wikipedia.org/wiki/${encodeURIComponent(wikipedia.title.replace(/ /g, "_"))}` : "",
    bandcampUrl: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(bandcampId) ? `https://${bandcampId}.bandcamp.com/` : "",
    musicBrainzId: String(claimValues(entity, "P434")[0] || ""),
    discogsId: String(claimValues(entity, "P1953")[0] || "")
  };
  contextCache.set(key, { savedAt: Date.now(), value });
  return value;
}

async function browseReleaseGroups(artistId) {
  const groups = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await musicBrainz("release-group", {
      artist: artistId,
      "release-group-status": "website-default",
      limit: 100,
      offset
    });
    const items = page["release-groups"] || [];
    groups.push(...items);
    total = Number(page["release-group-count"] || items.length);
    offset += items.length;
    if (!items.length) break;
  } while (offset < total && offset < 1000);
  return groups
    .filter((group) => group.id && group.title)
    .sort((left, right) => (right["first-release-date"] || "").localeCompare(left["first-release-date"] || "") || left.title.localeCompare(right.title))
    .slice(0, 5);
}

function normalizeReleaseGroup(group) {
  return {
    id: group.id,
    title: group.title,
    date: group["first-release-date"] || "",
    type: group["primary-type"] || "Sortie",
    secondaryTypes: group["secondary-types"] || [],
    musicBrainzUrl: `https://musicbrainz.org/release-group/${encodeURIComponent(group.id)}`
  };
}

async function labelsForReleaseGroup(releaseGroupId) {
  const cached = labelCache.get(releaseGroupId);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.labels;
  const page = await musicBrainz("release", {
    "release-group": releaseGroupId,
    inc: "labels",
    status: "official",
    limit: 100
  });
  const labels = [...new Set((page.releases || [])
    .flatMap((release) => (release["label-info"] || []).map((entry) => entry.label?.name))
    .filter(Boolean))];
  labelCache.set(releaseGroupId, { savedAt: Date.now(), labels });
  return labels;
}

function normalizeMusicBrainzArtist(artist) {
  if (!artist) return null;
  return {
    id: artist.id,
    name: artist.name,
    disambiguation: artist.disambiguation || "",
    country: artist.country || "",
    score: Number(artist.score || 0),
    aliases: [...new Set((artist.aliases || []).map((alias) => alias.name).filter(Boolean))],
    musicBrainzUrl: `https://musicbrainz.org/artist/${encodeURIComponent(artist.id)}`
  };
}

async function findMusicBrainzArtist(name) {
  const key = artistCacheKey(name);
  const cached = musicArtistCache.get(key);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.value;
  const search = await musicBrainz("artist", { query: artistQuery(name), limit: 5 }, 1);
  const artist = (search.artists || []).find((candidate) => Number(candidate.score || 0) >= 80) || null;
  musicArtistCache.set(key, { savedAt: Date.now(), value: artist });
  return artist;
}

async function findMusicBrainzIdentity(name) {
  const artist = await findMusicBrainzArtist(name);
  return artist ? { artist: normalizeMusicBrainzArtist(artist), releases: [] } : null;
}

async function findMusicBrainzIdentityById(artistId) {
  if (!/^[0-9a-f-]{8,60}$/i.test(String(artistId))) return null;
  const artist = await musicBrainz(`artist/${encodeURIComponent(artistId)}`, { inc: "aliases" }, 1);
  return artist?.id ? { artist: normalizeMusicBrainzArtist({ ...artist, score: 100 }), releases: [] } : null;
}

async function findDiscogsArtistById(artistId, requestedName) {
  if (!discogsToken) return { status: "not_configured", searchUrl: `https://www.discogs.com/search/?q=${encodeURIComponent(requestedName)}&type=artist` };
  if (!/^\d{1,12}$/.test(String(artistId))) return findDiscogsArtist(requestedName);
  const artist = await discogs(`/artists/${artistId}`);
  return {
    status: "matched",
    match: "cross_id",
    id: Number(artist.id || artistId),
    name: artist.name || requestedName,
    aliases: [...new Set([...(artist.namevariations || []), ...(artist.aliases || []).map((alias) => alias.name)].filter(Boolean))].slice(0, 30),
    discogsUrl: artist.uri || `https://www.discogs.com/artist/${artistId}`,
    resourceUrl: artist.resource_url || "",
    searchUrl: `https://www.discogs.com/search/?q=${encodeURIComponent(requestedName)}&type=artist`
  };
}

async function findArtist(name) {
  const key = artistCacheKey(name);
  const cached = musicCache.get(key);
  if (cached && Date.now() - cached.savedAt < MUSIC_CACHE_TTL) return cached.value;

  const artist = await findMusicBrainzArtist(name);
  if (!artist) return null;

  const recentGroups = await browseReleaseGroups(artist.id);
  const releases = recentGroups.map(normalizeReleaseGroup);

  const value = {
    artist: normalizeMusicBrainzArtist(artist),
    releases
  };
  musicCache.set(key, { savedAt: Date.now(), value });
  return value;
}

async function discogsReleaseProfile(releaseId) {
  const release = await discogs(`/releases/${releaseId}`);
  let master = null;
  if (release.master_id) {
    try { master = await discogs(`/masters/${release.master_id}`); } catch { master = null; }
  }
  return {
    id: Number(release.id || releaseId),
    title: release.title || "Sortie Discogs",
    year: Number(release.year || 0) || null,
    country: release.country || "",
    catalogueNumbers: (release.labels || []).map((label) => ({ id: label.id || null, name: label.name || "", catno: label.catno || "" })),
    formats: (release.formats || []).map((format) => ({ name: format.name || "", qty: format.qty || "", descriptions: format.descriptions || [] })),
    artists: (release.artists || []).map((artist) => ({ id: artist.id || null, name: artist.name || artist.anv || "", role: artist.role || "main" })),
    tracks: (release.tracklist || []).filter((track) => track.title).map((track) => ({
      position: track.position || "",
      title: track.title,
      duration: track.duration || "",
      artists: (track.artists || []).map((artist) => ({ id: artist.id || null, name: artist.name || artist.anv || "" })),
      credits: (track.extraartists || []).map((artist) => ({ id: artist.id || null, name: artist.name || artist.anv || "", role: artist.role || "" }))
    })),
    credits: (release.extraartists || []).map((artist) => ({ id: artist.id || null, name: artist.name || artist.anv || "", role: artist.role || "" })),
    master: master ? { id: Number(master.id), title: master.title || release.title || "", year: Number(master.year || 0) || null, discogsUrl: master.uri || `https://www.discogs.com/master/${master.id}` } : null,
    discogsUrl: release.uri || `https://www.discogs.com/release/${releaseId}`,
    observedAt: new Date().toISOString()
  };
}

async function listenBrainzSimilar(recordingMbid) {
  const algorithm = "session_based_days_7500_session_300_contribution_sqrt_threshold_15_limit_50_skip_30_top_n_listeners_1000";
  const url = new URL(`${LISTENBRAINZ_ROOT}/similar-recordings/json`);
  url.searchParams.set("recording_mbids", recordingMbid);
  url.searchParams.set("algorithm", algorithm);
  const { data, provenance } = await runtime.request("listenbrainz", url, { cacheKey: `similar:${recordingMbid}:${algorithm}`, ttlMs: 7 * 24 * 60 * 60 * 1000 });
  const rows = Array.isArray(data) ? data : data.payload || data.similar_recordings || data.recordings || [];
  return {
    candidates: normalizeDiscoveryCandidates({ candidates: rows.map((row) => ({
      ...row,
      recordingMbid: row.recording_mbid || row.recordingMbid || row.recording_mbids?.[0],
      artistMbid: row.artist_mbid || row.artistMbid || row.artist_mbids?.[0],
      title: row.recording_name || row.title,
      artist: row.artist_name || row.artist,
      relation: "similar_recording",
      source: "listenbrainz",
      evidence: [{ source: "listenbrainz", algorithm }]
    })) }, { recordingMbid }),
    provenance
  };
}

async function appleMusicByIsrc(isrc, storefront = "fr") {
  if (!APPLE_MUSIC_TOKEN) return { status: "not_configured" };
  const url = new URL(`/v1/catalog/${encodeURIComponent(storefront)}/songs`, APPLE_MUSIC_ROOT);
  url.searchParams.set("filter[isrc]", isrc);
  const { data, provenance } = await runtime.request("applemusic", url, { cacheKey: `${storefront}:${isrc}`, ttlMs: MUSIC_CACHE_TTL, headers: { authorization: `Bearer ${APPLE_MUSIC_TOKEN}` } });
  return { status: "ok", songs: data.data || [], provenance };
}

async function spotifyByIsrc(isrc, market = "FR") {
  if (!SPOTIFY_TOKEN) return { status: "not_configured" };
  const url = new URL("/v1/search", SPOTIFY_ROOT);
  url.searchParams.set("q", `isrc:${isrc}`);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "10");
  url.searchParams.set("market", market);
  const { data, provenance } = await runtime.request("spotify", url, { cacheKey: `isrc:${isrc}:${market}`, ttlMs: MUSIC_CACHE_TTL, headers: { authorization: `Bearer ${SPOTIFY_TOKEN}` } });
  return { status: "ok", tracks: data.tracks?.items || [], provenance };
}

function safeBandcampEvidence(value, source = "user_confirmed") {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !/(^|\.)bandcamp\.com$/i.test(url.hostname)) return null;
    return { url: url.href, source: source === "wikidata" ? "wikidata" : "user_confirmed", status: source === "wikidata" ? "structured" : "confirmed" };
  } catch {
    return null;
  }
}

async function platformAvailability(isrc, territory, youtubeVideoId) {
  const [appleResult, spotifyResult] = await Promise.allSettled([
    appleMusicByIsrc(isrc, territory.toLowerCase()),
    spotifyByIsrc(isrc, territory)
  ]);
  const normalize = (result) => result.status === "fulfilled" ? result.value : { status: "unavailable", message: result.reason?.message || "request_failed" };
  return compileAvailability({
    isrc,
    territory,
    youtubeVideoId,
    applemusic: normalize(appleResult),
    spotify: normalize(spotifyResult)
  });
}

async function readJsonBody(request, maximum = 512_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximum) throw Object.assign(new Error("Corps de requête trop volumineux."), { httpStatus: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw Object.assign(new Error("Objet JSON invalide."), { httpStatus: 400 }); }
}

function assertLocalApiWrite(request) {
  const origin = request.headers.origin;
  const site = request.headers["sec-fetch-site"];
  if ((site && !["same-origin", "none"].includes(site)) || (origin && ![`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`].includes(origin))) {
    throw Object.assign(new Error("Une page externe ne peut pas accéder à l’API du Scout local."), { httpStatus: 403 });
  }
  if (["POST", "PUT", "PATCH"].includes(request.method) && String(request.headers["content-type"] || "").split(";")[0].trim().toLowerCase() !== "application/json") {
    throw Object.assign(new Error("Une écriture locale exige application/json."), { httpStatus: 415 });
  }
}

function assertLocalSettingsRequest(request) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    const error = new Error("Cette configuration exige une requête JSON locale.");
    error.httpStatus = 415;
    throw error;
  }
  const origin = String(request.headers.origin || "");
  const allowedOrigins = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);
  if (!allowedOrigins.has(origin)) {
    const error = new Error("Origine locale non autorisée pour modifier les secrets.");
    error.httpStatus = 403;
    throw error;
  }
}

async function verifyDiscogsToken(token) {
  const response = await fetch(new URL("/oauth/identity", DISCOGS_ROOT), {
    headers: {
      accept: "application/json",
      authorization: `Discogs token=${token}`,
      "user-agent": `YouTubeScout/${APP_VERSION} (local personal discovery tool; contact: local-user)`
    },
    signal: AbortSignal.timeout(12_000)
  });
  if (response.status === 401 || response.status === 403) {
    const error = new Error("Discogs a refusé ce jeton. Rien n’a été enregistré.");
    error.httpStatus = 401;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`Discogs ne peut pas vérifier le jeton pour le moment (${response.status}). Rien n’a été enregistré.`);
    error.httpStatus = 502;
    throw error;
  }
  const identity = await response.json();
  return { username: String(identity.username || ""), id: Number(identity.id || 0) || null };
}

function clearDiscogsMemoryCaches() {
  discogsCache.clear();
  discogsProfileCache.clear();
  identityCache.clear();
  recordingCache.clear();
}

async function persistResolution(video, identity, recording, context = {}) {
  if (departureRevision(store.snapshot().entities[`video:youtube:${video.id}`]) !== String(video.departureRevision || "")) {
    throw Object.assign(new Error("Ce départ a été corrigé depuis le lancement de cette recherche. Réponse ancienne ignorée."), { httpStatus: 409 });
  }
  return store.ingestGraph(graphFromResolution(video, identity, recording, context));
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/catalogue-graph.mjs") {
    const content = await readFile(new URL("./lib/catalogue-graph.mjs", import.meta.url));
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content);
    return;
  }
  if (pathname === "/video-credits.mjs") {
    const content = await readFile(new URL("./public/video-credits.mjs", import.meta.url));
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content); return;
  }
  if (pathname === "/scout.js") {
    const content = await readFile(ENGINE);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content);
    return;
  }
  if (pathname === "/identity.js") {
    const content = await readFile(IDENTITY_ENGINE);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content);
    return;
  }
  if (pathname === "/digging.js") {
    const content = await readFile(DIGGING_ENGINE);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content);
    return;
  }
  if (pathname === "/exploration.js") {
    const content = await readFile(EXPLORATION_ENGINE);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[".js"] });
    response.end(content);
    return;
  }
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(ROOT, safePath);
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" });
    response.end("Introuvable");
  }
}

async function handleRequest(request, response) {
  try {
    const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
    if (!allowedHosts.has(request.headers.host || "")) return sendJson(response, 403, { message: "Hôte local non autorisé." });
    if (request.method === "GET" && request.url === "/" && request.headers.host === `127.0.0.1:${PORT}`) {
      response.writeHead(307, { ...SECURITY_HEADERS, location: `http://localhost:${PORT}/`, "cache-control": "no-store" });
      response.end();
      return;
    }
    const url = new URL(request.url, `http://localhost:${PORT}`);
    if (request.method === "GET" && url.pathname === GOOGLE_OAUTH_CALLBACK) {
      // No provider code, error or credential is reflected into HTML, logs or URLs.
      let result = "connected";
      try {
        googleOAuth.assertRequest(request, { callback: true });
        await googleOAuth.complete(url, request.headers.cookie || "");
      } catch { result = "reconnect"; }
      response.writeHead(303, { ...SECURITY_HEADERS, "cache-control": "no-store", "set-cookie": GOOGLE_OAUTH_CLEAR_COOKIE,
        location: `${googleOAuth.config.origin}/?google_oauth=${result}#source-panel` });
      response.end(); return;
    }
    // GET can spend catalogue quota and persist enrichment too. The complete
    // API is local-only, not merely endpoints with write-shaped HTTP methods.
    if (url.pathname.startsWith("/api/")) assertLocalApiWrite(request);
    if (url.pathname === "/api/exploration/context") {
      if (request.method === "POST") {
        const body = await readJsonBody(request, 8192);
        return sendJson(response, 201, { token: await explorations.start(String(body.seedId || "").slice(0, 4096)), mode: "ephemeral" });
      }
      if (request.method === "DELETE") {
        explorations.close(request.headers["x-scout-exploration"]);
        return sendJson(response, 200, { status: "closed" });
      }
    }
    if (url.pathname.startsWith("/api/") && !/^\/api\/(google-oauth|health|status|credentials|youtube\/thumbnail\/)/.test(url.pathname) && !explorations.context.getStore()) {
      const token = request.headers["x-scout-exploration"];
      if (!token) return sendJson(response, 428, { message: "Ouvrez une fouille éphémère (rechargez Scout)." });
      return explorations.context.run(explorations.get(token), () => handleRequest(request, response));
    }
    if (request.method === "GET" && url.pathname === "/api/personal/graph") return sendJson(response, 200, personalGraph(personalStore.snapshot()));
    if (url.pathname.startsWith("/api/google-oauth/")) {
      googleOAuth.assertRequest(request);
      const action = url.pathname.slice("/api/google-oauth/".length);
      if (request.method === "GET" && action === "status") return sendJson(response, 200, googleOAuth.status());
      if (request.method !== "POST") return sendJson(response, 405, { message: "Méthode non autorisée." });
      const body = await readJsonBody(request, 1024);
      try {
        if (action === "start") {
          const started = googleOAuth.start();
          response.setHeader("set-cookie", started.cookie);
          return sendJson(response, 200, { authorizationUrl: started.authorizationUrl });
        }
        if (action === "token") return sendJson(response, 200, await googleOAuth.token({ force: body.force === true }));
        if (action === "disconnect") return sendJson(response, 200, await googleOAuth.disconnect());
      } catch (error) {
        return sendJson(response, error.httpStatus || 503, { code: error.code || "unavailable",
          message: "Accès Google indisponible. Réessayez ou reconnectez YouTube ; votre bibliothèque est conservée." });
      }
      return sendJson(response, 404, { message: "Action Google inconnue." });
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      return sendJson(response, 200, {
        app: "youtube-scout",
        version: APP_VERSION,
        dataSchemaVersion: 1,
        explorationMemory: "ephemeral_per_departure",
        lenses: LENSES,
        roles: PROGRAM_ROLES,
        oauthScope: "https://www.googleapis.com/auth/youtube.readonly",
        discogsConfigured: Boolean(discogsToken),
        discogsCredentialSource,
        sources: runtime.status(),
        capabilities: {
          youtube: true,
          musicbrainz: true,
          wikidata: true,
          listenbrainz: true,
          discogs: Boolean(discogsToken),
          applemusic: Boolean(APPLE_MUSIC_TOKEN),
          spotify: Boolean(SPOTIFY_TOKEN),
          soundcloud: Boolean(SOUNDCLOUD_TOKEN),
          bandcamp: "supplied_metadata_import"
        },
        graph: store.stats()
      });
    }
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { status: "ok", version: APP_VERSION, explorationMemory: "ephemeral_per_departure", sources: runtime.status(), graph: store.stats() });
    }
    const thumbnailMatch = request.method === "GET" && url.pathname.match(/^\/api\/youtube\/thumbnail\/([A-Za-z0-9_-]{6,20})$/);
    if (thumbnailMatch) return serveYoutubeThumbnail(response, thumbnailMatch[1]);
    if (request.method === "POST" && url.pathname === "/api/settings/discogs") {
      assertLocalSettingsRequest(request);
      if (DISCOGS_ENV_TOKEN) return sendJson(response, 409, { message: "Discogs est configuré par variable d’environnement. Retirez-la avant d’utiliser le coffre local." });
      const body = await readJsonBody(request, 2_000);
      let candidate;
      try { candidate = normalizeSecret(body.token); }
      catch (error) { error.httpStatus = 400; throw error; }
      const identity = await verifyDiscogsToken(candidate);
      await discogsSecret.save(candidate);
      discogsToken = candidate;
      discogsCredentialSource = "local_file";
      runtime.setConfigured("discogs", true);
      clearDiscogsMemoryCaches();
      return sendJson(response, 201, { status: "saved", configured: true, credentialSource: discogsCredentialSource, account: identity });
    }
    if (request.method === "DELETE" && url.pathname === "/api/settings/discogs") {
      assertLocalSettingsRequest(request);
      if (DISCOGS_ENV_TOKEN) return sendJson(response, 409, { message: "Le jeton actif vient de l’environnement et ne peut pas être supprimé depuis le navigateur." });
      await discogsSecret.remove();
      discogsToken = "";
      discogsCredentialSource = "none";
      runtime.setConfigured("discogs", false);
      clearDiscogsMemoryCaches();
      return sendJson(response, 200, { status: "removed", configured: false, credentialSource: discogsCredentialSource });
    }
    if (request.method === "GET" && url.pathname === "/api/music/artist-choices") {
      const name = (url.searchParams.get("name") || "").trim();
      const reference = catalogueArtistReference(url.searchParams.get("reference") || "");
      if (url.searchParams.has("reference") && !reference) return sendJson(response, 400, { message: "Utilisez une fiche artiste HTTPS Discogs ou MusicBrainz." });
      if (!reference && (!name || name.length > 300)) return sendJson(response, 400, { message: "Nom d’artiste invalide." });
      const sources = reference ? [reference.source] : ["musicbrainz", "discogs"];
      const entities = [], sourceStates = {};
      await Promise.all(sources.map(async source => {
        if (source === "discogs" && !discogsToken) { sourceStates[source] = "not_configured"; return; }
        try {
          const data = await withDeadline(reference
            ? source === "discogs" ? discogs(`/artists/${reference.id}`) : musicBrainz(`artist/${reference.id}`, { inc: "aliases" }, 1)
            : source === "discogs" ? discogs("/database/search", { q: name, type: "artist", per_page: 50 }) : musicBrainz("artist", { query: artistQuery(name), limit: 50 }, 1), 12000, source);
          const records = reference ? [data] : source === "discogs" ? data.results || [] : data.artists || [];
          for (const artist of records) {
            if (!artist.id || (source === "discogs" && !reference && artist.type !== "artist")) continue;
            entities.push({ id: `artist:${source}:${artist.id}`, type: "artist", name: artist.name || artist.title, externalIds: { [source]: String(artist.id) }, aliases: artist.aliases || artist.namevariations || [], country: artist.country, disambiguation: artist.disambiguation || String(artist.profile || "").slice(0, 250), typeDetail: source === "musicbrainz" ? artist.type : "" });
          }
          sourceStates[source] = "ok";
        } catch { sourceStates[source] = "unavailable"; }
      }));
      const candidates = catalogueArtistChoices({ entities }, reference ? entities[0]?.name || "" : name);
      // Search is deliberately read-only: candidates become graph nodes only
      // after the user confirms one for this departure.
      return sendJson(response, 200, { candidates, sourceStates });
    }
    if (request.method === "GET" && url.pathname === "/api/music/artist") {
      const name = (url.searchParams.get("name") || "").trim();
      if (!name || name.length > 120) return sendJson(response, 400, { message: "Nom d’artiste invalide." });
      const result = await findArtist(name);
      if (!result) return sendJson(response, 404, { message: "Aucun artiste suffisamment fiable n’a été trouvé." });
      return sendJson(response, 200, result);
    }
    if (request.method === "GET" && url.pathname === "/api/music/labels") {
      const releaseGroupId = (url.searchParams.get("releaseGroup") || "").trim();
      if (!/^[A-Za-z0-9-]{4,60}$/.test(releaseGroupId)) return sendJson(response, 400, { message: "Identifiant de sortie invalide." });
      return sendJson(response, 200, { releaseGroupId, labels: await labelsForReleaseGroup(releaseGroupId) });
    }
    if (request.method === "GET" && url.pathname === "/api/music/context") {
      const name = (url.searchParams.get("name") || "").trim();
      if (!name || name.length > 120) return sendJson(response, 400, { message: "Nom d’artiste invalide." });
      const result = await findWikidataContext(name);
      if (!result) return sendJson(response, 404, { message: "Aucune fiche Wikidata suffisamment fiable n’a été trouvée." });
      return sendJson(response, 200, result);
    }
    if (request.method === "GET" && url.pathname === "/api/music/identity") {
      const name = (url.searchParams.get("name") || "").trim();
      const discogsId = (url.searchParams.get("discogsId") || "").trim();
      if (!name || name.length > 120) return sendJson(response, 400, { message: "Nom d’artiste invalide." });
      if (discogsId && !/^\d{1,12}$/.test(discogsId)) return sendJson(response, 400, { message: "Identifiant Discogs invalide." });
      return sendJson(response, 200, await resolveArtistIdentity(name, discogsId));
    }
    if (request.method === "GET" && url.pathname === "/api/music/recording") {
      const title = (url.searchParams.get("title") || "").trim();
      const artist = (url.searchParams.get("artist") || "").trim();
      const duration = Number(url.searchParams.get("duration") || 0);
      const metadata = { channelTitle: url.searchParams.get("channelTitle") || "", description: url.searchParams.get("description") || "" };
      const bandcamp = safeBandcampEvidence(url.searchParams.get("bandcamp") || "", "user_confirmed");
      if (!title || title.length > 300 || artist.length > 120) return sendJson(response, 400, { message: "Titre ou artiste invalide." });
      if (metadata.channelTitle.length > 300 || metadata.description.length > 5000) return sendJson(response, 400, { message: "Métadonnées trop longues." });
      return sendJson(response, 200, await resolveRecording(title, artist, duration, bandcamp, metadata));
    }
    if (request.method === "GET" && url.pathname === "/api/music/discover") {
      const recordingMbid = (url.searchParams.get("recording") || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(recordingMbid)) return sendJson(response, 400, { message: "MBID d’enregistrement invalide." });
      return sendJson(response, 200, await listenBrainzSimilar(recordingMbid));
    }
    if (request.method === "GET" && url.pathname === "/api/music/branch") {
      const seedId = (url.searchParams.get("seedId") || "").trim();
      if (!seedId || seedId.length > 240) return sendJson(response, 400, { message: "Point de départ invalide." });
      let cursor = url.searchParams.get("cursor") || "";
      if (cursor.startsWith("branch.")) {
        const saved = store.cacheGet("catalogue_cursor", cursor);
        if (!saved) return sendJson(response, 410, { message: "Ce curseur de catalogue a expiré. Relancez cette direction depuis son départ." });
        cursor = saved.value;
      }
      const graph = sanitizeExplorationGraph(store.snapshot());
      let viewScope;
      if (url.searchParams.has("viewScope")) {
        try {
          const encoded = url.searchParams.get("viewScope");
          if (encoded.length > 8000) throw new Error();
          viewScope = JSON.parse(encoded);
          if (!viewScope || typeof viewScope !== "object" || Array.isArray(viewScope)) throw new Error();
          for (const key of ["otherArtistsOnly", "includeDistant"]) if (typeof viewScope[key] !== "boolean") throw new Error();
          for (const key of ["excludeLibraryVideos", "includeUnknownArtists", "includeCollaborations"]) if (Object.hasOwn(viewScope, key) && typeof viewScope[key] !== "boolean") throw new Error();
          if (typeof viewScope.seedArtist !== "string" || viewScope.seedArtist.length > 500) throw new Error();
          for (const key of ["seedArtistIds", "excludeIds", "directLinkedIds"]) {
            if (!Array.isArray(viewScope[key]) || viewScope[key].length > 100 || viewScope[key].some(id => typeof id !== "string" || id.length > 240)) throw new Error();
          }
        } catch { return sendJson(response, 400, { message: "Périmètre d’affichage invalide." }); }
      }
      const result = await exploreCatalogueBranch({
        graph, seedId, direction: url.searchParams.get("direction") || "label",
        ...(viewScope ? { candidateEligible: createCatalogueEligibility({ ...viewScope, graph, seedId }), minimumEligible: 6 } : {}),
        cursor, limit: Number(url.searchParams.get("limit") || 12),
        configured: { discogs: Boolean(discogsToken) },
        readCached: (source, resource, parameters = {}) => {
          const cachedUrl = new URL(source === "discogs" ? `${DISCOGS_ROOT}${resource}` : `${MUSICBRAINZ_ROOT}/${resource}`);
          for (const [key, value] of Object.entries(parameters)) cachedUrl.searchParams.set(key, String(value));
          if (source === "musicbrainz") cachedUrl.searchParams.set("fmt", "json");
          const key = source === "discogs" ? `${resource}?${cachedUrl.searchParams}` : String(cachedUrl);
          return runtime.cached(source, cachedUrl, key)?.value ?? null;
        },
        request: (source, resource, parameters) => source === "discogs" ? discogs(resource, parameters) : musicBrainz(resource, parameters)
      });
      if (result.graphDelta.entities.length || result.graphDelta.edges.length) result.graph = await store.ingestGraph(result.graphDelta);
      if (result.coverage.nextCursor) {
        const token = `branch.${randomUUID()}`;
        await store.cacheSet("catalogue_cursor", token, result.coverage.nextCursor, 30 * 24 * 60 * 60 * 1000);
        result.coverage.nextCursor = token;
      }
      return sendJson(response, 200, result);
    }
    if (request.method === "POST" && url.pathname === "/api/music/bandcamp/import") {
      const body = await readJsonBody(request, 2_000_000);
      let graphDelta;
      try {
        if (body.artistEntityId && store.state.entities[body.artistEntityId]?.type !== "artist") throw new Error("L’artiste à relier doit exister dans le graphe.");
        graphDelta = bandcampEvidenceGraph(body);
      } catch (error) { return sendJson(response, 400, { message: error.message }); }
      const graph = await store.ingestGraph(graphDelta);
      return sendJson(response, 201, { status: "imported", imported: { entities: graphDelta.entities.length, tracks: graphDelta.entities.filter(({ type }) => type === "track").length }, graphDelta, graph, message: "Données Bandcamp importées avec la provenance « fournies par vous »." });
    }
    if (request.method === "GET" && url.pathname === "/api/music/discogs/artist") {
      const artistId = (url.searchParams.get("id") || "").trim();
      if (!/^\d{1,12}$/.test(artistId)) return sendJson(response, 400, { message: "Identifiant Discogs invalide." });
      return sendJson(response, 200, await discogsArtistProfile(artistId));
    }
    if (request.method === "GET" && url.pathname === "/api/music/discogs/release") {
      const releaseId = (url.searchParams.get("id") || "").trim();
      if (!/^\d{1,12}$/.test(releaseId)) return sendJson(response, 400, { message: "Identifiant Discogs invalide." });
      return sendJson(response, 200, await discogsReleaseProfile(releaseId));
    }
    if (request.method === "GET" && url.pathname === "/api/platform/apple") {
      const isrc = (url.searchParams.get("isrc") || "").trim().toUpperCase();
      const storefront = (url.searchParams.get("storefront") || "fr").trim().toLowerCase();
      if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc) || !/^[a-z]{2}$/.test(storefront)) return sendJson(response, 400, { message: "ISRC ou storefront invalide." });
      return sendJson(response, 200, await appleMusicByIsrc(isrc, storefront));
    }
    if (request.method === "GET" && url.pathname === "/api/platform/spotify") {
      const isrc = (url.searchParams.get("isrc") || "").trim().toUpperCase();
      const market = (url.searchParams.get("market") || "FR").trim().toUpperCase();
      if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc) || !/^[A-Z]{2}$/.test(market)) return sendJson(response, 400, { message: "ISRC ou territoire invalide." });
      return sendJson(response, 200, await spotifyByIsrc(isrc, market));
    }
    if (request.method === "GET" && url.pathname === "/api/platform/availability") {
      const isrc = (url.searchParams.get("isrc") || "").trim().toUpperCase();
      const territory = (url.searchParams.get("territory") || "FR").trim().toUpperCase();
      const videoId = (url.searchParams.get("video") || "").trim();
      if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc) || !/^[A-Z]{2}$/.test(territory) || (videoId && !/^[A-Za-z0-9_-]{6,20}$/.test(videoId))) return sendJson(response, 400, { message: "ISRC, territoire ou vidéo invalide." });
      return sendJson(response, 200, await platformAvailability(isrc, territory, videoId));
    }
    if (request.method === "GET" && url.pathname === "/api/graph") {
      return sendJson(response, 200, store.snapshot());
    }
    if (request.method === "GET" && url.pathname === "/api/graph/summary") {
      return sendJson(response, 200, summarizeGraph(store.snapshot()));
    }
    if (request.method === "POST" && url.pathname === "/api/graph/ingest") {
      const body = await readJsonBody(request, 5_000_000);
      return sendJson(response, 200, { status: "saved", graph: await store.ingestGraph(body) });
    }
    if (request.method === "POST" && url.pathname === "/api/departure/correction") {
      const body = await readJsonBody(request, 64_000);
      const snapshot = store.snapshot();
      const id = String(body.seedId || "");
      if (!/^video:youtube:[A-Za-z0-9_-]{6,20}$/.test(id)) return sendJson(response, 400, { message: "Départ vidéo invalide." });
      if (departureRevision(personalStore.state.entities[id]) !== String(body.expectedRevision || "")) return sendJson(response, 409, { message: "Une autre correction a été enregistrée. Rouvrez ce départ." });
      // A newly selected library video may not have entered the graph yet.
      snapshot.entities[id] ||= { id, type: "video", title: String(body.originalTitle || body.title || "").slice(0, 300) };
      const revision = randomUUID();
      const delta = correctionDelta(snapshot, { id }, { title: body.title, artist: body.artist, revision });
      await store.saveDepartureCorrection(delta);
      return sendJson(response, 200, { status: "saved", revision });
    }
    if (request.method === "POST" && url.pathname === "/api/resolution") {
      const body = await readJsonBody(request);
      if (!body.video?.id) return sendJson(response, 400, { message: "Vidéo manquante." });
      return sendJson(response, 200, { status: "saved", graph: await persistResolution(body.video, body.identity || null, body.recording || null, body.context || {}) });
    }
    if (request.method === "POST" && url.pathname === "/api/events") {
      const body = await readJsonBody(request, 64_000);
      if (!body.targetId || String(body.targetId).length > 240) return sendJson(response, 400, { message: "Cible invalide." });
      return sendJson(response, 201, { status: "saved", event: await store.addEvent(body) });
    }
    if (request.method === "POST" && url.pathname === "/api/sync") {
      const body = await readJsonBody(request, 128_000);
      if (!body.scope || String(body.scope).length > 120) return sendJson(response, 400, { message: "Périmètre de synchronisation invalide." });
      return sendJson(response, 200, { status: "saved", sync: await store.setSync(body.scope, body.state || {}) });
    }
    if (request.method === "GET" && url.pathname === "/api/exploration/session") {
      return sendJson(response, 200, { session: store.getSync("digging-front") });
    }
    if (request.method === "PUT" && url.pathname === "/api/exploration/session") {
      const body = await readJsonBody(request, 8_000_000);
      const session = body.session;
      const front = session?.front || session;
      if (!session || ![1, 2].includes(session.schemaVersion) || !front?.seed?.id || (session.schemaVersion === 2 && session.seed?.id !== front.seed.id) || !Array.isArray(front.branches) || front.branches.length > 12) {
        return sendJson(response, 400, { message: "Front de fouille invalide." });
      }
      return sendJson(response, 200, { status: "saved", session: await store.setSync("digging-front", session) });
    }
    if (request.method === "DELETE" && url.pathname === "/api/exploration/session") {
      return sendJson(response, 200, { status: "removed", removed: await store.deleteSync("digging-front") });
    }
    if (request.method === "GET") return serveStatic(request, response);
    return sendJson(response, 405, { message: "Méthode non autorisée." });
  } catch (error) {
    return sendJson(response, Number(error.httpStatus || 502), { message: error.message || "Le service musical ne répond pas." });
  }
}
const server = http.createServer(handleRequest);

server.listen(PORT, "127.0.0.1", () => {
  console.log(`YouTube Scout : http://localhost:${PORT}`);
});
